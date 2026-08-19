import { db } from "@/shared/lib/db";
import { getUnlockedLevels, getLevelPercent, getNextLevelThreshold, AFFILIATE_LEVELS, getRequiredTurnover } from "./affiliate-config";
import { StrategyStatus, Prisma, TransactionType } from "@prisma/client";
import { emitRealtimeEvent } from "@/shared/lib/realtime-events";
import { getProfitPeriodBounds, PROFIT_PERIOD_MINUTES } from "@/config/profit-period";
import { isTestMode, getEnvLabel } from "@/shared/lib/env";
import { creditWallet } from "@/shared/lib/wallet/ledger";

type TxClient = Omit<
  Prisma.TransactionClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Sync referral levels for a user based on their turnover
 * This function ensures levels 1-3 are always unlocked and levels 4-14 are unlocked/closed based on turnover
 * 
 * @param tx - Prisma transaction client (or db)
 * @param userId - User ID
 * @param turnover - Current turnover value (as Prisma.Decimal or number)
 */
async function syncReferralLevelsForTurnover(
  tx: TxClient | typeof db,
  userId: string,
  turnover: Prisma.Decimal | number
): Promise<void> {
  const turnoverNumber = typeof turnover === "number" ? turnover : Number(turnover);
  
  // Process all 14 levels using AFFILIATE_LEVELS config
  for (const levelConfig of AFFILIATE_LEVELS) {
    const { level, requiredTurnover } = levelConfig;
    
    // Levels 1-3 are always unlocked (requiredTurnover === 0)
    // Levels 4-14 are unlocked if turnover >= requiredTurnover
    const isUnlocked = requiredTurnover === 0 || turnoverNumber >= requiredTurnover;

    const existing = await tx.referralLevel.findUnique({
      where: {
        userId_level: {
          userId,
          level,
        },
      },
    });

    if (existing) {
      // Update unlocked status
      // Set unlockedAt only when transitioning from locked to unlocked for the first time
      await tx.referralLevel.update({
        where: {
          userId_level: {
            userId,
            level,
          },
        },
        data: {
          unlocked: isUnlocked,
          unlockedAt: isUnlocked && !existing.unlockedAt ? new Date() : existing.unlockedAt,
        },
      });
    } else {
      // Create new level record
      await tx.referralLevel.create({
        data: {
          userId,
          level,
          unlocked: isUnlocked,
          unlockedAt: isUnlocked ? new Date() : null,
        },
      });
    }
  }
}

/**
 * Recalculate user turnover and update referral levels
 * 
 * Turnover calculation:
 * - Personal active strategies (status: "ACTIVE") - sum of investment amounts
 * - 1st level referrals' active strategies (status: "ACTIVE") - sum of investment amounts
 * 
 * Does NOT include:
 * - Deposits (top-ups to wallet)
 * - Wallet balance (available/unused balance)
 * - Income/profits
 * - History of withdrawals
 * - Reinvests without new package purchase
 */
export async function recalculateUserTurnover(userId: string): Promise<void> {
  // 1. Get user's active strategies (status "ACTIVE")
  // Only active strategies count towards turnover
  const userStrategies = await db.strategy.findMany({
    where: {
      userId,
      status: StrategyStatus.ACTIVE,
    },
    select: {
      amount: true,
    },
  });

  const userStrategySum = userStrategies.reduce(
    (sum, strategy) => sum + Number(strategy.amount),
    0
  );

  // 2. Get active strategies of 1st level referrals (only direct children)
  const referralChildren = await db.user.findMany({
    where: {
      referralParentId: userId,
    },
    select: {
      id: true,
      strategies: {
        where: {
          status: StrategyStatus.ACTIVE,
        },
        select: {
          amount: true,
        },
      },
    },
  });

  const referralStrategySum = referralChildren.reduce(
    (sum, child) =>
      sum +
      child.strategies.reduce(
        (childSum, strategy) => childSum + Number(strategy.amount),
        0
      ),
    0
  );

  // 3. Calculate total turnover
  // Turnover = personal active strategies + 1st line active strategies
  // Only active investments in strategies count, not deposits or wallet balance
  const totalTurnover = userStrategySum + referralStrategySum;

  // 5. Update user's referralTurnover and sync levels in a transaction
  await db.$transaction(async (tx) => {
    // Update user's referralTurnover
    await tx.user.update({
      where: { id: userId },
      data: {
        referralTurnover: totalTurnover,
      },
    });

    // Sync referral levels based on turnover
    await syncReferralLevelsForTurnover(tx, userId, totalTurnover);
  });
}

// Lock to prevent parallel execution
let isCalculating = false;

/**
 * Calculate referral payouts for a specific day
 * Called by cron job to process daily profits
 */
export async function calculateReferralPayoutsForDay(
  profitDay: Date
): Promise<number> {
  // Prevent parallel execution
  if (isCalculating) {
    console.log(`[ReferralPayout] Calculation already in progress, skipping duplicate call`);
    return 0;
  }

  isCalculating = true;
  try {
    console.log(`[ReferralPayout] Starting calculation for profit day: ${profitDay.toISOString()}`);
  
  // Normalize profitDay to start of day
  const dayStart = new Date(profitDay);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(profitDay);
  dayEnd.setHours(23, 59, 59, 999);

  // Determine query time range based on environment
  // TEST MODE: Use last 5 minutes for minute-based testing
  // PRODUCTION: Use the specific day (dayStart to dayEnd)
  const testMode = isTestMode();
  
  let queryStart: Date;
  let queryEnd: Date;
  
  if (testMode) {
    // Test mode: last 5 minutes + small buffer to catch profits created just now
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    // Add 10 seconds buffer to ensure we catch profits created in the same moment
    const bufferEnd = new Date(now.getTime() + 10 * 1000);
    queryStart = fiveMinutesAgo;
    queryEnd = bufferEnd;
  } else {
    // Production mode: specific day
    queryStart = dayStart;
    queryEnd = dayEnd;
  }
  
  console.log(`[ReferralPayout] Environment: ${getEnvLabel()}, Mode: ${testMode ? "TEST (1-min grouping)" : "PRODUCTION (daily grouping)"}`);
  console.log(`[ReferralPayout] Querying profits from ${queryStart.toISOString()} to ${queryEnd.toISOString()}`);

  // Get all strategy profits that haven't been processed for referral payouts yet
  // We'll check if a payout already exists for each profit
  const allProfits = await db.strategyProfit.findMany({
    where: {
      date: {
        gte: queryStart,
        lte: queryEnd,
      },
      type: "PROFIT_DAY", // Only daily profits, not bonuses
    },
    include: {
      strategy: {
        select: {
          userId: true,
        },
      },
    },
    orderBy: {
      date: "asc",
    },
  });

  console.log(`[ReferralPayout] Found ${allProfits.length} total strategy profits to check`);
  if (allProfits.length > 0) {
    console.log(`[ReferralPayout] Sample profit dates:`, allProfits.slice(0, 3).map(p => ({
      date: p.date.toISOString(),
      userId: p.strategy.userId,
      amount: Number(p.amount),
    })));
  } else {
    // Debug: check if there are any profits at all in the database
    const totalProfits = await db.strategyProfit.count({
      where: {
        type: "PROFIT_DAY",
      },
    });
    const recentProfits = await db.strategyProfit.findMany({
      where: {
        type: "PROFIT_DAY",
      },
      orderBy: {
        date: "desc",
      },
      take: 5,
      select: {
        date: true,
        amount: true,
      },
    });
    console.log(`[ReferralPayout] DEBUG: Total PROFIT_DAY profits in DB: ${totalProfits}`);
    console.log(`[ReferralPayout] DEBUG: Most recent 5 profits:`, recentProfits.map(p => ({
      date: p.date.toISOString(),
      amount: Number(p.amount),
    })));
  }

  // Filter out profits that have already been processed
  // We check for existing payouts by user and profit day (normalized to start of day for production, or minute for test)
  const profits: typeof allProfits = [];
  
  // Group by user to batch check
  const userProfitMap = new Map<string, typeof allProfits>();
  for (const profit of allProfits) {
    const userId = profit.strategy.userId;
    if (!userProfitMap.has(userId)) {
      userProfitMap.set(userId, []);
    }
    userProfitMap.get(userId)!.push(profit);
  }

  // Check each user's profits for existing payouts
  for (const [userId, userProfits] of userProfitMap) {
    // For idempotency: check if any payout exists for this user in the query time range
    // In production: check by day (profitDay normalized to start of day)
    // In test mode: check by minute window
    let hasExistingPayout = false;
    
    if (testMode) {
      // Test mode: check by minute window (1 minute precision)
      const profitDates = userProfits.map(p => p.date);
      const minDate = new Date(Math.min(...profitDates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...profitDates.map(d => d.getTime())));
      
      // Normalize to minute boundaries
      const windowStart = new Date(minDate);
      windowStart.setSeconds(0, 0);
      windowStart.setMilliseconds(0);
      
      const windowEnd = new Date(maxDate);
      windowEnd.setSeconds(59, 999);
      windowEnd.setMilliseconds(999);
      
      const existingPayouts = await db.referralPayout.findMany({
        where: {
          fromUserId: userId,
          profitDay: {
            gte: windowStart,
            lte: windowEnd,
          },
        },
        take: 1,
      });
      
      hasExistingPayout = existingPayouts.length > 0;
    } else {
      // Production mode: check by day (profitDay should be normalized to start of day)
      const existingPayouts = await db.referralPayout.findMany({
        where: {
          fromUserId: userId,
          profitDay: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
        take: 1,
      });
      
      hasExistingPayout = existingPayouts.length > 0;
    }

    if (!hasExistingPayout) {
      // No payout for this user in this time period, add all their profits
      profits.push(...userProfits);
      console.log(`[ReferralPayout] User ${userId} has ${userProfits.length} unprocessed profits`);
    } else {
      console.log(`[ReferralPayout] User ${userId} already has payout in this period, skipping ${userProfits.length} profits`);
    }
  }

  console.log(`[ReferralPayout] Found ${profits.length} unprocessed strategy profits to process`);

  if (profits.length === 0) {
    console.log(`[ReferralPayout] No profits to process, returning 0`);
    return 0;
  }

  let payoutCount = 0;

  // Group filtered profits by user and time period
  // IMPORTANT: dailyProfit = sum of StrategyProfit.amount (income/profit), NOT deposit amount
  // In production: group by day (all profits for a user in one day)
  // In test mode: group by minute (all profits for a user in one minute)
  const userProfitGroups = new Map<string, { profits: typeof profits; totalAmount: number; profitDay: Date }>();
  
  for (const profit of profits) {
    const userId = profit.strategy.userId;
    const profitDate = profit.date;
    
    // Normalize profit date for grouping
    // Production: normalize to start of day
    // Test mode: normalize to start of minute
    let normalizedProfitDay: Date;
    if (testMode) {
      normalizedProfitDay = new Date(profitDate);
      normalizedProfitDay.setSeconds(0, 0);
      normalizedProfitDay.setMilliseconds(0);
    } else {
      normalizedProfitDay = new Date(profitDate);
      normalizedProfitDay.setHours(0, 0, 0, 0);
      normalizedProfitDay.setMinutes(0, 0, 0);
    }
    
    // Create key: userId + normalized profit day
    const key = `${userId}_${normalizedProfitDay.getTime()}`;
    
    if (!userProfitGroups.has(key)) {
      userProfitGroups.set(key, {
        profits: [],
        totalAmount: 0,
        profitDay: normalizedProfitDay,
      });
    }
    
    const group = userProfitGroups.get(key)!;
    group.profits.push(profit);
    group.totalAmount += Number(profit.amount);
  }

  console.log(`[ReferralPayout] Processing payouts for ${userProfitGroups.size} user-time groups`);
  for (const [key, group] of userProfitGroups) {
    const userId = key.split('_')[0];
    console.log(`[ReferralPayout] User ${userId} group: ${group.profits.length} profits, total income: ${group.totalAmount}`);
  }

  // For each user-time group, process payouts
  for (const [key, group] of userProfitGroups) {
    const userId = key.split('_')[0];
    const dailyProfit = group.totalAmount;
    
    console.log(`[ReferralPayout] Processing payouts for user ${userId} with daily profit (income): ${dailyProfit} (from ${group.profits.length} profits)`);
    
    // Get user's referral parent chain
    const referralChain = await getReferralChain(userId, 14);
    console.log(`[ReferralPayout] Found referral chain of ${referralChain.length} levels for user ${userId}`);
    
    if (referralChain.length === 0) {
      console.log(`[ReferralPayout] User ${userId} has no referral parent, skipping`);
      continue;
    }

    // For each level in the chain
    for (let i = 0; i < referralChain.length; i++) {
      const parentUserId = referralChain[i];
      const level = i + 1; // Level 1 is first parent, level 2 is second, etc.

      console.log(`[ReferralPayout] Processing level ${level} for parent ${parentUserId} (from user ${userId})`);

      // Ensure levels are recalculated for parent (in case they weren't)
      await recalculateUserTurnover(parentUserId);
      console.log(`[ReferralPayout] Recalculated turnover for parent ${parentUserId}`);
      
      // Check if level is unlocked for parent
      // IMPORTANT: Levels 1-3 are always unlocked
      const isAlwaysUnlocked = level <= 3;
      const levelUnlocked = await db.referralLevel.findUnique({
        where: {
          userId_level: {
            userId: parentUserId,
            level,
          },
        },
        select: {
          unlocked: true,
        },
      });

      const isUnlocked = isAlwaysUnlocked || levelUnlocked?.unlocked;
      console.log(`[ReferralPayout] Level ${level} for parent ${parentUserId}: isAlwaysUnlocked=${isAlwaysUnlocked}, levelUnlocked=${levelUnlocked?.unlocked}, isUnlocked=${isUnlocked}`);
      if (!isUnlocked) {
        console.log(`[ReferralPayout] ⚠️ Skipping level ${level} for parent ${parentUserId} - level not unlocked`);
        continue; // Skip if level not unlocked
      }

      // Get level percentage
      const levelPercent = getLevelPercent(level);
      if (!levelPercent) {
        console.log(`[ReferralPayout] Level ${level} config not found, skipping`);
        continue; // Skip if level config not found
      }

      // Calculate payout amount
      // IMPORTANT: payoutAmount = dailyProfit (income) * levelPercent
      // Example: if dailyProfit = 10000 (income), levelPercent = 0.20 (20%), then payoutAmount = 2000
      // dailyProfit is the SUM of all StrategyProfit.amount for this user (their income/profit)
      const payoutAmount = Number((dailyProfit * levelPercent).toFixed(8)); // Round to 8 decimals
      
      console.log(
        `[ReferralPayout] Calculating payout for parent ${parentUserId} (level ${level}): ` +
        `dailyProfit (income)=${dailyProfit}, levelPercent=${levelPercent} (${(levelPercent * 100).toFixed(0)}%), ` +
        `payoutAmount=${payoutAmount}`
      );
      
      if (payoutAmount <= 0) {
        console.log(`[ReferralPayout] Payout amount is 0 or negative, skipping`);
        continue;
      }

      // Get parent user's wallet
      const parentWallet = await db.wallet.findUnique({
        where: { userId: parentUserId },
      });

      if (!parentWallet) {
        console.error(`[ReferralPayout] Wallet not found for user ${parentUserId}`);
        continue;
      }

      // Check if payout already exists for this exact combination (prevent duplicates)
      // Use normalized profitDay for idempotency check
      // This ensures one payout per (parentUserId, fromUserId, level, profitDay) combination
      const existingPayout = await db.referralPayout.findFirst({
        where: {
          parentUserId,
          fromUserId: userId,
          level,
          profitDay: group.profitDay, // Exact match on normalized profit day
        },
      });

      if (existingPayout) {
        console.log(
          `[ReferralPayout] Payout already exists for parent ${parentUserId}, from ${userId}, level ${level}, ` +
          `profitDay: ${group.profitDay.toISOString()}, skipping duplicate. ` +
          `Existing amount: ${existingPayout.amount}, new amount would be: ${payoutAmount}`
        );
        continue; // Skip duplicate payout
      }

      // Create payout record and credit balance in a transaction
      let payoutId: string | null = null;
      let finalBalance: number = Number(parentWallet.balanceUsdt);
      let payoutCreated = false;
      
      try {
        await db.$transaction(async (tx) => {
          // Create payout record
          // Use normalized profitDay from group (already normalized to start of day/minute)
          // The unique constraint on (parentUserId, fromUserId, level, profitDay) ensures idempotency
          const payout = await tx.referralPayout.create({
            data: {
              parentUserId,
              fromUserId: userId,
              level,
              amount: payoutAmount,
              profitDay: group.profitDay, // Use normalized profit day for idempotency
            },
          });
          payoutId = payout.id;
          payoutCreated = true;

          const { newBalance } = await creditWallet(tx, {
            walletId: parentWallet.id,
            amount: payoutAmount,
            type: TransactionType.REFERRAL_PAYOUT,
            meta: {
              referralPayoutId: payoutId,
              fromUserId: userId,
              level,
              profitDay: group.profitDay.toISOString(),
            },
          });
          finalBalance = Number(newBalance);

          console.log(
            `✅ [ReferralPayout] Credited ${payoutAmount.toString()} USDT to user ${parentUserId} ` +
            `(level ${level}, from user ${userId}, profit day: ${group.profitDay.toISOString().split("T")[0]})`
          );
        });
      } catch (error: any) {
        // Handle unique constraint violation (duplicate payout)
        if (error?.code === "P2002" || error?.message?.includes("Unique constraint")) {
          console.log(
            `[ReferralPayout] Duplicate payout prevented by DB constraint for parent ${parentUserId}, ` +
            `from ${userId}, level ${level}, profitDay: ${group.profitDay.toISOString()}`
          );
          continue; // Skip this payout, it already exists
        }
        throw error; // Re-throw other errors
      }

      // Emit realtime events for referral payout (only if payout was created successfully)
      if (payoutCreated && payoutId) {
        await Promise.all([
          emitRealtimeEvent({
            type: "operation_created",
            userId: parentUserId,
            operationId: `referral_payout_${parentUserId}_${userId}_${level}_${Date.now()}`,
            operationType: "referral_payout",
            status: "completed",
            timestamp: new Date().toISOString(),
          }),
          emitRealtimeEvent({
            type: "wallet_balance_updated",
            userId: parentUserId,
            walletId: parentWallet.id,
            balance: finalBalance.toString(),
            timestamp: new Date().toISOString(),
          }),
          // Emit affiliate dashboard update event
          emitRealtimeEvent({
            type: "affiliate_payout_created",
            userId: parentUserId,
            payoutId: payoutId,
            amount: payoutAmount.toString(),
            level,
            fromUserId: userId,
            timestamp: new Date().toISOString(),
          }),
        ]);

        // Send Telegram notification for referral payout
        try {
          const { sendTelegramNotificationForOperation } = await import("@/modules/telegram/lib/telegram-notifications");
          await sendTelegramNotificationForOperation(parentUserId, {
            id: payoutId,
            type: "referral_payout",
            amount: payoutAmount,
            status: "completed",
            createdAt: new Date(),
            description: `Referral reward (Level ${level})`,
          });
        } catch (error) {
          console.error("[Telegram] Failed to send referral payout notification:", error);
        }
      }

      payoutCount++;
    }
  }

    return payoutCount;
  } finally {
    isCalculating = false;
    console.log(`[ReferralPayout] Calculation completed, lock released`);
  }
}

/**
 * Calculate referral payouts for a specific period
 * 
 * This function processes all strategy profits for a given period and calculates
 * referral payouts for all parents in the referral chain (up to 14 levels).
 * 
 * @param periodStart - Start of the profit period (will be normalized using getProfitPeriodBounds)
 * @returns Number of payout records created
 */
export async function calculateReferralPayoutsForPeriod(periodStart: Date): Promise<number> {
  // Prevent parallel execution
  if (isCalculating) {
    console.log(`[ReferralPayout] Calculation already in progress, skipping duplicate call`);
    return 0;
  }

  isCalculating = true;
  try {
    // Normalize periodStart to the actual period bounds
    const { periodStart: normalizedStart, periodEnd } = getProfitPeriodBounds(periodStart);
    const testMode = isTestMode();

    console.log(`[ReferralPayout] Environment: ${getEnvLabel()}, Mode: ${testMode ? "TEST (1-min grouping)" : "PRODUCTION (daily grouping)"}`);
    console.log(`[ReferralPayout] Start period=${normalizedStart.toISOString()} PROFIT_PERIOD_MINUTES=${PROFIT_PERIOD_MINUTES}`);
    console.log(`[ReferralPayout] Period range: ${normalizedStart.toISOString()} to ${periodEnd.toISOString()}`);

    // 1. High-level idempotency check: check if period was already processed
    const existingPayoutsCount = await db.referralPayout.count({
      where: {
        profitDay: normalizedStart,
      },
    });

    if (existingPayoutsCount > 0) {
      console.log(`[ReferralPayout] Period ${normalizedStart.toISOString()} already has ${existingPayoutsCount} payouts, checking if complete...`);
      // Could add more sophisticated check here, but for now we'll proceed with fine-grained checks
    }

    // 2. Get all StrategyProfit records for this period
    const allProfits = await db.strategyProfit.findMany({
      where: {
        date: {
          gte: normalizedStart,
          lt: periodEnd, // Exclusive end
        },
        type: "PROFIT_DAY", // Only daily profits, not bonuses
      },
      include: {
        strategy: {
          select: {
            userId: true,
          },
        },
      },
      orderBy: {
        date: "asc",
      },
    });

    console.log(`[ReferralPayout] Strategy profits found: ${allProfits.length}`);

    if (allProfits.length === 0) {
      console.log(`[ReferralPayout] No profits to process, returning 0`);
      return 0;
    }

    // 3. Group profits by userId (total profit per user for this period)
    const usersWithProfit = new Map<string, number>();
    for (const profit of allProfits) {
      const userId = profit.strategy.userId;
      const currentTotal = usersWithProfit.get(userId) || 0;
      usersWithProfit.set(userId, currentTotal + Number(profit.amount));
    }

    console.log(`[ReferralPayout] Users with profit: ${usersWithProfit.size}`);

    // 4. Process payouts for each user with profit
    // Group payouts by parentUserId to create one transaction per parent per period
    const parentsWithPayouts = new Map<
      string,
      {
        totalAmount: number;
        breakdown: Array<{
          fromUserId: string;
          level: number;
          amount: number;
        }>;
      }
    >();

    let createdPayoutsCount = 0;

    for (const [userId, totalDailyProfit] of usersWithProfit.entries()) {
      console.log(`[ReferralPayout] Processing payouts for user ${userId} with total profit: ${totalDailyProfit}`);

      // Get referral chain
      const referralChain = await getReferralChain(userId, 14);
      console.log(`[ReferralPayout] Found referral chain of ${referralChain.length} levels for user ${userId}`);

      if (referralChain.length === 0) {
        console.log(`[ReferralPayout] User ${userId} has no referral parent, skipping`);
        continue;
      }

      // For each level in the chain
      for (let i = 0; i < referralChain.length; i++) {
        const parentUserId = referralChain[i];
        const level = i + 1; // Level 1 is first parent, level 2 is second, etc.

        console.log(`[ReferralPayout] Processing level ${level} for parent ${parentUserId} (from user ${userId})`);

        // Check idempotency: has this specific payout already been created?
        const existingPayout = await db.referralPayout.findFirst({
          where: {
            parentUserId,
            fromUserId: userId,
            level,
            profitDay: normalizedStart,
          },
        });

        if (existingPayout) {
          console.log(
            `[ReferralPayout] Payout already exists for parent ${parentUserId}, from ${userId}, level ${level}, ` +
            `profitDay: ${normalizedStart.toISOString()}, skipping duplicate`
          );
          continue;
        }

        // Recalculate turnover for parent
        await recalculateUserTurnover(parentUserId);
        console.log(`[ReferralPayout] Recalculated turnover for parent ${parentUserId}`);

        // Check if level is unlocked
        const isAlwaysUnlocked = level <= 3;
        const levelUnlocked = await db.referralLevel.findUnique({
          where: {
            userId_level: {
              userId: parentUserId,
              level,
            },
          },
          select: {
            unlocked: true,
          },
        });

        const isUnlocked = isAlwaysUnlocked || levelUnlocked?.unlocked;
        console.log(
          `[ReferralPayout] Level ${level} for parent ${parentUserId}: isAlwaysUnlocked=${isAlwaysUnlocked}, ` +
          `levelUnlocked=${levelUnlocked?.unlocked}, isUnlocked=${isUnlocked}`
        );

        if (!isUnlocked) {
          console.log(`[ReferralPayout] ⚠️ Skipping level ${level} for parent ${parentUserId} - level not unlocked`);
          continue;
        }

        // Get level percentage
        const levelPercent = getLevelPercent(level);
        if (!levelPercent) {
          console.log(`[ReferralPayout] Level ${level} config not found, skipping`);
          continue;
        }

        // Calculate payout amount
        const payoutAmount = Number((totalDailyProfit * levelPercent).toFixed(8));

        console.log(
          `[ReferralPayout] Calculating payout for parent ${parentUserId} (level ${level}): ` +
          `totalDailyProfit=${totalDailyProfit}, levelPercent=${levelPercent} (${(levelPercent * 100).toFixed(0)}%), ` +
          `payoutAmount=${payoutAmount}`
        );

        if (payoutAmount <= 0) {
          console.log(`[ReferralPayout] Payout amount is 0 or negative, skipping`);
          continue;
        }

        // Add to parent's payout breakdown
        if (!parentsWithPayouts.has(parentUserId)) {
          parentsWithPayouts.set(parentUserId, {
            totalAmount: 0,
            breakdown: [],
          });
        }

        const parentPayout = parentsWithPayouts.get(parentUserId)!;
        parentPayout.totalAmount += payoutAmount;
        parentPayout.breakdown.push({
          fromUserId: userId,
          level,
          amount: payoutAmount,
        });

        // Create ReferralPayout record (granular record for tracking)
        try {
          await db.referralPayout.create({
            data: {
              parentUserId,
              fromUserId: userId,
              level,
              amount: payoutAmount,
              profitDay: normalizedStart,
            },
          });
          createdPayoutsCount++;
        } catch (error: any) {
          // Handle unique constraint violation
          if (error?.code === "P2002" || error?.message?.includes("Unique constraint")) {
            console.log(
              `[ReferralPayout] Duplicate payout prevented by DB constraint for parent ${parentUserId}, ` +
              `from ${userId}, level ${level}, profitDay: ${normalizedStart.toISOString()}`
            );
            // Remove from breakdown since it wasn't actually created
            parentPayout.totalAmount -= payoutAmount;
            parentPayout.breakdown = parentPayout.breakdown.filter(
              (b) => !(b.fromUserId === userId && b.level === level)
            );
            continue;
          }
          throw error;
        }
      }
    }

    console.log(`[ReferralPayout] Created payouts: ${createdPayoutsCount}, parents with payouts: ${parentsWithPayouts.size}`);

    // 5. Create one transaction per parent for the period
    for (const [parentUserId, payoutData] of parentsWithPayouts.entries()) {
      if (payoutData.totalAmount <= 0 || payoutData.breakdown.length === 0) {
        continue;
      }

      const parentWallet = await db.wallet.findUnique({
        where: { userId: parentUserId },
      });

      if (!parentWallet) {
        console.error(`[ReferralPayout] Wallet not found for user ${parentUserId}`);
        continue;
      }

      // Check if transaction already exists for this parent and period
      const existingTransaction = await db.transaction.findFirst({
        where: {
          walletId: parentWallet.id,
          type: "REFERRAL_PAYOUT",
          meta: {
            path: ["periodStart"],
            equals: normalizedStart.toISOString(),
          },
        },
      });

      if (existingTransaction) {
        console.log(
          `[ReferralPayout] Transaction already exists for parent ${parentUserId} for period ${normalizedStart.toISOString()}, skipping`
        );
        continue;
      }

      try {
        await db.$transaction(async (tx) => {
          await creditWallet(tx, {
            walletId: parentWallet.id,
            amount: payoutData.totalAmount,
            type: TransactionType.REFERRAL_PAYOUT,
            meta: {
              periodStart: normalizedStart.toISOString(),
              breakdown: payoutData.breakdown.map((b) => ({
                fromUserId: b.fromUserId,
                level: b.level,
                amount: b.amount.toString(),
              })),
            },
          });

          console.log(
            `✅ [ReferralPayout] Credited ${payoutData.totalAmount.toString()} USDT to user ${parentUserId} ` +
            `for period ${normalizedStart.toISOString()} (${payoutData.breakdown.length} payouts)`
          );
        });

        // Emit realtime events
        const finalWallet = await db.wallet.findUnique({
          where: { id: parentWallet.id },
          select: { balanceUsdt: true },
        });

        if (finalWallet) {
          await Promise.all([
            emitRealtimeEvent({
              type: "operation_created",
              userId: parentUserId,
              operationId: `referral_payout_${parentUserId}_${normalizedStart.getTime()}`,
              operationType: "referral_payout",
              status: "completed",
              timestamp: new Date().toISOString(),
            }),
            emitRealtimeEvent({
              type: "wallet_balance_updated",
              userId: parentUserId,
              walletId: parentWallet.id,
              balance: finalWallet.balanceUsdt.toString(),
              timestamp: new Date().toISOString(),
            }),
            emitRealtimeEvent({
              type: "affiliate_payout_created",
              userId: parentUserId,
              amount: payoutData.totalAmount.toString(),
              periodStart: normalizedStart.toISOString(),
              timestamp: new Date().toISOString(),
            } as any), // Type assertion needed due to optional fields
          ]);

          // Send Telegram notification for referral payout
          try {
            const { sendTelegramNotificationForOperation } = await import("@/modules/telegram/lib/telegram-notifications");
            await sendTelegramNotificationForOperation(parentUserId, {
              id: `referral_payout_${parentUserId}_${normalizedStart.getTime()}`,
              type: "referral_payout",
              amount: payoutData.totalAmount,
              status: "completed",
              createdAt: new Date(),
              description: `Referral rewards for period`,
            });
          } catch (error) {
            console.error("[Telegram] Failed to send referral payout notification:", error);
          }
        }
      } catch (error) {
        console.error(`[ReferralPayout] Error creating transaction for parent ${parentUserId}:`, error);
        // Continue with other parents
      }
    }

    return createdPayoutsCount;
  } finally {
    isCalculating = false;
    console.log(`[ReferralPayout] Calculation completed, lock released`);
  }
}

/**
 * Get referral chain (parent IDs) up to maxLevels
 * Returns array of parent user IDs starting from direct parent (level 1)
 */
async function getReferralChain(
  userId: string,
  maxLevels: number
): Promise<string[]> {
  const chain: string[] = [];
  let currentUserId: string | null = userId;

  console.log(`[getReferralChain] Starting chain lookup for user ${userId}, maxLevels=${maxLevels}`);

  for (let i = 0; i < maxLevels; i++) {
    const user: { referralParentId: string | null } | null = await db.user.findUnique({
      where: { id: currentUserId! },
      select: { referralParentId: true },
    });

    if (!user || !user.referralParentId) {
      console.log(`[getReferralChain] No parent found for user ${currentUserId}, chain length: ${chain.length}`);
      break;
    }

    console.log(`[getReferralChain] Found parent ${user.referralParentId} for user ${currentUserId} (level ${i + 1})`);
    chain.push(user.referralParentId);
    currentUserId = user.referralParentId;
  }

  console.log(`[getReferralChain] Final chain for user ${userId}: ${chain.length} levels: [${chain.join(', ')}]`);
  return chain;
}

/**
 * Get referral parents chain (going up the referral tree)
 * Returns array of parent user IDs starting from direct parent (level 1)
 * This is the same as getReferralChain but with a clearer name for upward traversal
 */
async function getReferralParentsChain(
  userId: string,
  maxLevels: number = 14
): Promise<string[]> {
  return getReferralChain(userId, maxLevels);
}

/**
 * Recalculate turnover for a user and all their parents in the referral chain
 * 
 * This is called when a user's active packages change (deposit confirmed, strategy created/completed, etc.)
 * because the parent's turnover depends on their 1st line referrals' active packages.
 * 
 * @param userId - User whose packages changed
 */
export async function recalculateTurnoverChainForUser(userId: string): Promise<void> {
  // 1. Recalculate turnover for the user whose packages changed
  await recalculateUserTurnover(userId);

  // 2. Find all parents in the referral chain (up to 14 levels)
  const parentIds = await getReferralParentsChain(userId, 14);

  // 3. Recalculate turnover for each parent
  // (because their turnover includes 1st line referrals' active packages)
  for (const parentId of parentIds) {
    await recalculateUserTurnover(parentId);
  }
}

/**
 * Check if user has at least one active personal package
 * Per TZ: "Нельзя начислять партнёрку, если у пользователя нет личного активного депозита или стратегии"
 * 
 * Active packages = deposits (status "paid") OR strategies (status "ACTIVE")
 * This is a requirement for receiving referral payouts.
 */
export async function hasActivePersonalPackage(userId: string): Promise<boolean> {
  // Check for active deposits
  const activeDeposit = await db.deposit.findFirst({
    where: {
      userId,
      status: "paid", // Only confirmed deposits count as "active"
    },
  });

  if (activeDeposit) {
    console.log(`[hasActivePersonalPackage] User ${userId} has active deposit: ${activeDeposit.id}`);
    return true;
  }

  // Check for active strategies
  const activeStrategy = await db.strategy.findFirst({
    where: {
      userId,
      status: StrategyStatus.ACTIVE,
    },
  });

  const hasActive = !!activeStrategy;
  console.log(`[hasActivePersonalPackage] User ${userId} has active strategy: ${hasActive}${activeStrategy ? ` (${activeStrategy.id})` : ''}`);
  return hasActive;
}

/**
 * @deprecated Use hasActivePersonalPackage instead
 * Legacy function name kept for backward compatibility
 */
async function hasActiveDeposit(userId: string): Promise<boolean> {
  return hasActivePersonalPackage(userId);
}


