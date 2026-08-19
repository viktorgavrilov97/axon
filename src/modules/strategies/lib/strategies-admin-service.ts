import { db } from "@/shared/lib/db";
import { StrategyType, StrategyStatus, TransactionType } from "@prisma/client";
import { StrategyConfigData } from "./strategies-types";
import { creditWallet } from "@/shared/lib/wallet/ledger";

/**
 * Get strategy configuration by type (for backward compatibility)
 * Note: type is no longer unique, so we use findFirst
 */
export async function getStrategyConfig(type: StrategyType) {
  return db.strategyConfig.findFirst({
    where: { type },
  });
}

/**
 * Get strategy configuration by ID
 */
export async function getStrategyConfigById(id: string) {
  return db.strategyConfig.findUnique({
    where: { id },
  });
}

/**
 * Get all strategy configurations
 * Sorted by minimum investment amount (ascending)
 */
export async function getAllStrategyConfigs() {
  return db.strategyConfig.findMany({
    orderBy: { minAmount: "asc" },
  });
}

/**
 * Create or update strategy configuration
 * Uses id for upsert (if id is provided, updates; otherwise creates new)
 */
export async function upsertStrategyConfig(data: StrategyConfigData) {
  // If id is provided, update existing config
  if (data.id) {
    return db.strategyConfig.update({
      where: { id: data.id },
      data: {
        name: data.name,
        description: data.description || null,
        accentColor: data.accentColor || null,
        minAmount: data.minAmount,
        maxAmount: data.maxAmount,
        minDays: data.minDays,
        maxDays: data.maxDays,
        baseMinPercent: data.baseMinPercent,
        baseMaxPercent: data.baseMaxPercent,
        allowMultiplier: data.allowMultiplier,
      },
    });
  }

  // Otherwise, create new config
  return db.strategyConfig.create({
    data: {
      type: data.type,
      name: data.name,
      description: data.description || null,
      accentColor: data.accentColor || null,
      minAmount: data.minAmount,
      maxAmount: data.maxAmount,
      minDays: data.minDays,
      maxDays: data.maxDays,
      baseMinPercent: data.baseMinPercent,
      baseMaxPercent: data.baseMaxPercent,
      allowMultiplier: data.allowMultiplier,
    },
  });
}

/**
 * Delete strategy configuration by ID
 */
export async function deleteStrategyConfig(id: string) {
  return db.strategyConfig.delete({
    where: { id },
  });
}

/**
 * Get all strategies (admin view)
 */
export async function getAllStrategies() {
  return db.strategy.findMany({
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      profits: {
        orderBy: { date: "desc" },
        take: 10,
      },
      principalReturns: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Get strategy by ID (admin view)
 */
export async function getStrategyByIdAdmin(strategyId: string) {
  return db.strategy.findUnique({
    where: { id: strategyId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
      profits: {
        orderBy: { date: "desc" },
      },
      principalReturns: true,
    },
  });
}

/**
 * Delete strategy (admin only) - returns principal to investor if active
 */
export async function deleteStrategyAdmin(strategyId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get strategy
    const strategy = await db.strategy.findUnique({
      where: { id: strategyId },
    });

    if (!strategy) {
      return { success: false, error: "Strategy not found" };
    }

    // Check if principal already returned
    const existingReturn = await db.strategyPrincipalReturn.findFirst({
      where: { strategyId: strategy.id },
    });

    // If strategy is active and principal not returned, return it
    if (strategy.status === StrategyStatus.ACTIVE && !existingReturn) {
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
              adminDeleted: true,
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
    }

    // Delete strategy (cascade will delete profits and principal returns)
    await db.strategy.delete({
      where: { id: strategyId },
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting strategy:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete strategy",
    };
  }
}
