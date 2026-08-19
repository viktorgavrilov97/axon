import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/lib/db";
import { recalculateUserTurnover } from "@/modules/affiliate/lib/affiliate-service";
import { isTestMode, getEnvLabel } from "@/shared/lib/env";
import { isAuthorizedCronRequest } from "@/shared/lib/cron-auth";
import { withCronLock } from "@/shared/lib/cron-lock";

/**
 * Cron endpoint for recalculating referral levels
 * Should be called periodically (e.g., daily) to update user turnover and unlock levels
 * 
 * Security: Add secret key check in production
 * Example: ?secret=YOUR_CRON_SECRET_KEY
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();

  try {
    const locked = await withCronLock("recalc-referral-levels", async () => {
      // Get all users who have active deposits, active strategies, or active referrals
      // Optimize: only recalculate for users with activity
      // TODO: For future scaling (500+ users), consider batching by pages or updatedAt
      const usersWithActivity = await db.user.findMany({
        where: {
          OR: [
            {
              deposits: {
                some: {
                  status: "paid",
                },
              },
            },
            {
              strategies: {
                some: {
                  status: "ACTIVE",
                },
              },
            },
            {
              referralChildren: {
                some: {
                  OR: [
                    {
                      deposits: {
                        some: {
                          status: "paid",
                        },
                      },
                    },
                    {
                      strategies: {
                        some: {
                          status: "ACTIVE",
                        },
                      },
                    },
                  ],
                },
              },
            },
          ],
        },
        select: {
          id: true,
        },
      });

      console.log(`[CRON] Running in: ${getEnvLabel()}`);
      console.log(`[CRON] Test mode = ${isTestMode()}`);
      console.log(`[Cron] Recalc referral levels: Found ${usersWithActivity.length} users with activity`);

      let processed = 0;
      const errors: string[] = [];

      // Recalculate turnover for each user
      for (const user of usersWithActivity) {
        try {
          await recalculateUserTurnover(user.id);
          processed++;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          errors.push(`User ${user.id}: ${errorMessage}`);
          console.error(`[Cron] Failed to recalculate turnover for user ${user.id}:`, error);
        }
      }

      const duration = Date.now() - startTime;
      console.log(
        `[Cron] Recalc referral levels completed: processed=${processed}, total=${usersWithActivity.length}, ` +
        `errors=${errors.length}, duration=${duration}ms`
      );

      return NextResponse.json({
        success: errors.length === 0,
        processed,
        total: usersWithActivity.length,
        durationMs: duration,
        errors: errors.length > 0 ? errors : undefined,
      });
    });
    if (!locked.acquired) {
      return NextResponse.json({ success: true, skipped: true, reason: "already_running" });
    }
    return locked.result!;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Cron] Error in recalc-referral-levels cron (duration: ${duration}ms):`, error);
    return NextResponse.json(
      {
        success: false,
        processed: 0,
        durationMs: duration,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      },
      { status: 500 }
    );
  }
}

// Also support POST for cron services that prefer POST
export const POST = GET;

