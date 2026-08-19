import { runDailyProfitCronAction } from "@/modules/strategies/api/run-daily-profit-cron";
import { NextRequest, NextResponse } from "next/server";
import { isTestMode, getEnvLabel } from "@/shared/lib/env";
import { isAuthorizedCronRequest } from "@/shared/lib/cron-auth";
import { withCronLock } from "@/shared/lib/cron-lock";

async function handle(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  console.log(`[CRON] Running in: ${getEnvLabel()}`);
  console.log(`[CRON] Test mode = ${isTestMode()}`);

  const startedAt = Date.now();
  try {
    const locked = await withCronLock("run-daily-strategy-profit", () => runDailyProfitCronAction());
    if (!locked.acquired) {
      return NextResponse.json({ success: true, skipped: true, reason: "already_running" });
    }
    const result = locked.result!;
    console.log(`[CRON] run-daily-strategy-profit finished in ${Date.now() - startedAt}ms`);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in cron route:", error);
    return NextResponse.json(
      {
        success: false,
        processed: 0,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      },
      { status: 500 }
    );
  }
}

export const GET = handle;
export const POST = handle;
