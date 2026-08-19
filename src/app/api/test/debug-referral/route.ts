import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/lib/db";
import { StrategyStatus } from "@prisma/client";
import { hasActivePersonalPackage } from "@/modules/affiliate/lib/affiliate-service";

/**
 * Debug endpoint to check referral status
 * GET /api/test/debug-referral?userId=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get("userId");
    
    if (!userId) {
      return NextResponse.json({ error: "userId parameter required" }, { status: 400 });
    }

    // Get user info
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        referralCode: true,
        referralParentId: true,
        referralTurnover: true,
        referralLevels: {
          select: {
            level: true,
            unlocked: true,
            unlockedAt: true,
          },
          orderBy: { level: "asc" },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check active deposits
    const activeDeposits = await db.deposit.findMany({
      where: {
        userId,
        status: "paid",
      },
      select: {
        id: true,
        amountUsdt: true,
        status: true,
      },
    });

    // Check active strategies
    const activeStrategies = await db.strategy.findMany({
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

    // Check if has active package
    const hasActivePackage = await hasActivePersonalPackage(userId);

    // Get referral children
    const referralChildren = await db.user.findMany({
      where: {
        referralParentId: userId,
      },
      select: {
        id: true,
        email: true,
        referralCode: true,
        strategies: {
          where: {
            status: StrategyStatus.ACTIVE,
          },
          select: {
            id: true,
            amount: true,
          },
        },
      },
    });

    // Get referral parent
    let referralParent = null;
    if (user.referralParentId) {
      referralParent = await db.user.findUnique({
        where: { id: user.referralParentId },
        select: {
          id: true,
          email: true,
          referralCode: true,
        },
      });
    }

    // Get recent referral payouts
    const recentPayouts = await db.referralPayout.findMany({
      where: {
        parentUserId: userId,
      },
      select: {
        id: true,
        level: true,
        amount: true,
        profitDay: true,
        createdAt: true,
        fromUser: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    // Get recent strategy profits (to see if there are profits to process)
    const recentProfits = await db.strategyProfit.findMany({
      where: {
        strategy: {
          userId: {
            in: referralChildren.map(c => c.id),
          },
        },
        type: "PROFIT_DAY",
        date: {
          gte: new Date(Date.now() - 10 * 60 * 1000), // Last 10 minutes
        },
      },
      select: {
        id: true,
        amount: true,
        date: true,
        strategy: {
          select: {
            userId: true,
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        date: "desc",
      },
      take: 10,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        referralCode: user.referralCode,
        referralParentId: user.referralParentId,
        referralTurnover: Number(user.referralTurnover),
        hasActivePackage,
        activeDeposits: activeDeposits.length,
        activeStrategies: activeStrategies.length,
        referralLevels: user.referralLevels,
      },
      activeDeposits,
      activeStrategies,
      referralParent,
      referralChildren: referralChildren.map(child => ({
        id: child.id,
        email: child.email,
        referralCode: child.referralCode,
        activeStrategies: child.strategies.length,
        strategiesTotal: child.strategies.reduce((sum, s) => sum + Number(s.amount), 0),
      })),
      recentPayouts: recentPayouts.map(p => ({
        id: p.id,
        level: p.level,
        amount: Number(p.amount),
        profitDay: p.profitDay,
        createdAt: p.createdAt,
        fromUser: p.fromUser,
      })),
      recentProfits: recentProfits.map(p => ({
        id: p.id,
        amount: Number(p.amount),
        date: p.date,
        fromUser: p.strategy.user.email,
        fromUserId: p.strategy.userId,
      })),
    });
  } catch (error) {
    console.error("Error in debug-referral route:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

