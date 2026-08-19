import { db } from "@/shared/lib/db";
import { StrategyType, StrategyStatus, TransactionType } from "@prisma/client";
import { CreateStrategyInput, StrategyCalculationResult } from "./strategies-types";
import { calculateStrategyDetails } from "./strategies-calculator";
import { getStrategyConfig } from "./strategies-admin-service";
import { isTestMode } from "@/shared/lib/env";
import { creditWallet, debitWallet } from "@/shared/lib/wallet/ledger";

/**
 * Create a new strategy for a user
 */
export async function createStrategy(
  userId: string,
  input: CreateStrategyInput
): Promise<{ success: boolean; strategyId?: string; error?: string }> {
  try {
    // Get strategy config by ID
    const config = await db.strategyConfig.findUnique({
      where: { id: input.configId },
    });
    if (!config) {
      return { success: false, error: "Strategy configuration not found" };
    }

    // Calculate percent boundaries
    const details = calculateStrategyDetails(
      {
        type: config.type,
        name: config.name,
        minAmount: Number(config.minAmount),
        maxAmount: Number(config.maxAmount),
        minDays: config.minDays,
        maxDays: config.maxDays,
        baseMinPercent: Number(config.baseMinPercent),
        baseMaxPercent: Number(config.baseMaxPercent),
        allowMultiplier: config.allowMultiplier,
      },
      input.amount,
      input.durationDays
    );

    // Calculate end date
    // In test mode (development/preview) durationDays is treated as minutes
    // for fast iteration. In production it is days.
    const startDate = new Date();
    const endDate = new Date(startDate);
    if (isTestMode()) {
      endDate.setMinutes(endDate.getMinutes() + input.durationDays);
    } else {
      endDate.setDate(endDate.getDate() + input.durationDays);
    }

    // Get user wallet to check balance
    const wallet = await db.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      return { success: false, error: "Wallet not found" };
    }

    // Check if user has enough balance
    if (Number(wallet.balanceUsdt) < input.amount) {
      return { success: false, error: "Insufficient balance" };
    }

    // Check if user already has an active strategy with the same configId
    // User cannot invest in the same strategy configuration twice simultaneously
    const activeStrategyWithSameConfig = await db.strategy.findFirst({
      where: {
        userId,
        status: StrategyStatus.ACTIVE,
        configId: input.configId, // Match by configId (unique strategy configuration)
      },
    });

    if (activeStrategyWithSameConfig) {
      return {
        success: false,
        error: "You already have an active investment in this strategy. Please wait until it completes before investing again.",
      };
    }

    // Create strategy and debit wallet in transaction
    const result = await db.$transaction(async (tx) => {
      // Create strategy
      const strategy = await tx.strategy.create({
        data: {
          userId,
          type: StrategyType.DAY, // Always DAY, fixed
          configId: input.configId, // Store configId to identify which config was used
          amount: input.amount,
          durationDays: input.durationDays,
          startDate,
          endDate,
          status: StrategyStatus.ACTIVE,
          minPercent: details.minPercent,
          maxPercent: details.maxPercent,
        },
      });

      // Debit wallet — single ledger entry (negative amount + balance update)
      await debitWallet(tx, {
        walletId: wallet.id,
        amount: input.amount,
        type: TransactionType.STRATEGY_PRINCIPAL_LOCK,
        meta: {
          strategyId: strategy.id,
          strategyName: config.name,
        },
      });

      return strategy;
    });

    // Recalculate referral turnover chain (new active strategy created)
    try {
      const { recalculateTurnoverChainForUser } = await import("@/modules/affiliate/lib/affiliate-service");
      await recalculateTurnoverChainForUser(userId);
      console.log(`[Referral] Recalculated turnover chain for user ${userId} after strategy creation`);
    } catch (error) {
      console.error(`[Referral] Failed to recalculate turnover chain for user ${userId}:`, error);
      // Don't fail strategy creation if referral recalculation fails
    }

    return { success: true, strategyId: result.id };
  } catch (error) {
    console.error("Error creating strategy:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create strategy",
    };
  }
}

/**
 * Cancel strategy and return principal to user
 */
export async function cancelStrategy(
  strategyId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get strategy
    const strategy = await db.strategy.findFirst({
      where: {
        id: strategyId,
        userId, // Ensure user owns the strategy
      },
    });

    if (!strategy) {
      return { success: false, error: "Strategy not found" };
    }

    // Check if strategy can be cancelled
    if (strategy.status !== StrategyStatus.ACTIVE) {
      return { success: false, error: "Only active strategies can be cancelled" };
    }

    // Check if principal already returned
    const existingReturn = await db.strategyPrincipalReturn.findFirst({
      where: { strategyId: strategy.id },
    });

    if (existingReturn) {
      return { success: false, error: "Principal already returned" };
    }

    // Cancel strategy and return principal in transaction
    await db.$transaction(async (tx) => {
      // Create principal return record
      await tx.strategyPrincipalReturn.create({
        data: {
          strategyId: strategy.id,
          userId: strategy.userId,
          amount: strategy.amount,
        },
      });

      // Credit principal to wallet
      const wallet = await tx.wallet.findUnique({
        where: { userId: strategy.userId },
      });

      if (wallet) {
        await creditWallet(tx, {
          walletId: wallet.id,
          amount: strategy.amount,
          type: TransactionType.STRATEGY_PRINCIPAL_RETURN,
          meta: {
            strategyId: strategy.id,
            cancelled: true,
          },
        });
      }

      // Update strategy status to CANCELLED
      await tx.strategy.update({
        where: { id: strategy.id },
        data: {
          status: StrategyStatus.CANCELLED,
        },
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Error cancelling strategy:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to cancel strategy",
    };
  }
}

/**
 * Get all strategies for a user with strategy names
 */
export async function getUserStrategies(userId: string) {
  const strategies = await db.strategy.findMany({
    where: { userId },
    include: {
      profits: {
        orderBy: { date: "desc" },
      },
      principalReturns: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Get strategy names from configs
  const configIds = strategies
    .map((s) => s.configId)
    .filter((id): id is string => id !== null && id !== undefined);
  
  const configs = configIds.length > 0
    ? await db.strategyConfig.findMany({
        where: { id: { in: configIds } },
        select: { id: true, name: true },
      })
    : [];

  const configsMap = new Map(configs.map((c) => [c.id, c.name]));

  // Add strategy names to strategies
  return strategies.map((strategy) => ({
    ...strategy,
    strategyName: strategy.configId ? (configsMap.get(strategy.configId) || "Strategy") : "Strategy",
  }));
}

/**
 * Get active strategies for a user
 */
export async function getActiveStrategies(userId: string) {
  return db.strategy.findMany({
    where: {
      userId,
      status: StrategyStatus.ACTIVE,
    },
    include: {
      profits: {
        orderBy: { date: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get strategy by ID
 */
export async function getStrategyById(strategyId: string, userId: string) {
  const strategy = await db.strategy.findFirst({
    where: {
      id: strategyId,
      userId,
    },
    include: {
      profits: {
        orderBy: { date: "desc" },
      },
      principalReturns: true,
    },
  });

  if (!strategy) {
    return null;
  }

  // Get strategy name from config if configId exists
  let strategyName = "Strategy";
  if (strategy.configId) {
    const config = await db.strategyConfig.findUnique({
      where: { id: strategy.configId },
      select: { name: true },
    });
    if (config) {
      strategyName = config.name;
    }
  }

  return {
    ...strategy,
    strategyName, // Add strategy name
  };
}

/**
 * Calculate total earned from all profits (including bonuses)
 */
export async function getTotalEarned(userId: string): Promise<number> {
  // Get strategy profits
  const profits = await db.strategyProfit.findMany({
    where: {
      userId,
      type: { in: ["PROFIT_DAY", "BONUS_MULTIPLIER"] },
    },
  });

  const strategyEarned = profits.reduce((sum, profit) => sum + Number(profit.amount), 0);

  // Get referral payouts
  const wallet = await db.wallet.findUnique({
    where: { userId },
    include: {
      transactions: {
        where: {
          type: "REFERRAL_PAYOUT",
        },
      },
    },
  });

  const referralEarned = wallet?.transactions.reduce(
    (sum, tx) => sum + Number(tx.amount),
    0
  ) || 0;

  return strategyEarned + referralEarned;
}

/**
 * Calculate bonus earned (only multiplier bonuses)
 */
export async function getBonusEarned(userId: string): Promise<number> {
  const bonusProfits = await db.strategyProfit.findMany({
    where: {
      userId,
      type: "BONUS_MULTIPLIER",
    },
  });

  return bonusProfits.reduce((sum, profit) => sum + Number(profit.amount), 0);
}

/**
 * Calculate TVL (Total Value Locked) - sum of all active strategy principals
 */
export async function getTVL(userId: string): Promise<number> {
  const activeStrategies = await db.strategy.findMany({
    where: {
      userId,
      status: StrategyStatus.ACTIVE,
    },
  });

  return activeStrategies.reduce((sum, strategy) => sum + Number(strategy.amount), 0);
}
