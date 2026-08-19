import { db } from "@/shared/lib/db";
import { StrategyStatus } from "@prisma/client";
import {
  getTotalEarned,
  getBonusEarned,
  getTVL,
} from "@/modules/strategies/lib/strategies-service";
import { getWalletWithSummary } from "@/modules/wallet/lib/wallet-service";
import { calculateMultiplierBonus } from "@/modules/strategies/lib/strategies-profit-engine";
import type { TerminalMetrics } from "@/modules/strategies/lib/strategies-types";

export type YieldMultiplayerInitial = {
  active: boolean;
  baseBonusPercent?: number;
  diversityScore?: number;
  effectiveBonusPercent?: number;
  activeStrategiesCount?: number;
  largestShare?: number;
  message?: string;
  hint?: string;
  strategyShares?: { strategyId: string; share: number }[];
};

export type TerminalInitialData = {
  metrics: TerminalMetrics;
  yieldMultiplayer: YieldMultiplayerInitial;
};

/**
 * Server-side aggregation of dashboard data.
 *
 * Inlining this in the page (rather than fetching `/api/strategies/metrics` from
 * the client) keeps the first paint per-user and out of any shared cache layer.
 * The same JSON endpoints stay around for client-side polling/refresh.
 */
export async function getTerminalInitialData(
  userId: string
): Promise<TerminalInitialData> {
  const [totalEarned, bonusEarned, tvl, wallet, activeStrategies] = await Promise.all([
    getTotalEarned(userId),
    getBonusEarned(userId),
    getTVL(userId),
    getWalletWithSummary(userId),
    db.strategy.findMany({
      where: { userId, status: StrategyStatus.ACTIVE },
      select: { id: true, amount: true, status: true },
    }),
  ]);

  const available = wallet.balance;
  const total = available + tvl;

  const referralsCount = await db.user.count({
    where: {
      referralParentId: userId,
      strategies: { some: { status: StrategyStatus.ACTIVE } },
    },
  });

  const metrics: TerminalMetrics = {
    total,
    tvl,
    available,
    earned: totalEarned,
    bonusEarned,
    withdrawn: 0,
    referralsCount,
  };

  const multiplier = await calculateMultiplierBonus(
    userId,
    0,
    activeStrategies.map((s) => ({
      id: s.id,
      amount: Number(s.amount),
      status: s.status,
    }))
  );

  let yieldMultiplayer: YieldMultiplayerInitial;
  if (!multiplier) {
    if (activeStrategies.length < 2) {
      yieldMultiplayer = {
        active: false,
        message: "No Yield Multiplayer yet",
        hint: `You have ${activeStrategies.length} active strateg${
          activeStrategies.length === 1 ? "y" : "ies"
        }. Open at least 2 strategies to activate the bonus.`,
      };
    } else {
      yieldMultiplayer = {
        active: false,
        message: "No Yield Multiplayer yet",
        hint: "Open at least 2 strategies and keep them balanced to activate the bonus.",
      };
    }
  } else {
    const isAwarded = multiplier.effectiveBonusPercent >= 1;
    const totalInvested = activeStrategies.reduce(
      (sum, s) => sum + Number(s.amount),
      0
    );
    const strategyShares = activeStrategies.map((s) => ({
      strategyId: s.id,
      share: totalInvested > 0 ? Number(s.amount) / totalInvested : 0,
    }));

    yieldMultiplayer = {
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
      hint: `Base bonus: ${multiplier.baseBonusPercent}%. Diversity score: ${Math.round(
        multiplier.diversityScore * 100
      )}%. The more balanced your strategies are, the higher the Yield Multiplayer.`,
    };
  }

  return { metrics, yieldMultiplayer };
}
