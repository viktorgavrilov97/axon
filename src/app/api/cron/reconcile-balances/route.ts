import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/shared/lib/cron-auth";
import { reconcileAllWallets } from "@/shared/lib/wallet/ledger";
import { withCronLock } from "@/shared/lib/cron-lock";

/**
 * Hourly reconciliation: compare Wallet.balanceUsdt vs SUM(Transaction.amount).
 *
 * Read-only — never mutates anything. If drift is detected, logs a single line
 * `[CRON reconcile-balances] DRIFT DETECTED ...` per drifted wallet so an external
 * alerting system can trip on it.
 */
async function handle(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  try {
    const locked = await withCronLock("reconcile-balances", async () => {
      const rows = await reconcileAllWallets();

      const drifted = rows.filter((r) => !r.drift.isZero());

      for (const row of drifted) {
        console.error(
          `[CRON reconcile-balances] DRIFT DETECTED ` +
            `wallet=${row.walletId} user=${row.userId} ` +
            `stored=${row.storedBalance.toString()} ` +
            `ledger=${row.ledgerSum.toString()} ` +
            `drift=${row.drift.toString()}`
        );
      }

      const summary = {
        ok: drifted.length === 0,
        total: rows.length,
        inSync: rows.length - drifted.length,
        drifted: drifted.length,
        totalAbsDrift: drifted
          .reduce((acc, r) => acc.plus(r.drift.abs()), rows[0]?.drift.minus(rows[0].drift) ?? null)
          ?.toString() ?? "0",
        durationMs: Date.now() - startedAt,
      };

      console.log(`[CRON reconcile-balances] OK ${JSON.stringify(summary)}`);
      return NextResponse.json(summary);
    });
    if (!locked.acquired) {
      return NextResponse.json({ ok: true, skipped: true, reason: "already_running" });
    }
    return locked.result!;
  } catch (error) {
    console.error("[CRON reconcile-balances] error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
        durationMs: Date.now() - startedAt,
      },
      { status: 500 }
    );
  }
}

export const GET = handle;
export const POST = handle;
