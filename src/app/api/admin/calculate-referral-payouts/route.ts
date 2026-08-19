import { NextRequest } from "next/server";
import { authedJson } from "@/shared/lib/api/authed-response";
import { getCurrentUser } from "@/shared/lib/auth";
import { calculateReferralPayoutsAction } from "@/modules/affiliate/api/calculate-referral-payouts";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Admin endpoint to manually calculate referral payouts
 * GET /api/admin/calculate-referral-payouts?date=2024-01-15 (optional)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    // Check if user is admin
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      return authedJson({ error: "Unauthorized" }, { status: 401 });
    }

    const dateParam = req.nextUrl.searchParams.get("date");
    const result = await calculateReferralPayoutsAction(dateParam || undefined);

    return authedJson(result);
  } catch (error) {
    console.error("Error in calculate-referral-payouts admin route:", error);
    return authedJson(
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

