"use server";

import { getCurrentUser } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";
import { buildReferralLink } from "@/shared/lib/referral-link";
import { getNextLevelThreshold, getLevelPercent, BASE_LEVELS, TURNOVER_LEVELS } from "../lib/affiliate-config";
import { getUserDisplayName } from "@/shared/lib/user-display";
import { generateReferralCode } from "@/shared/lib/referral-code";
import { recalculateUserTurnover } from "../lib/affiliate-service";

export interface AffiliateDashboard {
  // Existing fields
  referralCode: string;
  referralLink: string;
  turnover: number;
  nextLevelTurnover: number | null;
  openedLevels: number[];
  activeReferralsCount: number;
  totalReferralsCount: number;
  todayEarnings: number;
  monthEarnings: number;
  totalEarnings: number;
  
  // New fields
  levels: Array<{
    level: number;
    percent: number; // 0.2 = 20%
    requiredTurnover: number; // 0 for levels 1-3
    status: 'open' | 'locked';
  }>;
  
  firstLineReferrals: Array<{
    id: string;
    email: string;
    name: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    avatarColor: string | null;
    telegramUsername: string | null;
    active: boolean;
    personalTurnover: number;
    teamTurnover: number;
    openedLevelsCount: number;
    registeredAt: Date;
    children?: Array<{
      id: string;
      email: string;
      name: string | null;
      displayName: string | null;
      avatarUrl: string | null;
      avatarColor: string | null;
      telegramUsername: string | null;
      active: boolean;
      personalTurnover: number;
      teamTurnover: number;
      openedLevelsCount: number;
      registeredAt: Date;
      children?: Array<{
        id: string;
        email: string;
        name: string | null;
        displayName: string | null;
        avatarUrl: string | null;
        avatarColor: string | null;
        telegramUsername: string | null;
        active: boolean;
        personalTurnover: number;
        teamTurnover: number;
        openedLevelsCount: number;
        registeredAt: Date;
        children?: Array<any>; // Recursive type for deeper levels
      }>;
    }>;
  }>;
  
  networkLevels: Array<{
    level: number; // 1..14
    totalUsers: number;
    activeUsers: number;
    teamTurnover: number; // Total turnover from this level
    todayEarningsFromLevel: number;
    monthEarningsFromLevel: number;
  }>;
  
  recentPayouts: Array<{
    id: string;
    createdAt: Date;
    amount: number;
    level: number;
    fromUserId: string;
    fromUserEmail: string;
    fromUserName: string | null;
    fromUserDisplayName: string | null;
    fromUserReferralCode: string | null;
  }>;
}

export async function getAffiliateDashboard(): Promise<
  AffiliateDashboard | { error: string }
> {
  const user = await getCurrentUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  let userData = await db.user.findUnique({
    where: { id: user.id },
    select: {
      referralCode: true,
      referralTurnover: true,
      referralLevels: {
        where: { unlocked: true },
        select: { level: true },
        orderBy: { level: "asc" },
      },
      referralChildren: {
        select: {
          id: true,
          email: true,
          name: true,
          displayName: true,
          avatarUrl: true,
          avatarColor: true,
          createdAt: true,
          referralCode: true,
        },
      },
      referralPayoutsAsParent: {
        select: {
          id: true,
          createdAt: true,
          fromUser: {
            select: {
              id: true,
              email: true,
              displayName: true,
              name: true,
              referralCode: true,
            },
          },
          level: true,
          amount: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  if (!userData) {
    return { error: "User not found" };
  }

  // Generate referral code if missing
  if (!userData.referralCode) {
    let newReferralCode: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      newReferralCode = generateReferralCode();
      attempts++;

      // Check if code already exists
      const existing = await db.user.findUnique({
        where: { referralCode: newReferralCode },
        select: { id: true },
      });

      if (!existing) {
        break; // Code is unique
      }

      if (attempts >= maxAttempts) {
        return { error: "Failed to generate unique referral code" };
      }
    } while (true);

    // Update user with referral code
    await db.user.update({
      where: { id: user.id },
      data: { referralCode: newReferralCode },
    });

    // Update userData with new code
    userData.referralCode = newReferralCode;
  }

  // Calculate earnings
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todayPayouts, monthPayouts, totalPayouts] = await Promise.all([
    db.referralPayout.aggregate({
      where: {
        parentUserId: user.id,
        createdAt: {
          gte: todayStart,
        },
      },
      _sum: {
        amount: true,
      },
    }),
    db.referralPayout.aggregate({
      where: {
        parentUserId: user.id,
        createdAt: {
          gte: monthStart,
        },
      },
      _sum: {
        amount: true,
      },
    }),
    db.referralPayout.aggregate({
      where: {
        parentUserId: user.id,
      },
      _sum: {
        amount: true,
      },
    }),
  ]);

  // Recalculate turnover and levels if needed (ensure data is fresh)
  // This ensures levels are always up-to-date based on current active strategies
  await recalculateUserTurnover(user.id);
  
  // Fetch updated data after recalculation
  const updatedUserData = await db.user.findUnique({
    where: { id: user.id },
    select: {
      referralTurnover: true,
      referralLevels: {
        where: { unlocked: true },
        select: { level: true },
        orderBy: { level: "asc" },
      },
    },
  });

  const turnover = Number(updatedUserData?.referralTurnover || 0);
  const nextLevelTurnover = getNextLevelThreshold(turnover);
  const openedLevels = updatedUserData?.referralLevels.map((l) => l.level) || [];
  
  const todayEarnings = Number(todayPayouts._sum.amount || 0);
  const monthEarnings = Number(monthPayouts._sum.amount || 0);
  const totalEarnings = Number(totalPayouts._sum.amount || 0);

  // Build levels array with status
  // IMPORTANT: Levels 1-3 are ALWAYS open (per TZ)
  const levels = [];
  for (let level = 1; level <= 14; level++) {
    const percent = getLevelPercent(level);
    if (percent === null) continue;

    let requiredTurnover = 0;
    if (level > 3) {
      // Find the turnover threshold for this level
      for (const config of TURNOVER_LEVELS) {
        if (config.levels.some((l) => l.level === level)) {
          requiredTurnover = config.minTurnover;
          break;
        }
      }
    }

    // Levels 1-3 are always open (per TZ requirement)
    const isAlwaysOpen = level <= 3;
    const isUnlocked = isAlwaysOpen || openedLevels.includes(level);

    levels.push({
      level,
      percent,
      requiredTurnover,
      status: isUnlocked ? 'open' as const : 'locked' as const,
    });
  }

  // Load all referral children recursively up to 14 levels
  // First, get all user IDs in the referral tree
  const firstLineUserIds = userData.referralChildren.map(c => c.id);
  const allReferralUserIds: string[] = [];
  
  // Collect all referral user IDs up to 14 levels
  let currentLevelUserIds = firstLineUserIds;
  for (let level = 1; level <= 14; level++) {
    if (currentLevelUserIds.length === 0) break;
    allReferralUserIds.push(...currentLevelUserIds);
    
    const nextLevelUsers = await db.user.findMany({
      where: {
        referralParentId: { in: currentLevelUserIds },
      },
      select: { id: true },
    });
    currentLevelUserIds = nextLevelUsers.map(u => u.id);
  }

  // Load all referral users with their data in one query
  const allReferralUsers = allReferralUserIds.length > 0 ? await db.user.findMany({
    where: { id: { in: allReferralUserIds } },
    select: {
      id: true,
      email: true,
      name: true,
      displayName: true,
      avatarUrl: true,
      avatarColor: true,
      telegramUsername: true,
      createdAt: true,
      referralCode: true,
      referralParentId: true,
      deposits: {
        where: { status: "paid" },
        select: {
          id: true,
          amountUsdt: true,
        },
      },
      strategies: {
        where: { status: "ACTIVE" },
        select: {
          id: true,
          amount: true,
        },
      },
      referralLevels: {
        where: { unlocked: true },
        select: { level: true },
      },
    },
  }) : [];

  // Create a map for quick lookup
  const referralUsersMap = new Map(allReferralUsers.map(u => [u.id, u]));

  // Recursive function to build referral tree from flat data
  const buildReferralTree = (userId: string, visited = new Set<string>()): any | null => {
    // Prevent infinite loops
    if (visited.has(userId)) {
      return null;
    }
    visited.add(userId);

    const user = referralUsersMap.get(userId);
    if (!user) return null;

    const userWithStrategies = user as typeof user & { strategies?: Array<{ id: string; amount: any }> };
    
    // Personal turnover = only active strategies (not deposits)
    const personalStrategySum = (userWithStrategies.strategies || []).reduce(
      (sum, s) => sum + Number(s.amount),
      0
    );
    
    const personalTurnover = personalStrategySum;
    
    // Active = has active strategies (not deposits)
    const hasActiveStrategy = (userWithStrategies.strategies?.length || 0) > 0;

    // Find all children of this user
    const childrenData = allReferralUsers
      .filter(u => u.referralParentId === userId)
      .map(child => buildReferralTree(child.id, new Set(visited)))
      .filter(child => child !== null);

    // Team turnover = sum of all children's personal turnovers + their team turnovers (recursive)
    const teamTurnover = childrenData.reduce(
      (sum: number, child: any) => sum + child.personalTurnover + (child.teamTurnover || 0),
      0
    );

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      avatarColor: user.avatarColor,
      telegramUsername: user.telegramUsername,
      active: hasActiveStrategy,
      personalTurnover,
      teamTurnover,
      openedLevelsCount: user.referralLevels?.length || 0,
      registeredAt: user.createdAt,
      children: childrenData.length > 0 ? childrenData : undefined,
    };
  };

  // Build first line referrals
  const firstLineReferrals = await Promise.all(
    userData.referralChildren.map(async (child) => {
      return buildReferralTree(child.id);
    })
  );

  // Count total referrals across all levels
  const totalReferralsCount = allReferralUsers.length;

  // Count active referrals across all levels
  // Active = has active strategies (not deposits)
  const activeReferralsCount = allReferralUsers.filter(
    (user) => (user as any).strategies?.length > 0
  ).length;

  // Build network levels (aggregate by level)
  // Helper function to get users at a specific level recursively
  async function getUsersAtLevel(startUsers: string[], targetLevel: number): Promise<string[]> {
    if (targetLevel === 1) {
      return startUsers;
    }
    
    let currentLevelUsers = startUsers;
    for (let i = 1; i < targetLevel; i++) {
      if (currentLevelUsers.length === 0) break;
      
      const nextLevelUsers = await db.user.findMany({
        where: {
          referralParentId: { in: currentLevelUsers },
        },
        select: { id: true },
      });
      currentLevelUsers = nextLevelUsers.map(u => u.id);
    }
    return currentLevelUsers;
  }

  const networkLevels = [];
  
  // Calculate team turnover for all levels in parallel (optimized)
  const levelUserIdsPromises = [];
  for (let level = 1; level <= 14; level++) {
    if (firstLineUserIds.length > 0) {
      levelUserIdsPromises.push(getUsersAtLevel(firstLineUserIds, level));
    } else {
      levelUserIdsPromises.push(Promise.resolve([]));
    }
  }
  const allLevelUserIds = await Promise.all(levelUserIdsPromises);
  
  // Get all deposits for all levels in one query
  const allLevelUserIdsFlat = allLevelUserIds.flat();
  const allDeposits = allLevelUserIdsFlat.length > 0
    ? await db.deposit.findMany({
        where: {
          userId: { in: allLevelUserIdsFlat },
          status: "paid",
        },
        select: {
          userId: true,
          amountUsdt: true,
        },
      })
    : [];
  
  // Create map of userId -> deposits
  const depositsByUserId = new Map<string, number>();
  for (const deposit of allDeposits) {
    const current = depositsByUserId.get(deposit.userId) || 0;
    depositsByUserId.set(deposit.userId, current + Number(deposit.amountUsdt));
  }
  
  for (let level = 1; level <= 14; level++) {
    // Get payouts for this level
    const levelPayouts = await db.referralPayout.findMany({
      where: {
        parentUserId: user.id,
        level,
      },
      select: {
        fromUserId: true,
        createdAt: true,
        amount: true,
      },
    });

    const uniqueUsers = new Set(levelPayouts.map((p) => p.fromUserId));
    const activeUsersSet = new Set(
      levelPayouts
        .filter((p) => {
          const payoutDate = new Date(p.createdAt);
          return payoutDate >= todayStart;
        })
        .map((p) => p.fromUserId)
    );

    const todayEarningsFromLevel = levelPayouts
      .filter((p) => {
        const payoutDate = new Date(p.createdAt);
        return payoutDate >= todayStart;
      })
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const monthEarningsFromLevel = levelPayouts
      .filter((p) => {
        const payoutDate = new Date(p.createdAt);
        return payoutDate >= monthStart;
      })
      .reduce((sum, p) => sum + Number(p.amount), 0);

    // Calculate team turnover for this level (only active strategies, not deposits)
    const levelUserIds = allLevelUserIds[level - 1];
    
    // Get active strategies for this level
    const levelStrategies = levelUserIds.length > 0
      ? await db.strategy.findMany({
          where: {
            userId: { in: levelUserIds },
            status: "ACTIVE",
          },
          select: {
            amount: true,
          },
        })
      : [];
    
    const levelStrategySum = levelStrategies.reduce(
      (sum, strategy) => sum + Number(strategy.amount),
      0
    );
    
    // Team turnover = only active strategies (not deposits)
    const teamTurnover = levelStrategySum;

    networkLevels.push({
      level,
      totalUsers: uniqueUsers.size,
      activeUsers: activeUsersSet.size,
      teamTurnover,
      todayEarningsFromLevel,
      monthEarningsFromLevel,
    });
  }

  // Build recent payouts
  const recentPayouts = userData.referralPayoutsAsParent.map((payout) => {
    const fromUser = payout.fromUser;
    return {
      id: payout.id,
      createdAt: payout.createdAt,
      amount: Number(payout.amount),
      level: payout.level,
      fromUserId: fromUser.id,
      fromUserEmail: fromUser.email,
      fromUserName: fromUser.name,
      fromUserDisplayName: getUserDisplayName({
        email: fromUser.email,
        name: fromUser.name,
        displayName: fromUser.displayName,
      }),
      fromUserReferralCode: fromUser.referralCode,
    };
  });

  return {
    referralCode: userData.referralCode,
    referralLink: buildReferralLink(userData.referralCode),
    turnover,
    nextLevelTurnover,
    openedLevels,
    activeReferralsCount,
    totalReferralsCount,
    todayEarnings,
    monthEarnings,
    totalEarnings,
    levels,
    firstLineReferrals,
    networkLevels,
    recentPayouts,
  };
}

