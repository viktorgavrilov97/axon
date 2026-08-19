/**
 * Withdrawal Payout Service
 * Handles automatic payout processing through payment providers (OxaPay)
 */

import { db } from "@/shared/lib/db";
import { Prisma, WithdrawalStatus, WithdrawalProvider, WithdrawalProviderStatus, TransactionType } from "@prisma/client";
import { getWithdrawalProviderClient } from "./payment-providers";
import type { NetworkType } from "./network-types";
import { validateWithdrawalAddress } from "./address-validation";
import { debitWallet } from "@/shared/lib/wallet/ledger";

const TRANSIENT_ERROR_PATTERNS = [
  "timeout",
  "timed out",
  "network",
  "fetch failed",
  "econnreset",
  "enotfound",
  "service unavailable",
  "bad gateway",
  "gateway timeout",
  "temporarily unavailable",
  "rate limit",
  "429",
  "502",
  "503",
  "504",
];

function isTransientProviderError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return TRANSIENT_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

async function withRetry<T>(
  opName: string,
  fn: () => Promise<T>,
  options: { attempts?: number; baseDelayMs?: number } = {}
): Promise<T> {
  const attempts = options.attempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 700;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const retryable = isTransientProviderError(error);
      const isLast = attempt === attempts;
      console.error(`[Payout][${opName}] attempt ${attempt}/${attempts} failed`, error);
      if (!retryable || isLast) break;
      const backoff = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`${opName} failed`);
}

function inferNetworkFromWithdrawalCurrency(currency: string): NetworkType {
  switch (currency) {
    case "USDT_TRC20":
      return "TRC20";
    case "USDT_ERC20":
      return "ERC20";
    case "USDT_BEP20":
      return "BEP20";
    case "USDT_POLYGON":
      return "MATIC";
    default:
      throw new Error(
        `Unsupported withdrawal currency for automatic payout: ${currency}. ` +
          `Supported: USDT_TRC20, USDT_ERC20, USDT_BEP20, USDT_POLYGON.`
      );
  }
}

/**
 * Trigger automatic payout for approved withdrawal
 * Idempotent: if providerPayoutId already exists, returns current state without making new request
 * 
 * @param withdrawalId - ID of the withdrawal
 * @param adminUserId - ID of admin user triggering the payout (for logging)
 * @throws {Error} if withdrawal not found, invalid state, or payout creation fails
 */
export async function triggerWithdrawalPayout(
  withdrawalId: string,
  adminUserId: string
): Promise<{ success: boolean; payoutId?: string; error?: string }> {
  // 1. Find withdrawal
  const withdrawal = await db.withdrawal.findUnique({
    where: { id: withdrawalId },
    include: { wallet: true },
  });

  if (!withdrawal) {
    throw new Error(`Withdrawal not found: ${withdrawalId}`);
  }

  // 2. Check prerequisites
  if (withdrawal.status !== WithdrawalStatus.APPROVED) {
    throw new Error(
      `Cannot trigger payout for withdrawal ${withdrawalId}: status is ${withdrawal.status}, expected APPROVED`
    );
  }

  // 2. Check if provider supports automatic payout
  if (withdrawal.provider === WithdrawalProvider.INTERNAL) {
    // For INTERNAL provider, payout is handled manually
    return { success: false, error: "Payout provider is INTERNAL, manual processing required" };
  }

  // 3. Idempotency check: if providerPayoutId already exists, return current state
  if (withdrawal.providerPayoutId) {
    console.log(
      `[Payout] Withdrawal ${withdrawalId} already has payout ID: ${withdrawal.providerPayoutId}, skipping`
    );
    return {
      success: true,
      payoutId: withdrawal.providerPayoutId,
    };
  }

  // 3.1 Reserve withdrawal for payout creation (race protection)
  const reserve = await db.withdrawal.updateMany({
    where: {
      id: withdrawalId,
      status: WithdrawalStatus.APPROVED,
      providerPayoutId: null,
    },
    data: {
      status: WithdrawalStatus.PROCESSING,
      providerStatus: WithdrawalProviderStatus.PENDING,
    },
  });
  if (reserve.count === 0) {
    const latest = await db.withdrawal.findUnique({ where: { id: withdrawalId } });
    if (latest?.providerPayoutId) {
      return { success: true, payoutId: latest.providerPayoutId };
    }
    return {
      success: false,
      error: `Withdrawal ${withdrawalId} is already being processed by another worker/admin`,
    };
  }

  // 4. Verify wallet has sufficient balance (safety check)
  // Note: Balance is not deducted here, only when payout is COMPLETED
  if (withdrawal.wallet.balanceUsdt.toNumber() < withdrawal.amount.toNumber()) {
    throw new Error(
      `Insufficient balance for withdrawal ${withdrawalId}: ` +
      `wallet has ${withdrawal.wallet.balanceUsdt.toString()}, ` +
      `withdrawal requires ${withdrawal.amount.toString()}`
    );
  }

  try {
    // 5. Get provider client based on withdrawal provider
    const providerClient = getWithdrawalProviderClient(withdrawal.provider);

    // 6. Infer network from withdrawal currency and validate destination address
    const network = inferNetworkFromWithdrawalCurrency(withdrawal.currency);
    const addressValidation = validateWithdrawalAddress(withdrawal.toAddress, network);
    if (!addressValidation.ok) {
      throw new Error(
        addressValidation.error ||
          `Invalid destination address for ${network}: ${withdrawal.toAddress}`
      );
    }

    // 7. Create payout request via provider
    const payoutResponse = await withRetry("createPayout", () =>
      providerClient.createPayout({
        withdrawalId: withdrawal.id,
        walletId: withdrawal.walletId,
        amountUsdt: withdrawal.amount.toString(),
        currency: "USDT",
        network,
        toAddress: withdrawal.toAddress,
      })
    );

    // 8. Map provider status to WithdrawalProviderStatus
    let providerStatus: WithdrawalProviderStatus;
    switch (payoutResponse.status) {
      case 'PENDING':
        providerStatus = WithdrawalProviderStatus.PENDING;
        break;
      case 'PROCESSING':
        providerStatus = WithdrawalProviderStatus.PROCESSING;
        break;
      case 'CONFIRMED':
        providerStatus = WithdrawalProviderStatus.COMPLETED;
        break;
      case 'FAILED':
        providerStatus = WithdrawalProviderStatus.FAILED;
        break;
      default:
        providerStatus = WithdrawalProviderStatus.PENDING;
    }

    // 9. Update withdrawal with payout information
    const updatedWithdrawal = await db.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        providerPayoutId: payoutResponse.providerPayoutId,
        providerStatus,
        status: WithdrawalStatus.PROCESSING, // payout initiated
        providerErrorMessage: null,
      },
    });

    console.log(
      `✅ [Payout] Created payout for withdrawal ${withdrawalId}: ` +
      `payoutId=${payoutResponse.providerPayoutId}, status=${payoutResponse.status}`
    );

    return {
      success: true,
      payoutId: payoutResponse.providerPayoutId,
    };
  } catch (error) {
    console.error(`[Payout] Failed to create payout for withdrawal ${withdrawalId}:`, error);

    // Update withdrawal with error status
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const transient = isTransientProviderError(error);
    await db.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: WithdrawalStatus.APPROVED, // fail-safe: keep request re-triable
        providerStatus: transient ? WithdrawalProviderStatus.PENDING : WithdrawalProviderStatus.FAILED,
        providerErrorMessage: transient
          ? `[RETRYABLE] ${errorMessage}. Will retry via cron/admin sync.`
          : errorMessage,
      },
    });

    return {
      success: false,
      error: transient
        ? `Payout provider temporarily unavailable. Withdrawal kept in APPROVED state for retry. Details: ${errorMessage}`
        : errorMessage,
    };
  }
}

/**
 * Sync withdrawal payout status from provider
 * Updates withdrawal status and deducts balance when payout is completed
 * Idempotent: won't deduct balance twice if already COMPLETED
 * 
 * @param withdrawalId - ID of the withdrawal
 * @throws {Error} if withdrawal not found or sync fails
 */
export async function syncWithdrawalPayoutStatus(
  withdrawalId: string
): Promise<{ success: boolean; status: string; balanceDeducted: boolean }> {
  // 1. Find withdrawal
  const withdrawal = await db.withdrawal.findUnique({
    where: { id: withdrawalId },
    include: { wallet: true },
  });

  if (!withdrawal) {
    throw new Error(`Withdrawal not found: ${withdrawalId}`);
  }

  // 2. Check if payout was initiated
  if (!withdrawal.providerPayoutId) {
    throw new Error(
      `Cannot sync payout status for withdrawal ${withdrawalId}: providerPayoutId is not set`
    );
  }

  // 2. Check if provider supports automatic payout
  if (withdrawal.provider === WithdrawalProvider.INTERNAL) {
    throw new Error(
      `Cannot sync payout status for withdrawal ${withdrawalId}: provider is INTERNAL, manual processing required`
    );
  }

  try {
    // 3. Get provider client based on withdrawal provider
    const providerClient = getWithdrawalProviderClient(withdrawal.provider);

    // 4. Get payout status from provider
    const payoutStatus = await withRetry("syncPayoutStatus", () =>
      providerClient.syncPayoutStatus(withdrawal.providerPayoutId!)
    );

    // 5. Map provider status to WithdrawalProviderStatus
    // Use the mapping function from provider client
    let providerStatus: WithdrawalProviderStatus;
    const normalizedStatus = payoutStatus.status.toUpperCase();
    
    switch (normalizedStatus) {
      case 'PENDING':
        providerStatus = WithdrawalProviderStatus.PENDING;
        break;
      case 'PROCESSING':
        providerStatus = WithdrawalProviderStatus.PROCESSING;
        break;
      case 'CONFIRMED':
      case 'COMPLETED':
      case 'FINISHED':
      case 'PAID':
        providerStatus = WithdrawalProviderStatus.COMPLETED;
        break;
      case 'FAILED':
      case 'REJECTED':
      case 'EXPIRED':
        providerStatus = WithdrawalProviderStatus.FAILED;
        break;
      default:
        console.warn(`[Payout] Unknown provider status: ${payoutStatus.status}, defaulting to PENDING`);
        providerStatus = WithdrawalProviderStatus.PENDING;
    }

    // 6. Check if payout is completed
    const wasCompleted = withdrawal.status === WithdrawalStatus.COMPLETED;
    const isNowCompleted = providerStatus === WithdrawalProviderStatus.COMPLETED;
    const shouldDeductBalance = !wasCompleted && isNowCompleted;

    // Use transaction to ensure atomicity
    const result = await db.$transaction(async (tx) => {
      // Update provider status
      const updateData: {
        providerStatus: WithdrawalProviderStatus;
        providerErrorMessage?: string;
        status?: WithdrawalStatus;
        txHash?: string;
        processedAt?: Date;
      } = {
        providerStatus,
      };

      if (payoutStatus.errorMessage) {
        updateData.providerErrorMessage = payoutStatus.errorMessage;
      }

      if (payoutStatus.txHash) {
        updateData.txHash = payoutStatus.txHash;
      }

      // Handle completed status
      if (isNowCompleted) {
        updateData.status = WithdrawalStatus.COMPLETED;
        updateData.processedAt = new Date();

        // Deduct balance only if not already completed
        if (shouldDeductBalance) {
          // Double-check balance (race condition protection)
          const currentWallet = await tx.wallet.findUnique({
            where: { id: withdrawal.walletId },
          });

          if (!currentWallet) {
            throw new Error(`Wallet not found: ${withdrawal.walletId}`);
          }

          await debitWallet(tx, {
            walletId: withdrawal.walletId,
            amount: withdrawal.amount,
            currency: withdrawal.currency,
            type: TransactionType.WITHDRAWAL,
            meta: {
              withdrawalId: withdrawal.id,
              payoutId: withdrawal.providerPayoutId,
              txHash: payoutStatus.txHash,
            },
          });

          console.log(
            `✅ [Payout] Balance deducted for withdrawal ${withdrawalId}: ` +
            `-${withdrawal.amount.toString()} USDT, payoutId=${withdrawal.providerPayoutId}`
          );
        }
      } else if (providerStatus === WithdrawalProviderStatus.FAILED) {
        // Handle failed status
        updateData.status = WithdrawalStatus.REJECTED;
        updateData.processedAt = new Date();
        // Balance is not deducted for failed payouts
      }

      // Update withdrawal
      const updatedWithdrawal = await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: updateData,
      });

      return {
        status: updatedWithdrawal.status,
        balanceDeducted: shouldDeductBalance,
      };
    });

    return {
      success: true,
      status: result.status,
      balanceDeducted: result.balanceDeducted,
    };
  } catch (error) {
    console.error(`[Payout] Failed to sync payout status for withdrawal ${withdrawalId}:`, error);

    // Update error status if possible
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const transient = isTransientProviderError(error);
    await db.withdrawal.update({
      where: { id: withdrawalId },
      data: transient
        ? {
            providerStatus: WithdrawalProviderStatus.PROCESSING,
            providerErrorMessage: `[RETRYABLE] ${errorMessage}`,
          }
        : {
            providerStatus: WithdrawalProviderStatus.FAILED,
            providerErrorMessage: errorMessage,
          },
    }).catch((updateError) => {
      console.error(`[Payout] Failed to update error status:`, updateError);
    });

    throw new Error(
      transient
        ? `Transient payout sync error for ${withdrawalId}: ${errorMessage}`
        : errorMessage
    );
  }
}

/**
 * Map OxaPay payout status to WithdrawalProviderStatus
 */
function mapOxaPayStatusToProviderStatus(
  status: string
): WithdrawalProviderStatus {
  switch (status.toLowerCase()) {
    case "pending":
    case "creating":
      return WithdrawalProviderStatus.PENDING;
    case "processing":
    case "confirming":
      return WithdrawalProviderStatus.PROCESSING;
    case "finished":
    case "completed":
    case "paid":
      return WithdrawalProviderStatus.COMPLETED;
    case "failed":
    case "expired":
      return WithdrawalProviderStatus.FAILED;
    default:
      console.warn(`[Payout] Unknown OxaPay status: ${status}, defaulting to PENDING`);
      return WithdrawalProviderStatus.PENDING;
  }
}

