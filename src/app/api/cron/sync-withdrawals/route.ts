import { NextRequest, NextResponse } from "next/server";
import { db } from "@/shared/lib/db";
import { WithdrawalProvider, WithdrawalStatus } from "@prisma/client";
import { syncWithdrawalPayoutStatus } from "@/modules/wallet/lib/withdrawal-payout-service";
import { isAuthorizedCronRequest } from "@/shared/lib/cron-auth";
import { withCronLock } from "@/shared/lib/cron-lock";

/**
 * Cron endpoint for syncing withdrawal payout statuses
 * Should be called periodically (e.g., every 5-10 minutes) to sync payout statuses from OxaPay
 * 
 * Security: Add secret key check in production
 * Example: ?secret=YOUR_CRON_SECRET_KEY
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  try {
    const locked = await withCronLock("sync-withdrawals", async () => {
      // Find all withdrawals that need status sync:
      // - provider == OXAPAY - automatic payout provider
      // - status in PROCESSING or APPROVED (with payoutId)
      // - providerStatus not COMPLETED or FAILED (still in progress)
      const withdrawalsToSync = await db.withdrawal.findMany({
        where: {
          provider: WithdrawalProvider.OXAPAY,
          providerPayoutId: { not: null },
          status: {
            in: [WithdrawalStatus.PROCESSING, WithdrawalStatus.APPROVED],
          },
          OR: [
            { providerStatus: null },
            { providerStatus: { notIn: ["COMPLETED", "FAILED"] } },
          ],
        },
        select: {
          id: true,
          provider: true,
          providerPayoutId: true,
          status: true,
          providerStatus: true,
        },
      });

      const results = {
        total: withdrawalsToSync.length,
        synced: 0,
        completed: 0,
        failed: 0,
        errors: [] as string[],
      };

      // Sync each withdrawal
      for (const withdrawal of withdrawalsToSync) {
        try {
          const result = await syncWithdrawalPayoutStatus(withdrawal.id);
          results.synced++;

          if (result.status === "COMPLETED") {
            results.completed++;
          } else if (result.status === "REJECTED" || result.status === "FAILED") {
            results.failed++;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          results.errors.push(`Withdrawal ${withdrawal.id}: ${errorMessage}`);
          console.error(`[Cron] Failed to sync withdrawal ${withdrawal.id}:`, error);
        }
      }

      return NextResponse.json({
        success: true,
        summary: results,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startedAt,
      });
    });
    if (!locked.acquired) {
      return NextResponse.json({ success: true, skipped: true, reason: "already_running" });
    }
    return locked.result!;
  } catch (error) {
    console.error("[Cron] Error syncing withdrawals:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
        durationMs: Date.now() - startedAt,
      },
      { status: 500 }
    );
  }
}

// Also support POST for cron services that prefer POST
export const POST = GET;

