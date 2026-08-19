import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/shared/lib/cron-auth";
import { withCronLock } from "@/shared/lib/cron-lock";
import { syncActiveDepositsAction } from "@/modules/wallet/api/sync-active-deposits";

export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  try {
    const locked = await withCronLock("sync-deposits", async () => {
      const result = await syncActiveDepositsAction();
      return NextResponse.json({
        ...result,
        durationMs: Date.now() - startedAt,
      });
    });
    if (!locked.acquired) {
      return NextResponse.json({ success: true, skipped: true, reason: "already_running" });
    }
    return locked.result!;
  } catch (error) {
    console.error("[Cron] Error syncing deposits:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        durationMs: Date.now() - startedAt,
      },
      { status: 500 }
    );
  }
}

export const POST = GET;

