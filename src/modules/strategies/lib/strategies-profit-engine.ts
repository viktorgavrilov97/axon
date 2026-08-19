import { db } from "@/shared/lib/db";
import { Prisma, StrategyStatus, ProfitType, TransactionType } from "@prisma/client";
import { DailyProfitResult, MultiplierBonus } from "./strategies-types";
import { emitRealtimeEvent } from "@/shared/lib/realtime-events";
import { getProfitPeriodBounds, PROFIT_PERIOD_MINUTES } from "@/config/profit-period";
import { isTestMode, getEnvLabel } from "@/shared/lib/env";
import { creditWallet } from "@/shared/lib/wallet/ledger";

/**
 * Generate random percent within min/max range
 */
function randomPercent(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Calculate profit for a single strategy for a given period
 * 
 * @param strategy - The strategy to calculate profit for
 * @param periodStart - Start of the profit period (inclusive)
 * @param periodEnd - End of the profit period (exclusive)
 * @returns DailyProfitResult if profit should be generated, null otherwise
 */
export async function calculateDailyProfit(
  strategy: { id: string; userId: string; startDate: Date; endDate: Date; status: StrategyStatus; minPercent: Prisma.Decimal; maxPercent: Prisma.Decimal; amount: Prisma.Decimal },
  periodStart: Date,
  periodEnd: Date
): Promise<DailyProfitResult | null> {
  const testMode = isTestMode();
  
  // Log mode on first call (can be optimized to log once per batch)
  // console.log("[ProfitEngine] Mode:", testMode ? "TEST (minutes)" : "PRODUCTION (days)");

  // 1. Check if strategy is active
  if (strategy.status !== StrategyStatus.ACTIVE) {
    return null;
  }

  // 2. Check if strategy was created BEFORE the current period
  // If strategy was created in the current period, it should NOT receive profit in this period
  // Profit should only be calculated starting from the NEXT period after creation
  if (strategy.startDate >= periodStart) {
    // Strategy was created during or after this period, skip profit for this period
    return null;
  }

  // 3. Check if strategy has ended (endDate < periodStart)
  if (strategy.endDate < periodStart) {
    // Strategy has already ended
    return null;
  }

  // 4. Check for idempotency: if profit was already generated for this period
  const existingProfitInPeriod = await db.strategyProfit.findFirst({
    where: {
      strategyId: strategy.id,
      type: ProfitType.PROFIT_DAY,
      date: {
        gte: periodStart,
        lt: periodEnd,
      },
    },
  });

  if (existingProfitInPeriod) {
    // Already processed for this period (idempotency)
    return null;
  }

  // 5. Calculate profit amount
  const dailyPercent = randomPercent(Number(strategy.minPercent), Number(strategy.maxPercent));
  const dailyProfit = Number(strategy.amount) * (dailyPercent / 100);

  // Round to 8 decimals
  const roundedPercent = Math.round(dailyPercent * 100) / 100;
  const roundedAmount = Math.round(dailyProfit * 100000000) / 100000000;

  return {
    strategyId: strategy.id,
    userId: strategy.userId,
    percent: roundedPercent,
    amount: roundedAmount,
    type: ProfitType.PROFIT_DAY,
    profitDate: periodStart, // Use period start as the profit date
  };
}

/**
 * Calculate multiplier bonus based on diversity score (Model #2)
 * Bonus depends on:
 * 1. Number of active strategies
 * 2. How evenly capital is distributed between them
 */
export async function calculateMultiplierBonus(
  userId: string,
  dailyProfitSum: number,
  activeStrategies?: Array<{ id: string; amount: number; status: StrategyStatus }>
): Promise<MultiplierBonus | null> {
  // Fetch active strategies if not provided
  let strategies = activeStrategies;
  if (!strategies) {
    const fetched = await db.strategy.findMany({
      where: {
        userId,
        status: StrategyStatus.ACTIVE,
      },
      select: {
        id: true,
        amount: true,
        status: true,
      },
    });
    strategies = fetched.map(s => ({
      id: s.id,
      amount: Number(s.amount),
      status: s.status,
    }));
  }

  // Filter only ACTIVE strategies
  const active = strategies.filter((s) => s.status === StrategyStatus.ACTIVE);

  // Need at least 2 active strategies for bonus
  if (active.length < 2) {
    return null;
  }

  // Calculate total invested
  const totalInvested = active.reduce((sum, s) => sum + Number(s.amount), 0);

  if (totalInvested <= 0) {
    return null;
  }

  // Calculate shares (proportion of each strategy in total)
  const shares = active.map((s) => Number(s.amount) / totalInvested);
  const largestShare = Math.max(...shares);

  // Calculate diversity score
  // If largestShare <= 0.6 → diversityScore = 1 (perfect diversification)
  // If largestShare >= 0.9 → diversityScore = 0 (all in one strategy)
  // Otherwise: linear interpolation
  let diversityScore: number;
  if (largestShare <= 0.6) {
    diversityScore = 1.0;
  } else if (largestShare >= 0.9) {
    diversityScore = 0.0;
  } else {
    diversityScore = 1 - (largestShare - 0.6) / (0.9 - 0.6);
  }

  // Clamp to 0..1
  diversityScore = Math.max(0, Math.min(1, diversityScore));

  // Base bonus percent based on number of active strategies (not categories)
  const activeStrategiesCount = active.length;
  let baseBonusPercent = 0;
  if (activeStrategiesCount >= 4) {
    baseBonusPercent = 28;
  } else if (activeStrategiesCount === 3) {
    baseBonusPercent = 21;
  } else if (activeStrategiesCount === 2) {
    baseBonusPercent = 8;
  }

  // If no base bonus, return null
  if (baseBonusPercent === 0) {
    return null;
  }

  // Calculate effective bonus percent
  const effectiveBonusPercent = baseBonusPercent * diversityScore;

  // Calculate bonus amount (even if < 1%, we still return the structure for display)
  const bonusAmount = dailyProfitSum * (effectiveBonusPercent / 100);

  return {
    baseBonusPercent: Math.round(baseBonusPercent * 100) / 100,
    diversityScore: Math.round(diversityScore * 10000) / 10000, // 4 decimal places
    effectiveBonusPercent: Math.round(effectiveBonusPercent * 100) / 100,
    bonusAmount: Math.round(bonusAmount * 100000000) / 100000000, // 8 decimal places for USDT
    activeStrategiesCount,
    largestShare: Math.round(largestShare * 10000) / 10000, // 4 decimal places
  };
}

/**
 * Process profits for all active strategies for the current period
 * 
 * @param asOf - Optional date to use for period calculation (defaults to now)
 * @returns Object with processed count and errors array
 */
export async function processDailyProfits(asOf?: Date): Promise<{
  processed: number;
  errors: string[];
}> {
  const now = asOf ?? new Date();
  const { periodStart, periodEnd } = getProfitPeriodBounds(now);
  const testMode = isTestMode();

  console.log(`[processDailyProfits] Environment: ${getEnvLabel()}, Mode: ${testMode ? "TEST (minutes)" : "PRODUCTION (days)"}`);
  console.log(`[processDailyProfits] periodStart=${periodStart.toISOString()} periodEnd=${periodEnd.toISOString()} PROFIT_PERIOD_MINUTES=${PROFIT_PERIOD_MINUTES}`);

  // Find active strategies that are active during this period
  // Filter: endDate >= periodStart (strategy hasn't ended before period starts)
  const activeStrategies = await db.strategy.findMany({
    where: {
      status: StrategyStatus.ACTIVE,
      endDate: {
        gte: periodStart, // Strategy must not have ended before period starts
      },
    },
  });

  console.log(`[processDailyProfits] Found ${activeStrategies.length} active strategies for period`);

  const errors: string[] = [];
  let processed = 0;

  // Group by user to calculate multipliers
  const userProfits = new Map<string, { userId: string; totalProfit: number; profits: DailyProfitResult[]; bonus?: MultiplierBonus }>();

  // Process each strategy
  for (const strategy of activeStrategies) {
    console.log(`[processDailyProfits] Processing strategy ${strategy.id} for user ${strategy.userId}`);
    try {
      const profit = await calculateDailyProfit(strategy, periodStart, periodEnd);
      if (!profit) {
        // Profit wasn't generated (already processed, not started, or ended)
        continue;
      }

      // Add to user profits map
      if (!userProfits.has(strategy.userId)) {
        userProfits.set(strategy.userId, {
          userId: strategy.userId,
          totalProfit: 0,
          profits: [],
        });
      }

      const userProfit = userProfits.get(strategy.userId)!;
      userProfit.profits.push(profit);
      userProfit.totalProfit += profit.amount;

      processed++;
      console.log(`[processDailyProfits] ✅ Generated profit for strategy ${strategy.id} (user ${strategy.userId}): ${profit.amount.toFixed(8)} USDT, percent=${profit.percent}%`);
    } catch (error) {
      errors.push(`Strategy ${strategy.id}: ${error instanceof Error ? error.message : "Unknown error"}`);
      console.error(`[processDailyProfits] Error processing strategy ${strategy.id}:`, error);
    }
  }

  console.log(`[processDailyProfits] Processing profits for ${userProfits.size} users`);

  // Process profits and multipliers for each user
  for (const [userId, userData] of userProfits.entries()) {
    console.log(`[processDailyProfits] Processing user ${userId}: ${userData.profits.length} profits, totalProfit=${userData.totalProfit.toFixed(8)}`);
    try {
      // Collect data for realtime events (after transaction commit)
      const eventsToEmit: Array<{
        type: "operation_created" | "wallet_balance_updated";
        userId: string;
        operationId?: string;
        operationType?: string;
        status?: string;
        walletId?: string;
        balance?: string;
        timestamp: string;
      }> = [];

      await db.$transaction(async (tx) => {
        // Create profit records and credit wallet
        console.log(`[processDailyProfits] Creating ${userData.profits.length} profit records for user ${userId}`);
        for (const profit of userData.profits) {
          console.log(`[processDailyProfits] Creating profit record for strategy ${profit.strategyId}, amount=${profit.amount.toFixed(8)}`);
          const profitRecord = await tx.strategyProfit.create({
            data: {
              strategyId: profit.strategyId,
              userId: profit.userId,
              date: profit.profitDate || periodStart, // Use period start as profit date
              percent: profit.percent,
              amount: profit.amount,
              type: profit.type,
            },
          });

          // Credit wallet
          const wallet = await tx.wallet.findUnique({
            where: { userId: profit.userId },
          });

          if (wallet) {
            // Get strategy info for description
            const strategy = await tx.strategy.findUnique({
              where: { id: profit.strategyId },
              select: { configId: true, amount: true },
            });

            let strategyName = "Strategy";
            if (strategy?.configId) {
              const config = await tx.strategyConfig.findUnique({
                where: { id: strategy.configId },
                select: { name: true },
              });
              if (config) {
                strategyName = config.name;
              }
            }

            const { transactionId } = await creditWallet(tx, {
              walletId: wallet.id,
              amount: profit.amount,
              type: TransactionType.STRATEGY_PROFIT,
              meta: {
                strategyId: profit.strategyId,
                profitId: profitRecord.id,
                strategyName: strategyName,
                percent: profit.percent,
                strategyAmount: strategy?.amount ? Number(strategy.amount) : null,
              },
            });
            const transaction = { id: transactionId };

            // Audit log for strategy profit (after transaction commit)
            // Note: We'll create audit log outside transaction to avoid blocking
            Promise.resolve().then(async () => {
              try {
                const { createAuditLog } = await import("@/shared/lib/audit-log");
                await createAuditLog({
                  action: "STRATEGY_PROFIT_CREDITED",
                  entityType: "STRATEGY_PROFIT",
                  entityId: profitRecord.id,
                  metadata: {
                    strategyId: profit.strategyId,
                    strategyName,
                    amount: profit.amount.toString(),
                    percent: profit.percent.toString(),
                    transactionId: transaction.id,
                  },
                  userId,
                });
              } catch (error) {
                console.error("[AuditLog] Failed to log strategy profit:", error);
              }
            });

            console.log(`[processDailyProfits] ✅ Created transaction for strategy ${profit.strategyId}, credited ${profit.amount.toFixed(8)} USDT to wallet`);
          }
        }

        // Calculate and apply multiplier bonus
        // Get active strategies for diversity calculation
        const activeStrategiesForBonusRaw = await tx.strategy.findMany({
          where: {
            userId,
            status: StrategyStatus.ACTIVE,
          },
          select: {
            id: true,
            amount: true,
            status: true,
          },
        });

        const activeStrategiesForBonus = activeStrategiesForBonusRaw.map(s => ({
          id: s.id,
          amount: Number(s.amount),
          status: s.status,
        }));

        const multiplier = await calculateMultiplierBonus(
          userId,
          userData.totalProfit,
          activeStrategiesForBonus
        );

        console.log(`[processDailyProfits] User ${userId}: totalProfit=${userData.totalProfit.toFixed(8)}, activeStrategies=${activeStrategiesForBonus.length}, multiplier=`, multiplier ? {
          effectiveBonusPercent: multiplier.effectiveBonusPercent,
          bonusAmount: multiplier.bonusAmount,
          baseBonusPercent: multiplier.baseBonusPercent,
          diversityScore: multiplier.diversityScore,
        } : null);

        // Save multiplier to userData for use after transaction
        if (multiplier) {
          userData.bonus = multiplier;
        }

        // Only award bonus if effectiveBonusPercent >= 1% (for actual payout)
        // But we still return multiplier structure for display even if < 1%
        // Check bonusAmount > 0 to ensure we have actual profit to apply bonus to
        if (multiplier && multiplier.effectiveBonusPercent >= 1 && multiplier.bonusAmount > 0 && userData.totalProfit > 0) {
          console.log(`[processDailyProfits] ✅ Awarding bonus to user ${userId}: ${multiplier.bonusAmount.toFixed(8)} USDT (${multiplier.effectiveBonusPercent}%)`);
          // Use first active strategy ID for bonus record (or null if model allows)
          const firstStrategyId = activeStrategiesForBonus.length > 0 
            ? activeStrategiesForBonus[0].id 
            : userData.profits[0]?.strategyId;

          await tx.strategyProfit.create({
            data: {
              strategyId: firstStrategyId || "", // Use first strategy ID for bonus record
              userId,
              date: periodStart, // Use period start as bonus date
              percent: multiplier.effectiveBonusPercent,
              amount: multiplier.bonusAmount,
              type: ProfitType.BONUS_MULTIPLIER,
            },
          });

          // Credit bonus to wallet
          const wallet = await tx.wallet.findUnique({
            where: { userId },
          });

          if (wallet) {
            // Get strategy IDs and names for description
            const strategyIds = activeStrategiesForBonus.map(s => s.id);
            const strategiesWithConfigs = await tx.strategy.findMany({
              where: { id: { in: strategyIds } },
              select: { id: true, configId: true },
            });

            const configIds = strategiesWithConfigs
              .map(s => s.configId)
              .filter((id): id is string => id !== null && id !== undefined);

            const configs = configIds.length > 0
              ? await tx.strategyConfig.findMany({
                  where: { id: { in: configIds } },
                  select: { id: true, name: true },
                })
              : [];

            const configsMap = new Map(configs.map(c => [c.id, c.name]));
            const strategyNames = strategiesWithConfigs
              .map(s => s.configId ? configsMap.get(s.configId) : null)
              .filter((name): name is string => name !== null);

            const { transactionId: bonusTxId } = await creditWallet(tx, {
              walletId: wallet.id,
              amount: multiplier.bonusAmount,
              type: TransactionType.STRATEGY_BONUS,
              meta: {
                baseBonusPercent: multiplier.baseBonusPercent,
                diversityScore: multiplier.diversityScore,
                effectiveBonusPercent: multiplier.effectiveBonusPercent,
                activeStrategiesCount: multiplier.activeStrategiesCount,
                largestShare: multiplier.largestShare,
                strategyIds: strategyIds,
                strategyNames: strategyNames,
              },
            });
            const bonusTransaction = { id: bonusTxId };

            // Audit log for strategy bonus (after transaction commit)
            Promise.resolve().then(async () => {
              try {
                const { createAuditLog } = await import("@/shared/lib/audit-log");
                await createAuditLog({
                  action: "STRATEGY_BONUS_CREDITED",
                  entityType: "STRATEGY_PROFIT",
                  entityId: firstStrategyId || "",
                  metadata: {
                    strategyIds: activeStrategiesForBonus.map(s => s.id),
                    strategyNames,
                    amount: multiplier.bonusAmount.toString(),
                    baseBonusPercent: multiplier.baseBonusPercent,
                    effectiveBonusPercent: multiplier.effectiveBonusPercent,
                    diversityScore: multiplier.diversityScore,
                    activeStrategiesCount: multiplier.activeStrategiesCount,
                    transactionId: bonusTransaction.id,
                  },
                  userId,
                });
              } catch (error) {
                console.error("[AuditLog] Failed to log strategy bonus:", error);
              }
            });
          }
        }
      });

      // Emit realtime events after transaction commit
      // Get final wallet balance for balance update event
      const finalWallet = await db.wallet.findUnique({
        where: { userId },
        select: { id: true, balanceUsdt: true },
      });

      if (finalWallet) {
        await Promise.all([
          // Emit operation_created events for each profit transaction
          ...userData.profits.map((profit) =>
            emitRealtimeEvent({
              type: "operation_created",
              userId,
              operationId: `profit_${profit.strategyId}_${Date.now()}`, // Approximate ID
              operationType: "strategy_profit",
              status: "completed",
              timestamp: new Date().toISOString(),
            })
          ),
          // Emit wallet balance update
          emitRealtimeEvent({
            type: "wallet_balance_updated",
            userId,
            walletId: finalWallet.id,
            balance: finalWallet.balanceUsdt.toString(),
            timestamp: new Date().toISOString(),
          }),
        ]);

        // Send Telegram notifications for strategy profits
        try {
          const { sendTelegramNotificationForOperation } = await import("@/modules/telegram/lib/telegram-notifications");
          await Promise.all(
            userData.profits.map(async (profit) => {
              // Get strategy name for notification
              const strategy = await db.strategy.findUnique({
                where: { id: profit.strategyId },
                include: {
                  // Get config for name
                },
              });
              let strategyName = "Strategy";
              if (strategy?.configId) {
                const config = await db.strategyConfig.findUnique({
                  where: { id: strategy.configId },
                  select: { name: true },
                });
                if (config) {
                  strategyName = config.name;
                }
              }

              await sendTelegramNotificationForOperation(userId, {
                id: `profit_${profit.strategyId}_${Date.now()}`,
                type: "strategy_profit",
                amount: profit.amount,
                status: "completed",
                createdAt: new Date(),
                strategyId: profit.strategyId,
                strategyName,
                profitType: profit.type,
              });
            })
          );
        } catch (error) {
          console.error("[Telegram] Failed to send strategy profit notifications:", error);
        }

        // Send Telegram notification for bonus if exists
        if (userData.bonus && userData.bonus.bonusAmount > 0) {
          try {
            const { sendTelegramNotificationForOperation } = await import("@/modules/telegram/lib/telegram-notifications");
            await sendTelegramNotificationForOperation(userId, {
              id: `bonus_${userId}_${Date.now()}`,
              type: "strategy_bonus",
              amount: userData.bonus.bonusAmount,
              status: "completed",
              createdAt: new Date(),
              effectiveBonusPercent: userData.bonus.effectiveBonusPercent,
              description: `Yield Multiplier Bonus (${userData.bonus.effectiveBonusPercent}%)`,
            });
          } catch (error) {
            console.error("[Telegram] Failed to send bonus notification:", error);
          }
        }
      }

      console.log(`[processDailyProfits] ✅ Successfully committed transaction for user ${userId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      errors.push(`User ${userId}: ${errorMessage}`);
      console.error(`[processDailyProfits] ❌ Transaction failed for user ${userId}:`, error);
      console.error(`[processDailyProfits] Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
    }
  }

  console.log(`[processDailyProfits] Summary: processed=${processed}, errors=${errors.length}, users=${userProfits.size}`);

  // Check and return principals for completed strategies
  await checkAndReturnPrincipals();

  // Automatically calculate referral payouts for the current period after processing profits
  // This ensures referral payouts are calculated immediately after profits are credited
  if (processed > 0) {
    try {
      console.log(`[processDailyProfits] Calculating referral payouts for period ${periodStart.toISOString()}...`);
      const { calculateReferralPayoutsForPeriod } = await import("@/modules/affiliate/lib/affiliate-service");
      const payoutCount = await calculateReferralPayoutsForPeriod(periodStart);
      console.log(`[processDailyProfits] ✅ Calculated ${payoutCount} referral payouts`);
    } catch (error) {
      console.error(`[processDailyProfits] ❌ Error calculating referral payouts:`, error);
      // Don't fail the entire process if referral payout calculation fails
    }
  }

  return { processed, errors };
}

/**
 * Check and return principals for strategies that reached endDate
 */
async function checkAndReturnPrincipals(): Promise<void> {
  const now = new Date();
  const completedStrategies = await db.strategy.findMany({
    where: {
      status: StrategyStatus.ACTIVE,
      endDate: {
        lte: now,
      },
    },
  });

  for (const strategy of completedStrategies) {
    try {
      const result = await db.$transaction(async (tx) => {
        // Check if principal already returned
        const existingReturn = await tx.strategyPrincipalReturn.findFirst({
          where: { strategyId: strategy.id },
        });

        if (existingReturn) {
          return; // Already processed
        }

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

        if (!wallet) {
          throw new Error(`Wallet not found for user ${strategy.userId}`);
        }

        await creditWallet(tx, {
          walletId: wallet.id,
          amount: strategy.amount,
          type: TransactionType.STRATEGY_PRINCIPAL_RETURN,
          meta: {
            strategyId: strategy.id,
          },
        });

        // Update strategy status
        await tx.strategy.update({
          where: { id: strategy.id },
          data: {
            status: StrategyStatus.COMPLETED,
          },
        });

        return { walletId: wallet.id, userId: strategy.userId };
      });

      // Recalculate referral turnover chain (strategy completed, no longer active)
      if (result) {
        try {
          const { recalculateTurnoverChainForUser } = await import("@/modules/affiliate/lib/affiliate-service");
          await recalculateTurnoverChainForUser(strategy.userId);
          console.log(`[Referral] Recalculated turnover chain for user ${strategy.userId} after strategy completion`);
        } catch (error) {
          console.error(`[Referral] Failed to recalculate turnover chain for user ${strategy.userId}:`, error);
          // Don't fail strategy completion if referral recalculation fails
        }
      }

      // Emit realtime events after transaction commit
      if (result) {
        const finalWallet = await db.wallet.findUnique({
          where: { id: result.walletId },
          select: { balanceUsdt: true },
        });

        if (finalWallet) {
          await Promise.all([
            emitRealtimeEvent({
              type: "operation_created",
              userId: result.userId,
              operationId: `principal_return_${strategy.id}`,
              operationType: "capital_return",
              status: "completed",
              timestamp: new Date().toISOString(),
            }),
            emitRealtimeEvent({
              type: "wallet_balance_updated",
              userId: result.userId,
              walletId: result.walletId,
              balance: finalWallet.balanceUsdt.toString(),
              timestamp: new Date().toISOString(),
            }),
          ]);
        }
      }
    } catch (error) {
      console.error(`Error returning principal for strategy ${strategy.id}:`, error);
    }
  }
}

