import { NextRequest, NextResponse } from "next/server";
import { calculateReferralPayoutsForPeriod } from "@/modules/affiliate/lib/affiliate-service";
import { getProfitPeriodBounds } from "@/config/profit-period";
import { isTestMode, getEnvLabel } from "@/shared/lib/env";
import { isAuthorizedCronRequest } from "@/shared/lib/cron-auth";
import { withCronLock } from "@/shared/lib/cron-lock";

/**
 * Cron endpoint for calculating referral payouts
 * Should be called after daily profit calculation to process referral payouts for a period
 * 
 * Security: Add secret key check in production
 * Example: ?secret=YOUR_CRON_SECRET_KEY&date=2024-01-15 (optional, defaults to previous period)
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  try {
    const locked = await withCronLock("referral-payouts", async () => {
      // Get date from query params or default to previous period
      const dateParam = req.nextUrl.searchParams.get("date");
      let periodStart: Date;

    if (dateParam) {
      periodStart = new Date(dateParam);
      if (isNaN(periodStart.getTime())) {
        return NextResponse.json(
          { error: "Invalid date format. Use YYYY-MM-DD" },
          { status: 400 }
        );
      }
    } else {
      // Default to previous period
      const now = new Date();
      const { periodStart: currentPeriodStart } = getProfitPeriodBounds(now);
      // Go back one period
      const PROFIT_PERIOD_MINUTES = Number(process.env.PROFIT_PERIOD_MINUTES ?? "1440");
      const periodMs = PROFIT_PERIOD_MINUTES * 60 * 1000;
      periodStart = new Date(currentPeriodStart.getTime() - periodMs);
    }

    // Normalize to period start
    const { periodStart: normalizedStart } = getProfitPeriodBounds(periodStart);

    console.log(`[CRON] Running in: ${getEnvLabel()}`);
    console.log(`[CRON] Test mode = ${isTestMode()}`);
    console.log(`[Cron] Calculating referral payouts for period: ${normalizedStart.toISOString()}`);

    const payoutCount = await calculateReferralPayoutsForPeriod(normalizedStart);

    const duration = Date.now() - startTime;
    console.log(
      `[Cron] Referral payouts calculation completed: count=${payoutCount}, ` +
      `periodStart=${normalizedStart.toISOString()}, duration=${duration}ms`
    );

      return NextResponse.json({
        success: true,
        periodStart: normalizedStart.toISOString(),
        payoutCount,
        durationMs: duration,
      });
    });
    if (!locked.acquired) {
      return NextResponse.json({ success: true, skipped: true, reason: "already_running" });
    }
    if (locked.result) return locked.result;

    const duration = Date.now() - startTime;
    console.error(`[Cron] Error in referral-payouts cron (duration: ${duration}ms): unknown lock result`);
    return NextResponse.json(
      {
        success: false,
        payoutCount: 0,
        durationMs: duration,
        errors: ["Unknown referral-payouts execution error"],
      },
      { status: 500 }
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Cron] Error in referral-payouts cron (duration: ${duration}ms):`, error);
    return NextResponse.json(
      {
        success: false,
        payoutCount: 0,
        durationMs: duration,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      },
      { status: 500 }
    );
  }
}

// Also support POST for cron services that prefer POST
export const POST = GET;

