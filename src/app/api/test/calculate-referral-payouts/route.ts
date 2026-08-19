import { NextRequest, NextResponse } from "next/server";
import { calculateReferralPayoutsForPeriod } from "@/modules/affiliate/lib/affiliate-service";
import { getProfitPeriodBounds } from "@/config/profit-period";

/**
 * Test endpoint to manually calculate referral payouts for current period
 * No auth required for testing
 * GET /api/test/calculate-referral-payouts?date=2024-11-28T14:30:00 (optional)
 */
export async function GET(req: NextRequest) {
  try {
    const dateParam = req.nextUrl.searchParams.get("date");
    const now = dateParam ? new Date(dateParam) : new Date();
    
    if (isNaN(now.getTime())) {
      return NextResponse.json(
        {
          success: false,
          payoutCount: 0,
          error: "Invalid date format",
        },
        { status: 400 }
      );
    }

    const { periodStart } = getProfitPeriodBounds(now);
    const payoutCount = await calculateReferralPayoutsForPeriod(periodStart);

    return NextResponse.json({
      success: true,
      periodStart: periodStart.toISOString(),
      payoutCount,
    });
  } catch (error) {
    console.error("Error in test calculate-referral-payouts route:", error);
    return NextResponse.json(
      {
        success: false,
        payoutCount: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}

