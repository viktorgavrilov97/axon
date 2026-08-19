import { getCurrentUser } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";
import { StrategyStatus } from "@prisma/client";
import { calculateMultiplierBonus } from "@/modules/strategies/lib/strategies-profit-engine";
import { authedJson } from "@/shared/lib/api/authed-response";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Get current Yield Multiplayer status for the user
 * Returns null if no boost is active
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return authedJson({ error: "Unauthorized" }, { status: 401 });
    }

    // Get active strategies
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

    // Calculate today's profit sum (for display purposes, use 0 if no profits today)
    // We'll calculate the potential boost based on a hypothetical daily profit
    // For actual boost calculation, we need the real dailyProfitSum
    // For now, we'll use 0 as a placeholder - the boost calculation will still work
    // to show the potential boost percentage
    const dailyProfitSum = 0; // This is just for calculating the boost structure

    // Calculate multiplier bonus (this will return null if conditions aren't met)
    const multiplier = await calculateMultiplierBonus(
      user.id,
      dailyProfitSum,
      activeStrategies.map(s => ({
        id: s.id,
        amount: Number(s.amount),
        status: s.status,
      }))
    );

    if (!multiplier) {
      // Check why boost is not active
      if (activeStrategies.length < 2) {
        return authedJson({
          active: false,
          message: "No Yield Multiplayer yet",
          hint: `You have ${activeStrategies.length} active strateg${activeStrategies.length === 1 ? 'y' : 'ies'}. Open at least 2 strategies to activate the bonus.`,
        });
      }
      return authedJson({
        active: false,
        message: "No Yield Multiplayer yet",
        hint: "Open at least 2 strategies and keep them balanced to activate the bonus.",
      });
    }

    // Check if bonus is active (effectiveBonusPercent >= 1%)
    // Note: bonusAmount will be 0 if dailyProfitSum is 0, but the boost is still "active" if effectiveBonusPercent >= 1
    const isAwarded = multiplier.effectiveBonusPercent >= 1;

    // Calculate total invested for share calculation
    const totalInvested = activeStrategies.reduce(
      (sum, s) => sum + Number(s.amount),
      0
    );

    // Calculate share for each strategy
    const strategyShares = activeStrategies.map((s) => ({
      strategyId: s.id,
      share: totalInvested > 0 ? Number(s.amount) / totalInvested : 0,
    }));

    return authedJson({
      active: isAwarded,
      baseBonusPercent: multiplier.baseBonusPercent,
      diversityScore: multiplier.diversityScore,
      effectiveBonusPercent: multiplier.effectiveBonusPercent,
      activeStrategiesCount: multiplier.activeStrategiesCount,
      largestShare: multiplier.largestShare,
      strategyShares,
      message: isAwarded 
        ? `You earn +${multiplier.effectiveBonusPercent.toFixed(2)}% on today's profit.`
        : `Potential boost: +${multiplier.effectiveBonusPercent.toFixed(2)}% (balance your portfolio to activate)`,
      hint: `Base bonus: ${multiplier.baseBonusPercent}%. Diversity score: ${Math.round(multiplier.diversityScore * 100)}%. The more balanced your strategies are, the higher the Yield Multiplayer.`,
    });
  } catch (error) {
    console.error("Error getting yield multiplayer status:", error);
    return authedJson(
      { error: error instanceof Error ? error.message : "Failed to get yield multiplayer status" },
      { status: 500 }
    );
  }
}

