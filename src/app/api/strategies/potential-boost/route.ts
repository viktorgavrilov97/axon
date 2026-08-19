import { getCurrentUser } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";
import { StrategyStatus } from "@prisma/client";
import { calculateMultiplierBonus } from "@/modules/strategies/lib/strategies-profit-engine";
import { authedJson } from "@/shared/lib/api/authed-response";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Calculate potential Yield Multiplayer if user adds a new strategy
 * POST body: { amount: number, configId: string }
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return authedJson({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { amount, configId } = body;

    if (!amount || amount <= 0) {
      return authedJson({ error: "Invalid amount" }, { status: 400 });
    }

    // Get current active strategies
    const activeStrategies = await db.strategy.findMany({
      where: {
        userId: user.id,
        status: StrategyStatus.ACTIVE,
      },
      select: {
        id: true,
        amount: true,
        status: true,
      },
    });

    // Simulate adding new strategy
    const simulatedStrategies = [
      ...activeStrategies,
      {
        id: "simulated",
        amount: amount,
        status: StrategyStatus.ACTIVE,
      },
    ];

    // Calculate potential boost with simulated strategies
    // Use a placeholder daily profit sum for calculation
    const dailyProfitSum = 100; // Placeholder - actual calculation would use real daily profits
    const potentialMultiplier = await calculateMultiplierBonus(
      user.id,
      dailyProfitSum,
      simulatedStrategies.map(s => ({
        id: s.id,
        amount: typeof s.amount === 'number' ? s.amount : Number(s.amount),
        status: s.status,
      }))
    );

    // Calculate current boost (if any)
    const currentMultiplier = await calculateMultiplierBonus(
      user.id,
      dailyProfitSum,
      activeStrategies.map(s => ({
        id: s.id,
        amount: Number(s.amount),
        status: s.status,
      }))
    );

    // Calculate total invested after adding new strategy
    const currentTotal = activeStrategies.reduce((sum, s) => sum + Number(s.amount), 0);
    const newTotal = currentTotal + amount;

    // Calculate shares after adding new strategy
    const newShares = simulatedStrategies.map((s) => Number(s.amount) / newTotal);
    const newLargestShare = Math.max(...newShares);

    // Calculate diversity score for new portfolio
    let newDiversityScore: number;
    if (newLargestShare <= 0.6) {
      newDiversityScore = 1.0;
    } else if (newLargestShare >= 0.9) {
      newDiversityScore = 0.0;
    } else {
      newDiversityScore = 1 - (newLargestShare - 0.6) / (0.9 - 0.6);
    }
    newDiversityScore = Math.max(0, Math.min(1, newDiversityScore));

    // Calculate base bonus percent
    const newStrategyCount = simulatedStrategies.length;
    let newBaseBonusPercent = 0;
    if (newStrategyCount >= 4) {
      newBaseBonusPercent = 28;
    } else if (newStrategyCount === 3) {
      newBaseBonusPercent = 21;
    } else if (newStrategyCount === 2) {
      newBaseBonusPercent = 8;
    }

    const newEffectiveBonusPercent = newBaseBonusPercent * newDiversityScore;

    // Calculate recommended amount for better balance
    // To have largestShare <= 0.9, we need: max(amounts) / total <= 0.9
    // If current largest is from new strategy: amount / (currentTotal + amount) <= 0.9
    // amount <= 0.9 * (currentTotal + amount)
    // amount <= 0.9 * currentTotal + 0.9 * amount
    // 0.1 * amount <= 0.9 * currentTotal
    // amount <= 9 * currentTotal
    // If current largest is from existing: existingMax / (currentTotal + amount) <= 0.9
    // existingMax <= 0.9 * (currentTotal + amount)
    // existingMax <= 0.9 * currentTotal + 0.9 * amount
    // 0.9 * amount >= existingMax - 0.9 * currentTotal
    // amount >= (existingMax - 0.9 * currentTotal) / 0.9
    
    const existingMax = activeStrategies.length > 0 
      ? Math.max(...activeStrategies.map(s => Number(s.amount)))
      : 0;
    
    let recommendedAmount: number | null = null;
    let balanceHint: string | null = null;
    
    if (newStrategyCount >= 2 && newBaseBonusPercent > 0) {
      if (amount > existingMax) {
        // New strategy will be largest
        // For largestShare <= 0.9: amount / (currentTotal + amount) <= 0.9
        // amount <= 9 * currentTotal
        const maxForBalance = 9 * currentTotal;
        if (amount > maxForBalance) {
          recommendedAmount = maxForBalance;
          balanceHint = `Reduce to ~${Math.round(maxForBalance)} USDT for better balance`;
        }
      } else {
        // Existing strategy is largest
        // For largestShare <= 0.9: existingMax / (currentTotal + amount) <= 0.9
        // existingMax <= 0.9 * (currentTotal + amount)
        // amount >= (existingMax / 0.9) - currentTotal
        const minForBalance = (existingMax / 0.9) - currentTotal;
        if (amount < minForBalance && minForBalance > 0) {
          recommendedAmount = minForBalance;
          balanceHint = `Increase to ~${Math.round(minForBalance)} USDT for better balance`;
        }
      }
    }

    return authedJson({
      current: currentMultiplier
        ? {
            activeStrategiesCount: currentMultiplier.activeStrategiesCount,
            effectiveBonusPercent: currentMultiplier.effectiveBonusPercent,
            diversityScore: currentMultiplier.diversityScore,
            largestShare: currentMultiplier.largestShare,
            baseBonusPercent: currentMultiplier.baseBonusPercent,
          }
        : null,
      potential: {
        activeStrategiesCount: newStrategyCount,
        effectiveBonusPercent: Math.round(newEffectiveBonusPercent * 100) / 100,
        diversityScore: Math.round(newDiversityScore * 10000) / 10000,
        largestShare: Math.round(newLargestShare * 10000) / 10000,
        baseBonusPercent: newBaseBonusPercent,
        willActivate: newEffectiveBonusPercent >= 1,
        recommendedAmount,
        balanceHint,
      },
      improvement: currentMultiplier
        ? {
            effectiveBonusPercentChange:
              Math.round(newEffectiveBonusPercent * 100) / 100 -
              currentMultiplier.effectiveBonusPercent,
            diversityScoreChange:
              Math.round(newDiversityScore * 10000) / 10000 - currentMultiplier.diversityScore,
          }
        : {
            effectiveBonusPercentChange: Math.round(newEffectiveBonusPercent * 100) / 100,
            diversityScoreChange: Math.round(newDiversityScore * 10000) / 10000,
          },
    });
  } catch (error) {
    console.error("Error calculating potential boost:", error);
    return authedJson(
      { error: error instanceof Error ? error.message : "Failed to calculate potential boost" },
      { status: 500 }
    );
  }
}

