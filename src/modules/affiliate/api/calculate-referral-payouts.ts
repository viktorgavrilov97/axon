"use server";

import { calculateReferralPayoutsForPeriod } from "../lib/affiliate-service";
import { getProfitPeriodBounds } from "@/config/profit-period";

/**
 * Server action to manually calculate referral payouts for a specific period
 * Useful for testing or manual processing
 */
export async function calculateReferralPayoutsAction(date?: string): Promise<{
  success: boolean;
  payoutCount: number;
  periodStart: string;
  error?: string;
}> {
  try {
    const now = date ? new Date(date) : new Date();
    
    if (isNaN(now.getTime())) {
      return {
        success: false,
        payoutCount: 0,
        periodStart: date || "",
        error: "Invalid date format",
      };
    }

    const { periodStart } = getProfitPeriodBounds(now);
    const payoutCount = await calculateReferralPayoutsForPeriod(periodStart);

    return {
      success: true,
      payoutCount,
      periodStart: periodStart.toISOString(),
    };
  } catch (error) {
    console.error("Error calculating referral payouts:", error);
    return {
      success: false,
      payoutCount: 0,
      periodStart: date || new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

