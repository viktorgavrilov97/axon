import { db } from "@/shared/lib/db";
import { WithdrawalStatus, WithdrawalProvider } from "@prisma/client";
import type { Operation } from "./types";
import { syncWithdrawalPayoutStatus } from "@/modules/wallet/lib/withdrawal-payout-service";
import { getPaymentStatus } from "@/modules/wallet/lib/oxapay";
import { getRequiredConfirmations } from "@/modules/wallet/lib/confirmation-utils";

// OxaPay deposit statuses
type OxaPayDepositStatus = "paying" | "paid" | "expired" | "failed" | "cancelled";

export type { Operation } from "./types";

/**
 * Get all operations (deposits + withdrawals) for user
 * Optimized: Single query with include instead of separate queries
 * NOT cached - must return fresh data for realtime updates
 * Automatically syncs withdrawal statuses from OxaPay
 */
export async function getOperations(userId: string): Promise<Operation[]> {
  const wallet = await db.wallet.findUnique({
    where: { userId },
    include: {
      deposits: {
        orderBy: { createdAt: "desc" },
      },
      withdrawals: {
        orderBy: { createdAt: "desc" },
      },
      transactions: {
        where: {
          type: {
            in: ["STRATEGY_PROFIT", "STRATEGY_BONUS", "STRATEGY_PRINCIPAL_LOCK", "STRATEGY_PRINCIPAL_RETURN", "REFERRAL_PAYOUT"],
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!wallet) {
    return [];
  }

  const deposits = wallet.deposits;
  const withdrawals = wallet.withdrawals;
  const strategyTransactions = wallet.transactions;

  // Sync statuses for OxaPay withdrawals that are still processing
  const withdrawalsToSync = withdrawals.filter(
    (w) => 
      w.provider === WithdrawalProvider.OXAPAY && 
      w.providerPayoutId && 
      (w.status === WithdrawalStatus.PROCESSING || w.status === WithdrawalStatus.APPROVED)
  );

  if (withdrawalsToSync.length > 0) {
    // Sync in background, don't wait for all
    Promise.all(
      withdrawalsToSync.map((w) =>
        syncWithdrawalPayoutStatus(w.id).catch((error) => {
          console.error(`[Operations] Failed to sync withdrawal ${w.id}:`, error);
          return null;
        })
      )
    ).catch((error) => {
      console.error("[Operations] Error syncing withdrawal statuses:", error);
    });
  }

  // Get confirmation info for active deposits (paying status)
  const activeDeposits = deposits.filter((d) => d.status === "paying" && d.providerPaymentId);
  
  // Fetch confirmation info for active deposits in parallel
  const depositsWithConfirmations = await Promise.all(
    deposits.map(async (d) => {
      let confirmations: number | null = null;
      let requiredConfirmations: number | null = null;
      let txStatus: string | null = null;

      // Only fetch for active deposits to avoid unnecessary API calls
      if (d.status === "paying" && d.providerPaymentId) {
        try {
          const paymentStatus = await getPaymentStatus(d.providerPaymentId);
          const txs = paymentStatus.data?.txs || [];
          
          if (txs.length > 0) {
            const tx = txs[0];
            confirmations = tx.confirmations ?? null;
            txStatus = tx.status ?? null;
            
            // Determine required confirmations based on network
            if (confirmations !== null && requiredConfirmations === null) {
              const txNetwork = tx.network?.toLowerCase() || "";
              const currencyNetwork = d.payCurrency?.toLowerCase() || "";
              requiredConfirmations = getRequiredConfirmations(txNetwork || currencyNetwork);
            }
          }
        } catch (error) {
          console.error(`Error fetching payment status for deposit ${d.id}:`, error);
          // Continue without confirmation info if API call fails
        }
      }

      return {
        id: d.id,
        type: "deposit" as const,
        amount: d.amountUsdt.toNumber(),
        status: d.status as OxaPayDepositStatus,
        createdAt: d.createdAt,
        confirmedAt: d.confirmedAt,
        expiresAt: d.expiresAt || undefined,
        amountUsdt: d.amountUsdt.toNumber(),
        amountCrypto: d.amountCrypto?.toNumber() || null,
        payAmount: d.amountCrypto?.toNumber() || null,
        payCurrency: d.payCurrency,
        address: d.payAddress,
        txHash: d.txHash,
        confirmations,
        requiredConfirmations,
        txStatus,
      };
    })
  );

  // Convert strategy transactions to operations
  const strategyOperations = await Promise.all(
    strategyTransactions.map(async (tx) => {
      const meta = tx.meta as { 
        strategyId?: string; 
        profitId?: string;
        strategyName?: string;
        percent?: number;
        strategyAmount?: number;
        baseBonusPercent?: number;
        diversityScore?: number;
        effectiveBonusPercent?: number;
        activeStrategiesCount?: number;
        largestShare?: number;
        strategyNames?: string[];
        cancelled?: boolean;
        adminDeleted?: boolean;
      } | null;
      let profitType: "PROFIT_DAY" | "BONUS_MULTIPLIER" | undefined;
      let description: string | undefined;
      let strategyName: string | undefined = meta?.strategyName;

      // Get strategy name from StrategyConfig if strategyId exists and name not in meta
      if (tx.type === "STRATEGY_PRINCIPAL_LOCK" || tx.type === "STRATEGY_PRINCIPAL_RETURN") {
        if (meta?.strategyId && !strategyName) {
          try {
            const strategy = await db.strategy.findUnique({
              where: { id: meta.strategyId },
              select: { configId: true },
            });
            if (strategy?.configId) {
              const config = await db.strategyConfig.findUnique({
                where: { id: strategy.configId },
                select: { name: true },
              });
              if (config) {
                strategyName = config.name;
              }
            }
          } catch (error) {
            console.error(`Error fetching strategy name for transaction ${tx.id}:`, error);
          }
        }
      }

      // Try to get profit type from StrategyProfit if profitId exists
      if (meta?.profitId) {
        try {
          const profit = await db.strategyProfit.findUnique({
            where: { id: meta.profitId },
            select: { type: true },
          });
          if (profit) {
            profitType = profit.type === "PROFIT_DAY" ? "PROFIT_DAY" : "BONUS_MULTIPLIER";
          }
        } catch (error) {
          console.error(`Error fetching profit type for transaction ${tx.id}:`, error);
        }
      }

      // Build description based on transaction type
      if (tx.type === "STRATEGY_PROFIT") {
        // Daily Profit description
        const name = meta?.strategyName || "Strategy";
        const percent = meta?.percent;
        const strategyAmount = meta?.strategyAmount;
        
        if (percent !== undefined && strategyAmount !== undefined) {
          description = `${name}: ${percent.toFixed(2)}% on ${strategyAmount.toFixed(2)} USDT`;
        } else if (percent !== undefined) {
          description = `${name}: ${percent.toFixed(2)}% daily profit`;
        } else {
          description = `Daily Profit from ${name}`;
        }
      } else if (tx.type === "STRATEGY_BONUS") {
        // Yield Multiplayer Bonus description
        const baseBonus = meta?.baseBonusPercent;
        const diversityScore = meta?.diversityScore;
        const effectiveBonus = meta?.effectiveBonusPercent;
        const activeCount = meta?.activeStrategiesCount;
        const strategyNames = meta?.strategyNames || [];
        const largestShare = meta?.largestShare;

        const parts: string[] = [];
        
        if (activeCount && activeCount > 0) {
          if (strategyNames.length > 0) {
            parts.push(`from ${strategyNames.join(", ")}`);
          } else {
            parts.push(`${activeCount} active strateg${activeCount === 1 ? 'y' : 'ies'}`);
          }
        }

        if (baseBonus !== undefined && diversityScore !== undefined && effectiveBonus !== undefined) {
          const diversityPercent = Math.round(diversityScore * 100);
          parts.push(`base ${baseBonus}% × ${diversityPercent}% diversity = ${effectiveBonus.toFixed(2)}%`);
        }

        if (largestShare !== undefined) {
          const sharePercent = Math.round(largestShare * 100);
          if (sharePercent > 60) {
            parts.push(`largest share ${sharePercent}%`);
          }
        }

        description = parts.length > 0 
          ? `Yield Multiplayer: ${parts.join(", ")}`
          : "Yield Multiplayer Bonus";
      } else if (tx.type === "STRATEGY_PRINCIPAL_LOCK") {
        // Strategy Investment description
        const name = strategyName || "Strategy";
        description = `Allocated to ${name}`;
      } else if (tx.type === "STRATEGY_PRINCIPAL_RETURN") {
        // Capital Return description
        const name = strategyName || "Strategy";
        if (meta?.cancelled) {
          description = `Capital returned from ${name} (cancelled)`;
        } else if (meta?.adminDeleted) {
          description = `Capital returned from ${name} (admin deleted)`;
        } else {
          description = `Capital returned from ${name}`;
        }
      } else if (tx.type === "REFERRAL_PAYOUT") {
        // Referral Payout description
        // Check if this is a grouped payout (has breakdown) or single payout (has level)
        const breakdown = (meta as any)?.breakdown;
        const level = (meta as any)?.level;
        const periodStart = (meta as any)?.periodStart;
        
        // Always show "Referral reward" without payout count
        description = "Referral reward";
      }

      // Determine operation type
      let operationType: Operation["type"];
      if (tx.type === "STRATEGY_PROFIT") {
        operationType = "strategy_profit";
      } else if (tx.type === "STRATEGY_BONUS") {
        operationType = "strategy_bonus";
      } else if (tx.type === "STRATEGY_PRINCIPAL_LOCK") {
        operationType = "strategy_investment";
      } else if (tx.type === "STRATEGY_PRINCIPAL_RETURN") {
        operationType = "capital_return";
      } else if (tx.type === "REFERRAL_PAYOUT") {
        operationType = "referral_payout";
      } else {
        operationType = "capital_return";
      }

      return {
        id: tx.id,
        type: operationType,
        // Magnitude only — direction is conveyed by `type`/icon in the UI.
        // Stored as signed value in the ledger (debit ops are negative).
        amount: tx.amount.abs().toNumber(),
        status: "completed" as const,
        createdAt: tx.createdAt,
        strategyId: meta?.strategyId,
        profitId: meta?.profitId,
        profitType,
        description,
        strategyName,
        effectiveBonusPercent: meta?.effectiveBonusPercent,
      };
    })
  );

  const operations: Operation[] = [
    ...depositsWithConfirmations,
    ...withdrawals.map((w) => ({
      id: w.id,
      type: "withdrawal" as const,
      amount: w.amount.toNumber(),
      status: w.status as WithdrawalStatus,
      createdAt: w.createdAt,
      processedAt: w.processedAt,
      toAddress: w.toAddress,
      rejectionReason: w.rejectionReason,
      expiresAt: undefined, // Withdrawals don't expire
    })),
    ...strategyOperations,
  ];

  // Sort by createdAt desc
  return operations.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Get paginated operations for user (cursor-based pagination)
 * Returns operations sorted by createdAt desc (newest first)
 */
export async function getUserOperationsPaginated(params: {
  userId: string;
  limit?: number; // default 10
  cursor?: string | null; // Format: "{type}:{id}:{timestamp}" e.g. "deposit:abc123:1234567890"
  typeFilter?: "all" | "deposit" | "withdrawal" | "strategy_investment" | "referral_payout";
}): Promise<{
  items: Operation[];
  nextCursor: string | null;
  hasMore: boolean;
}> {
  const { userId, limit = 10, cursor, typeFilter = "all" } = params;

  // Parse cursor if provided
  let cursorCreatedAt: Date | null = null;
  let cursorId: string | null = null;
  if (cursor) {
    const parts = cursor.split(":");
    if (parts.length >= 3) {
      cursorCreatedAt = new Date(parseInt(parts[2], 10));
      cursorId = parts[1];
    }
  }

  // Get wallet
  const wallet = await db.wallet.findUnique({
    where: { userId },
  });

  if (!wallet) {
    return { items: [], nextCursor: null, hasMore: false };
  }

  // Fetch all operations (we'll paginate after combining)
  // For better performance, we could fetch more from each source and combine,
  // but for simplicity, we'll fetch all and paginate in memory
  // In production, consider using a materialized view or separate pagination per type

  const deposits = await db.deposit.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: "desc" },
  });

  const withdrawals = await db.withdrawal.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: "desc" },
  });

  const transactions = await db.transaction.findMany({
    where: {
      walletId: wallet.id,
      type: {
        in: ["STRATEGY_PROFIT", "STRATEGY_BONUS", "STRATEGY_PRINCIPAL_LOCK", "STRATEGY_PRINCIPAL_RETURN", "REFERRAL_PAYOUT"],
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Convert to operations (simplified version - reuse existing logic)
  // For performance, we could optimize this, but keeping it simple for now
  const allOperations = await getOperations(userId);

  // Apply type filter if provided
  let filteredOperations = allOperations;
  if (typeFilter !== "all") {
    filteredOperations = filteredOperations.filter((op) => {
      if (typeFilter === "deposit") {
        return op.type === "deposit";
      } else if (typeFilter === "withdrawal") {
        return op.type === "withdrawal";
      } else if (typeFilter === "strategy_investment") {
        // Include strategy_investment, strategy_profit (daily profit), and strategy_bonus (yield multiplayer)
        return op.type === "strategy_investment" || op.type === "strategy_profit" || op.type === "strategy_bonus";
      } else if (typeFilter === "referral_payout") {
        return op.type === "referral_payout";
      }
      return true;
    });
  }

  // Apply cursor filtering if provided
  if (cursorCreatedAt && cursorId) {
    filteredOperations = filteredOperations.filter((op) => {
      const opTime = op.createdAt.getTime();
      const cursorTime = cursorCreatedAt!.getTime();
      
      // If operation is older than cursor, include it
      if (opTime < cursorTime) {
        return true;
      }
      
      // If same time, include if id is different (for stable sorting)
      if (opTime === cursorTime) {
        return op.id !== cursorId;
      }
      
      return false;
    });
  }

  // Sort by createdAt desc, then by id desc for stable sorting
  filteredOperations.sort((a, b) => {
    const timeDiff = b.createdAt.getTime() - a.createdAt.getTime();
    if (timeDiff !== 0) return timeDiff;
    return b.id.localeCompare(a.id);
  });

  // Take limit + 1 to check if there's more
  const hasMore = filteredOperations.length > limit;
  const items = hasMore ? filteredOperations.slice(0, limit) : filteredOperations;

  // Calculate next cursor from last item
  const nextCursor = hasMore && items.length > 0
    ? `${items[items.length - 1].type}:${items[items.length - 1].id}:${items[items.length - 1].createdAt.getTime()}`
    : null;

  return {
    items,
    nextCursor,
    hasMore,
  };
}

/**
 * Get single operation by ID
 */
export async function getOperationById(operationId: string, userId: string): Promise<Operation | null> {
  const wallet = await db.wallet.findUnique({
    where: { userId },
  });

  if (!wallet) {
    return null;
  }

  // Try deposit first
  const deposit = await db.deposit.findFirst({
    where: {
      id: operationId,
      walletId: wallet.id,
    },
  });

  if (deposit) {
    // Get confirmation info from OxaPay if providerPaymentId exists
    let confirmations: number | null = null;
    let requiredConfirmations: number | null = null;
    let txStatus: string | null = null;
    
    if (deposit.providerPaymentId) {
      try {
        const paymentStatus = await getPaymentStatus(deposit.providerPaymentId);
        const txs = paymentStatus.data?.txs || [];
        
        // Get the first transaction (usually there's only one)
        if (txs.length > 0) {
          const tx = txs[0];
          confirmations = tx.confirmations ?? null;
          txStatus = tx.status ?? null;
          
          if (confirmations !== null && requiredConfirmations === null) {
            const txNetwork = tx.network?.toLowerCase() || "";
            const currencyNetwork = deposit.payCurrency?.toLowerCase() || "";
            requiredConfirmations = getRequiredConfirmations(txNetwork || currencyNetwork);
          }
        }
      } catch (error) {
        console.error("Error fetching payment status from OxaPay:", error);
        // Continue without confirmation info if API call fails
      }
    }

    return {
      id: deposit.id,
      type: "deposit",
      amount: deposit.amountUsdt.toNumber(),
      status: deposit.status as OxaPayDepositStatus,
      createdAt: deposit.createdAt,
      confirmedAt: deposit.confirmedAt,
      expiresAt: deposit.expiresAt || undefined,
      amountUsdt: deposit.amountUsdt.toNumber(),
      amountCrypto: deposit.amountCrypto?.toNumber() || null,
      payAmount: deposit.amountCrypto?.toNumber() || null,
      payCurrency: deposit.payCurrency,
      address: deposit.payAddress,
      txHash: deposit.txHash,
      confirmations,
      requiredConfirmations,
      txStatus,
    };
  }

  // Try withdrawal
  const withdrawal = await db.withdrawal.findFirst({
    where: {
      id: operationId,
      walletId: wallet.id,
    },
  });

  if (withdrawal) {
    return {
      id: withdrawal.id,
      type: "withdrawal",
      amount: withdrawal.amount.toNumber(),
      status: withdrawal.status as WithdrawalStatus,
      createdAt: withdrawal.createdAt,
      processedAt: withdrawal.processedAt,
      toAddress: withdrawal.toAddress,
      rejectionReason: withdrawal.rejectionReason,
      expiresAt: undefined, // Withdrawals don't expire
    };
  }

  // Try strategy transaction or referral payout
  const transaction = await db.transaction.findFirst({
    where: {
      id: operationId,
      walletId: wallet.id,
      type: {
        in: ["STRATEGY_PROFIT", "STRATEGY_BONUS", "STRATEGY_PRINCIPAL_LOCK", "STRATEGY_PRINCIPAL_RETURN", "REFERRAL_PAYOUT"],
      },
    },
  });

  if (transaction) {
    const meta = transaction.meta as { 
      strategyId?: string; 
      profitId?: string;
      strategyName?: string;
      percent?: number;
      strategyAmount?: number;
      baseBonusPercent?: number;
      diversityScore?: number;
      effectiveBonusPercent?: number;
      activeStrategiesCount?: number;
      largestShare?: number;
      strategyNames?: string[];
      cancelled?: boolean;
      adminDeleted?: boolean;
    } | null;
    let profitType: "PROFIT_DAY" | "BONUS_MULTIPLIER" | undefined;
    let strategyName: string | undefined = meta?.strategyName;

    // Get strategy name from StrategyConfig if strategyId exists and name not in meta
    if (transaction.type === "STRATEGY_PRINCIPAL_LOCK" || transaction.type === "STRATEGY_PRINCIPAL_RETURN") {
      if (meta?.strategyId && !strategyName) {
        try {
          const strategy = await db.strategy.findUnique({
            where: { id: meta.strategyId },
            select: { configId: true },
          });
          if (strategy?.configId) {
            const config = await db.strategyConfig.findUnique({
              where: { id: strategy.configId },
              select: { name: true },
            });
            if (config) {
              strategyName = config.name;
            }
          }
        } catch (error) {
          console.error(`Error fetching strategy name for transaction ${transaction.id}:`, error);
        }
      }
    }

    // Try to get profit type from StrategyProfit if profitId exists
    if (meta?.profitId) {
      try {
        const profit = await db.strategyProfit.findUnique({
          where: { id: meta.profitId },
          select: { type: true },
        });
        if (profit) {
          profitType = profit.type === "PROFIT_DAY" ? "PROFIT_DAY" : "BONUS_MULTIPLIER";
        }
      } catch (error) {
        console.error(`Error fetching profit type for transaction ${transaction.id}:`, error);
      }
    }

    // Build description from meta
    let description: string | undefined;

    if (transaction.type === "STRATEGY_PROFIT") {
      const name = meta?.strategyName || "Strategy";
      const percent = meta?.percent;
      const strategyAmount = meta?.strategyAmount;
      
      if (percent !== undefined && strategyAmount !== undefined) {
        description = `${name}: ${percent.toFixed(2)}% on ${strategyAmount.toFixed(2)} USDT`;
      } else if (percent !== undefined) {
        description = `${name}: ${percent.toFixed(2)}% daily profit`;
      } else {
        description = `Daily Profit from ${name}`;
      }
    } else if (transaction.type === "STRATEGY_BONUS") {
      const baseBonus = meta?.baseBonusPercent;
      const diversityScore = meta?.diversityScore;
      const effectiveBonus = meta?.effectiveBonusPercent;
      const activeCount = meta?.activeStrategiesCount;
      const strategyNames = meta?.strategyNames || [];
      const largestShare = meta?.largestShare;

      const parts: string[] = [];
      
      if (activeCount && activeCount > 0) {
        if (strategyNames.length > 0) {
          parts.push(`from ${strategyNames.join(", ")}`);
        } else {
          parts.push(`${activeCount} active strateg${activeCount === 1 ? 'y' : 'ies'}`);
        }
      }

      if (baseBonus !== undefined && diversityScore !== undefined && effectiveBonus !== undefined) {
        const diversityPercent = Math.round(diversityScore * 100);
        parts.push(`base ${baseBonus}% × ${diversityPercent}% diversity = ${effectiveBonus.toFixed(2)}%`);
      }

      if (largestShare !== undefined) {
        const sharePercent = Math.round(largestShare * 100);
        if (sharePercent > 60) {
          parts.push(`largest share ${sharePercent}%`);
        }
      }

      description = parts.length > 0 
        ? `Yield Multiplayer: ${parts.join(", ")}`
        : "Yield Multiplayer Bonus";
    } else if (transaction.type === "STRATEGY_PRINCIPAL_LOCK") {
      const name = strategyName || "Strategy";
      description = `Invested in ${name}`;
    } else if (transaction.type === "STRATEGY_PRINCIPAL_RETURN") {
      const name = strategyName || "Strategy";
      if (meta?.cancelled) {
        description = `Capital returned from ${name} (cancelled)`;
      } else if (meta?.adminDeleted) {
        description = `Capital returned from ${name} (admin deleted)`;
      } else {
        description = `Capital returned from ${name}`;
      }
    }

    // Handle REFERRAL_PAYOUT separately
    if (transaction.type === "REFERRAL_PAYOUT") {
      const breakdown = (meta as any)?.breakdown;
      const level = (meta as any)?.level;
      const periodStart = (meta as any)?.periodStart;
      
      // Always show "Referral reward" without payout count
      const description = "Referral reward";

      return {
        id: transaction.id,
        type: "referral_payout" as const,
        amount: transaction.amount.abs().toNumber(),
        status: "completed" as const,
        createdAt: transaction.createdAt,
        description,
      };
    }

    // Determine operation type
    let operationType: Operation["type"];
    if (transaction.type === "STRATEGY_PROFIT") {
      operationType = "strategy_profit";
    } else if (transaction.type === "STRATEGY_BONUS") {
      operationType = "strategy_bonus";
    } else if (transaction.type === "STRATEGY_PRINCIPAL_LOCK") {
      operationType = "strategy_investment";
    } else {
      operationType = "capital_return";
    }

    return {
      id: transaction.id,
      type: operationType,
      amount: transaction.amount.abs().toNumber(),
      status: "completed" as const,
      createdAt: transaction.createdAt,
      strategyId: meta?.strategyId,
      profitId: meta?.profitId,
      profitType,
      description,
      strategyName,
      effectiveBonusPercent: meta?.effectiveBonusPercent,
    };
  }

  return null;
}

// getDepositExpirationTime moved to date-utils.ts to avoid db import in client components

