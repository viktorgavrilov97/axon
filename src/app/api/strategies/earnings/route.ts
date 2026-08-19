import { getCurrentUser } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";
import { authedJson } from "@/shared/lib/api/authed-response";
import { getProfitPeriodBounds, PROFIT_PERIOD_MINUTES } from "@/config/profit-period";
import { isTestMode } from "@/shared/lib/env";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export type PeriodType = "week" | "month" | "quarter" | "halfyear" | "all";

interface EarningsDataPoint {
  date: string; // ISO date string (period start, for grouping)
  investmentProfit: number; // PROFIT_DAY (without bonuses)
  yieldMultiplayerProfit: number; // BONUS_MULTIPLIER
  referralProfit: number; // REFERRAL_PAYOUT
  actualDate?: string; // ISO date string (actual time of the latest transaction in this period, for tooltip)
}

/**
 * Get period dates based on PROFIT_PERIOD_MINUTES
 * Automatically adapts to dev (minutes) or prod (days) mode
 */
function getPeriodDates(period: PeriodType): { start: Date; end: Date } {
  const now = new Date();
  const { periodEnd: currentPeriodEnd } = getProfitPeriodBounds(now);
  const end = currentPeriodEnd;
  
  // Calculate start based on PROFIT_PERIOD_MINUTES
  const periodMs = PROFIT_PERIOD_MINUTES * 60 * 1000;
  let periodsBack: number;

  switch (period) {
    case "week":
      // 7 days = 7 * 24 * 60 minutes = 10080 minutes
      // For dev (1 min): 7 * 24 * 60 = 10080 periods
      // For prod (1440 min): 7 periods
      periodsBack = Math.floor((7 * 24 * 60) / PROFIT_PERIOD_MINUTES);
      break;
    case "month":
      // ~30 days = 30 * 24 * 60 minutes = 43200 minutes
      periodsBack = Math.floor((30 * 24 * 60) / PROFIT_PERIOD_MINUTES);
      break;
    case "quarter":
      // ~90 days = 90 * 24 * 60 minutes = 129600 minutes
      periodsBack = Math.floor((90 * 24 * 60) / PROFIT_PERIOD_MINUTES);
      break;
    case "halfyear":
      // ~180 days = 180 * 24 * 60 minutes = 259200 minutes
      periodsBack = Math.floor((180 * 24 * 60) / PROFIT_PERIOD_MINUTES);
      break;
    case "all":
      return { start: new Date(0), end };
    default:
      periodsBack = Math.floor((7 * 24 * 60) / PROFIT_PERIOD_MINUTES);
  }

  const start = new Date(end.getTime() - periodsBack * periodMs);
  return { start, end };
}

/**
 * Group a date into its profit period using getProfitPeriodBounds
 * This ensures consistency with the profit calculation logic
 */
function getPeriodKey(date: Date): string {
  const { periodStart } = getProfitPeriodBounds(date);
  return periodStart.toISOString();
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return authedJson({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = (searchParams.get("period") || "all") as PeriodType;

    const { start, end } = getPeriodDates(period);

    // Get investment profits (PROFIT_DAY, excluding bonuses)
    // Note: end is exclusive (periodEnd), so we use lt instead of lte
    const investmentProfits = await db.strategyProfit.findMany({
      where: {
        userId: user.id,
        type: "PROFIT_DAY",
        date: {
          gte: start,
          lt: end,
        },
      },
      select: {
        date: true,
        amount: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    // Get yield multiplayer profits (BONUS_MULTIPLIER)
    // Note: end is exclusive (periodEnd), so we use lt instead of lte
    const yieldMultiplayerProfits = await db.strategyProfit.findMany({
      where: {
        userId: user.id,
        type: "BONUS_MULTIPLIER",
        date: {
          gte: start,
          lt: end,
        },
      },
      select: {
        date: true,
        amount: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    // Get referral payouts
    const wallet = await db.wallet.findUnique({
      where: { userId: user.id },
      include: {
        transactions: {
          where: {
            type: "REFERRAL_PAYOUT",
            createdAt: {
              gte: start,
              lt: end,
            },
          },
          select: {
            createdAt: true,
            amount: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    const referralPayouts = wallet?.transactions || [];

    // Group all data by profit period (using getProfitPeriodBounds for consistency)
    // This automatically adapts to dev (minutes) or prod (days) mode
    // We store both periodStart (for grouping) and actualDate (for tooltip display)
    const dataMap = new Map<string, EarningsDataPoint & { actualDate?: string }>();

    // Process investment profits
    for (const profit of investmentProfits) {
      const periodKey = getPeriodKey(profit.date);
      const existing = dataMap.get(periodKey) || {
        date: periodKey,
        investmentProfit: 0,
        yieldMultiplayerProfit: 0,
        referralProfit: 0,
        actualDate: profit.date.toISOString(), // Store actual date from database
      };
      existing.investmentProfit += Number(profit.amount);
      // Update actualDate to the latest one in the period (most recent)
      if (!existing.actualDate || new Date(profit.date) > new Date(existing.actualDate)) {
        existing.actualDate = profit.date.toISOString();
      }
      dataMap.set(periodKey, existing);
    }

    // Process yield multiplayer profits
    for (const profit of yieldMultiplayerProfits) {
      const periodKey = getPeriodKey(profit.date);
      const existing = dataMap.get(periodKey) || {
        date: periodKey,
        investmentProfit: 0,
        yieldMultiplayerProfit: 0,
        referralProfit: 0,
        actualDate: profit.date.toISOString(),
      };
      existing.yieldMultiplayerProfit += Number(profit.amount);
      if (!existing.actualDate || new Date(profit.date) > new Date(existing.actualDate)) {
        existing.actualDate = profit.date.toISOString();
      }
      dataMap.set(periodKey, existing);
    }

    // Process referral payouts
    for (const payout of referralPayouts) {
      const periodKey = getPeriodKey(payout.createdAt);
      const existing = dataMap.get(periodKey) || {
        date: periodKey,
        investmentProfit: 0,
        yieldMultiplayerProfit: 0,
        referralProfit: 0,
        actualDate: payout.createdAt.toISOString(),
      };
      existing.referralProfit += Number(payout.amount);
      if (!existing.actualDate || new Date(payout.createdAt) > new Date(existing.actualDate)) {
        existing.actualDate = payout.createdAt.toISOString();
      }
      dataMap.set(periodKey, existing);
    }

    // Convert to array and sort by date
    const data = Array.from(dataMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    console.log("[Earnings API] Found investment profits:", investmentProfits.length);
    console.log("[Earnings API] Found yield multiplayer profits:", yieldMultiplayerProfits.length);
    console.log("[Earnings API] Found referral payouts:", referralPayouts.length);
    console.log("[Earnings API] Grouped data points:", data.length);
    console.log("[Earnings API] Date range:", { start: start.toISOString(), end: end.toISOString() });
    console.log("[Earnings API] Sample data points:", data.slice(0, 3));

    // Calculate totals
    const totals = {
      investmentProfit: data.reduce((sum, d) => sum + d.investmentProfit, 0),
      yieldMultiplayerProfit: data.reduce((sum, d) => sum + d.yieldMultiplayerProfit, 0),
      referralProfit: data.reduce((sum, d) => sum + d.referralProfit, 0),
    };

    return authedJson({
      data,
      totals,
      period,
      profitPeriodMinutes: PROFIT_PERIOD_MINUTES,
      isTestMode: isTestMode(),
    });
  } catch (error) {
    console.error("Error getting earnings:", error);
    return authedJson(
      { error: error instanceof Error ? error.message : "Failed to get earnings" },
      { status: 500 }
    );
  }
}

