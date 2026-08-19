import { db } from "@/shared/lib/db";
import { Prisma, WithdrawalProvider, DepositProvider, TransactionType } from "@prisma/client";

// OxaPay statuses
type OxaPayDepositStatus = "paying" | "paid" | "expired" | "failed" | "cancelled";
import { validateWithdrawalAddress } from "./address-validation";
import { emitRealtimeEvent } from "@/shared/lib/realtime-events";
import { creditWallet } from "@/shared/lib/wallet/ledger";
import { DEFAULT_DEPOSIT_PROVIDER, DEFAULT_WITHDRAWAL_PROVIDER } from "./wallet-config";
import { getDepositProviderClient, getWithdrawalProviderClient } from "./payment-providers";
import type { NetworkType } from "./network-types";
import { NETWORKS } from "./network-types";
import { getRequiredConfirmations } from "./confirmation-utils";

export const MIN_DEPOSIT_USDT = 1;

/**
 * Get or create wallet for user
 */
export async function getOrCreateWallet(userId: string) {
  let wallet = await db.wallet.findUnique({
    where: { userId },
  });

  if (!wallet) {
    wallet = await db.wallet.create({
      data: {
        userId,
        balanceUsdt: new Prisma.Decimal(0),
      },
    });
  }

  return wallet;
}

/**
 * Create a deposit request
 * Only accepts whole USDT amounts
 */
export async function createDeposit(
  userId: string,
  amountUsdt: number,
  network: NetworkType | string = "TRC20",
  currency: string = "USDT",
  fromAmount?: number
): Promise<{ deposit: any; payAddress: string; payAmount: number; qrCode?: string; network?: string }> {
  // Validate: only whole numbers for USDT
  if (currency === "USDT" && !Number.isInteger(amountUsdt)) {
    throw new Error("Amount must be a whole number");
  }

  if (amountUsdt < MIN_DEPOSIT_USDT) {
    throw new Error(`Minimum deposit is ${MIN_DEPOSIT_USDT} USDT`);
  }

  const wallet = await getOrCreateWallet(userId);

  // Generate order ID
  const orderId = `deposit_${userId}_${Date.now()}`;

  // Get provider client based on configuration
  const provider = DEFAULT_DEPOSIT_PROVIDER;
  const providerClient = getDepositProviderClient(provider);

  // Create invoice via provider (network is passed as parameter)
  console.log("[WalletService] Creating deposit invoice:", {
    userId,
    amountUsdt,
    currency,
    fromAmount,
    network,
    orderId,
  });
  
  const invoice = await providerClient.createInvoice({
    userId,
    amountUsdt: amountUsdt.toString(),
    currency: currency,
    network,
    orderId,
    fromAmount: fromAmount,
  });
  
  console.log("[WalletService] Invoice created:", {
    providerInvoiceId: invoice.providerInvoiceId,
    payAddress: invoice.payAddress,
    network: invoice.network,
    qrCode: invoice.qrCode ? "provided" : "not provided",
  });

  // Validate invoice response
  if (!invoice.providerInvoiceId) {
    throw new Error(`${provider} did not return invoice ID`);
  }

  if (!invoice.payAddress) {
    throw new Error(`${provider} did not return payment address`);
  }

  // Calculate amountCrypto (amount in source currency, e.g., DOGE)
  // For non-USDT currencies, use fromAmount if provided
  // Note: invoice doesn't return payAmount, so we use fromAmount directly
  const amountCrypto = currency !== "USDT" && fromAmount 
    ? new Prisma.Decimal(fromAmount)
    : null;

  // Create deposit record
  const deposit = await db.deposit.create({
    data: {
      userId,
      walletId: wallet.id,
      provider: provider as DepositProvider,
      providerPaymentId: invoice.providerInvoiceId,
      amountUsdt: new Prisma.Decimal(amountUsdt),
      amountCrypto: amountCrypto, // Amount in source currency (DOGE, BTC, etc.)
      payCurrency: invoice.payCurrency,
      payAddress: invoice.payAddress,
      status: "paying", // OxaPay status: paying (initial status)
      expiresAt: invoice.expiresAt,
    },
  });

  // Audit log for deposit creation
  try {
    const { createAuditLog } = await import("@/shared/lib/audit-log");
    await createAuditLog({
      action: "DEPOSIT_CREATED",
      entityType: "DEPOSIT",
      entityId: deposit.id,
      metadata: {
        amount: amountUsdt,
        network,
        provider: provider,
        providerPaymentId: invoice.providerInvoiceId,
      },
      userId,
    });
  } catch (error) {
    console.error("[AuditLog] Failed to log deposit creation:", error);
  }

  // Emit realtime events for new deposit
  // This triggers SSE updates so UI shows the new deposit immediately
  await Promise.all([
    emitRealtimeEvent({
      type: "deposit_status_updated",
      userId: userId,
      depositId: deposit.id,
      status: deposit.status,
      timestamp: new Date().toISOString(),
    }),
    emitRealtimeEvent({
      type: "wallet_balance_updated",
      userId: userId,
      walletId: wallet.id,
      balance: wallet.balanceUsdt.toString(),
      timestamp: new Date().toISOString(),
    }),
  ]);

  // Return payAmount in source currency (for display), not USDT
  const payAmount = amountCrypto ? amountCrypto.toNumber() : amountUsdt;

  return {
    deposit,
    payAddress: invoice.payAddress,
    payAmount: payAmount, // Amount in source currency (DOGE, BTC, etc.) or USDT
    qrCode: invoice.qrCode,
    network: invoice.network,
  };
}

/**
 * Sync deposit status from OxaPay provider
 * Key function: only credits balance when status becomes "paid" for the first time
 */
export async function syncDepositStatusFromProvider(
  depositId: string
): Promise<{ deposit: any; balanceCredited: boolean }> {
  const deposit = await db.deposit.findUnique({
    where: { id: depositId },
    include: { 
      wallet: true,
      user: {
        select: { id: true },
      },
    },
  });

  if (!deposit) {
    throw new Error(`Deposit not found: ${depositId}`);
  }

  if (!deposit.providerPaymentId) {
    throw new Error(`Deposit has no providerPaymentId: ${depositId}`);
  }

  // Get provider client (only OXAPAY is supported)
  const providerClient = getDepositProviderClient('OXAPAY');

  // Sync status from provider - get OxaPay status directly
  const statusResult = await providerClient.syncInvoiceStatus(deposit.providerPaymentId);
  
  // Extract confirmations info from status result if available
  let confirmations: number | null = null;
  let requiredConfirmations: number | null = null;
  let txStatus: string | null = null;
  
  // Get confirmations from raw payment data if available
  if (statusResult.rawPaymentData?.data?.txs?.[0]) {
    const tx = statusResult.rawPaymentData.data.txs[0];
    confirmations = tx.confirmations ?? null;
    txStatus = tx.status ?? null;
    
    if (confirmations !== null && requiredConfirmations === null) {
      const txNetwork = tx.network?.toLowerCase() || "";
      const currencyNetwork = deposit.payCurrency?.toLowerCase() || "";
      requiredConfirmations = getRequiredConfirmations(txNetwork || currencyNetwork);
    }
  }

  // Use OxaPay status directly (paying, paid, expired, failed, cancelled)
  // Map from our internal status format to OxaPay format
  let newStatus: OxaPayDepositStatus;
  const rawStatus = (statusResult.rawStatus || statusResult.status || "paying").toLowerCase();
  
  if (rawStatus === "paid" || rawStatus === "completed" || rawStatus === "finished") {
    newStatus = "paid";
  } else if (rawStatus === "expired") {
    newStatus = "expired";
  } else if (rawStatus === "failed" || rawStatus === "cancelled" || rawStatus === "canceled") {
    newStatus = rawStatus === "cancelled" || rawStatus === "canceled" ? "cancelled" : "failed";
  } else {
    // paying, processing, confirming, etc. -> paying
    newStatus = "paying";
  }

  // Check if this is the first time transitioning to paid (was paying/expired/failed/cancelled, now paid)
  const wasPaid = deposit.status === "paid";
  const isNowPaid = newStatus === "paid";
  const shouldCreditBalance = !wasPaid && isNowPaid;

  const result = await db.$transaction(
    async (tx) => {
      const updatedDeposit = await tx.deposit.update({
        where: { id: deposit.id },
        data: {
          status: newStatus,
          txHash: statusResult.txHash || deposit.txHash,
          confirmedAt:
            isNowPaid && !deposit.confirmedAt ? new Date() : deposit.confirmedAt,
        },
      });

      if (shouldCreditBalance) {
        const creditAmount = deposit.amountUsdt;

        await creditWallet(tx, {
          walletId: deposit.walletId,
          amount: creditAmount,
          type: TransactionType.DEPOSIT,
          meta: {
            depositId: deposit.id,
            provider: deposit.provider,
            origin: deposit.origin,
            providerPaymentId: deposit.providerPaymentId,
            txHash: statusResult.txHash || deposit.txHash || null,
          },
        });

        console.log(
          `✅ Balance credited: +${creditAmount.toString()} USDT for deposit ${deposit.id} (status: ${deposit.status} -> ${newStatus})`
        );
      }

      return { deposit: updatedDeposit, balanceCredited: shouldCreditBalance };
    },
    { timeout: 15000 }
  );

  if (result.balanceCredited) {
    const { createAuditLog } = await import("@/shared/lib/audit-log");
    await createAuditLog({
      action: "DEPOSIT_PAID",
      entityType: "DEPOSIT",
      entityId: deposit.id,
      metadata: {
        amount: deposit.amountUsdt.toString(),
        previousStatus: deposit.status,
        newStatus: newStatus,
        confirmations,
        requiredConfirmations,
      },
      userId: deposit.user.id,
    });
  }

  // Emit realtime events after status update
  // This triggers SSE updates so UI reflects status changes immediately
  const eventsToEmit: Promise<void>[] = [
    emitRealtimeEvent({
      type: "deposit_status_updated",
      userId: deposit.user.id,
      depositId: result.deposit.id,
      status: result.deposit.status,
      confirmations: confirmations ?? undefined,
      requiredConfirmations: requiredConfirmations ?? undefined,
      txStatus: txStatus ?? undefined,
      timestamp: new Date().toISOString(),
    }),
  ];

  // Emit wallet balance update if balance was credited
  if (result.balanceCredited) {
    // Get updated wallet balance after transaction
    const updatedWallet = await db.wallet.findUnique({
      where: { id: deposit.walletId },
      select: { balanceUsdt: true },
    });

    if (updatedWallet) {
      eventsToEmit.push(
        emitRealtimeEvent({
          type: "wallet_balance_updated",
          userId: deposit.user.id,
          walletId: deposit.walletId,
          balance: updatedWallet.balanceUsdt.toString(),
          timestamp: new Date().toISOString(),
        })
      );
    }
  }

  await Promise.all(eventsToEmit);

  // Send Telegram notification when deposit is paid
  if (result.balanceCredited && result.deposit.status === "paid") {
    try {
      const { sendTelegramNotificationForOperation } = await import("@/modules/telegram/lib/telegram-notifications");
      await sendTelegramNotificationForOperation(deposit.user.id, {
        id: result.deposit.id,
        type: "deposit",
        amount: result.deposit.amountUsdt.toNumber(),
        status: result.deposit.status,
        createdAt: result.deposit.createdAt,
        confirmedAt: result.deposit.confirmedAt,
        txHash: result.deposit.txHash || undefined,
        amountUsdt: result.deposit.amountUsdt.toNumber(),
      });
    } catch (error) {
      console.error("[Telegram] Failed to send deposit notification:", error);
    }
  }

  // Recalculate referral turnover if deposit status changed to/from "paid"
  // This affects the user's turnover and their parents' turnover (1st line)
  if (shouldCreditBalance || (wasPaid && newStatus !== "paid")) {
    try {
      const { recalculateTurnoverChainForUser } = await import("@/modules/affiliate/lib/affiliate-service");
      await recalculateTurnoverChainForUser(deposit.user.id);
      console.log(`[Referral] Recalculated turnover chain for user ${deposit.user.id} after deposit status change`);
    } catch (error) {
      console.error(`[Referral] Failed to recalculate turnover chain for user ${deposit.user.id}:`, error);
      // Don't fail the deposit update if referral recalculation fails
    }
  }

  return result;
}

/**
 * Get wallet with summary (balance, deposits, withdrawals)
 * Optimized: Single query with include instead of multiple queries
 * NOT cached - must return fresh data for realtime updates
 */
export async function getWalletWithSummary(userId: string) {
  const wallet = await db.wallet.findUnique({
    where: { userId },
    include: {
      deposits: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          amountUsdt: true,
          amountCrypto: true,
          status: true,
          createdAt: true,
        },
      },
      withdrawals: {
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          amount: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  // Create wallet if it doesn't exist
  if (!wallet) {
    const newWallet = await db.wallet.create({
      data: {
        userId,
        balanceUsdt: new Prisma.Decimal(0),
      },
      include: {
        deposits: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            amountUsdt: true,
            amountCrypto: true,
            status: true,
            createdAt: true,
          },
        },
        withdrawals: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    return {
      balance: newWallet.balanceUsdt.toNumber(),
      deposits: newWallet.deposits.map((d) => ({
        id: d.id,
        amountUsdt: d.amountUsdt.toNumber(),
        amountCrypto: d.amountCrypto?.toNumber() || null,
        status: d.status as OxaPayDepositStatus,
        createdAt: d.createdAt,
      })),
      withdrawals: newWallet.withdrawals.map((w) => ({
        id: w.id,
        amount: w.amount.toNumber(),
        status: w.status,
        createdAt: w.createdAt,
      })),
    };
  }

  return {
    balance: wallet.balanceUsdt.toNumber(),
    deposits: wallet.deposits.map((d) => ({
      id: d.id,
      amountUsdt: d.amountUsdt.toNumber(),
      amountCrypto: d.amountCrypto?.toNumber() || null,
      status: d.status as OxaPayDepositStatus,
      createdAt: d.createdAt,
    })),
    withdrawals: wallet.withdrawals.map((w) => ({
      id: w.id,
      amount: w.amount.toNumber(),
      status: w.status,
      createdAt: w.createdAt,
    })),
  };
}

/**
 * Request withdrawal
 * Validates address format based on selected network
 */

export async function requestWithdrawal(
  userId: string,
  amount: number,
  toAddress: string,
  network: NetworkType = "TRC20"
) {
  const wallet = await getOrCreateWallet(userId);

  // Check balance
  if (wallet.balanceUsdt.toNumber() < amount) {
    throw new Error("Insufficient balance");
  }

  // Withdrawals are USDT-only (TRC20/ERC20/BEP20/Polygon)
  if (!["TRC20", "ERC20", "BEP20", "MATIC"].includes(network)) {
    throw new Error("Withdrawals are only available in USDT on TRC20, ERC20, BEP20, or Polygon (MATIC).");
  }

  // Validate withdrawal address based on network
  const addressValidation = validateWithdrawalAddress(toAddress, network);
  if (!addressValidation.ok) {
    throw new Error(addressValidation.error || "Invalid wallet address");
  }

  // Map network to currency format using NETWORKS config
  const networkInfo = NETWORKS[network] || NETWORKS.TRC20;
  const currency = networkInfo.currency;
  if (!currency.startsWith("USDT_")) {
    throw new Error("Withdrawals are USDT-only. Please select a USDT network (TRC20, ERC20, BEP20, Polygon).");
  }

  // Create withdrawal request
  // Use default provider from configuration
  const withdrawal = await db.withdrawal.create({
    data: {
      walletId: wallet.id,
      amount: new Prisma.Decimal(amount),
      currency,
      toAddress,
      status: "PENDING",
      provider: DEFAULT_WITHDRAWAL_PROVIDER, // Use configured default provider
    },
  });

  // Audit log for withdrawal creation
  try {
    const { createAuditLog } = await import("@/shared/lib/audit-log");
    await createAuditLog({
      action: "WITHDRAWAL_CREATED",
      entityType: "WITHDRAWAL",
      entityId: withdrawal.id,
      metadata: {
        amount,
        currency,
        toAddress,
        network,
        provider: DEFAULT_WITHDRAWAL_PROVIDER,
      },
      userId,
    });
  } catch (error) {
    console.error("[AuditLog] Failed to log withdrawal creation:", error);
  }

  // Emit realtime event for new withdrawal
  // This triggers SSE updates so UI shows the new withdrawal immediately
  try {
    const { emitRealtimeEvent } = await import("@/shared/lib/realtime-events");
    await emitRealtimeEvent({
      type: "operation_created",
      userId: userId,
      operationId: withdrawal.id,
      operationType: "withdrawal",
      status: withdrawal.status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Realtime] Failed to emit withdrawal created event:", error);
  }

  // Send Telegram notification
  try {
    const { sendTelegramNotificationForOperation } = await import("@/modules/telegram/lib/telegram-notifications");
    await sendTelegramNotificationForOperation(userId, {
      id: withdrawal.id,
      type: "withdrawal",
      amount: withdrawal.amount.toNumber(),
      status: withdrawal.status,
      createdAt: withdrawal.createdAt,
      toAddress: withdrawal.toAddress,
    });
  } catch (error) {
    // Telegram notifications are non-critical, just log
    console.error("[Telegram] Failed to send withdrawal notification:", error);
  }

  return withdrawal;
}
