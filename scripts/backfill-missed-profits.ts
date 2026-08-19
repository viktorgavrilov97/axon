/**
 * scripts/backfill-missed-profits.ts
 *
 * Backfills daily profits for strategies that were silently completed without
 * any dividend accruals because of the "endDate set in minutes instead of days" bug.
 *
 * Behavior:
 *   - Iterates COMPLETED strategies whose (endDate - startDate) is much smaller
 *     than durationDays * 1 day (i.e. the bug applied).
 *   - For each, generates per-day StrategyProfit (PROFIT_DAY) records at a random
 *     percent in [minPercent, maxPercent], for as many days as durationDays
 *     OR up to "now" (whichever is smaller).
 *   - Credits the cumulative amount to the user's wallet and writes a Transaction
 *     of type STRATEGY_PROFIT with meta.backfill = true (idempotency marker).
 *   - Idempotent: skips strategies that already have a backfill transaction.
 *
 * NOT backfilled:
 *   - BONUS_MULTIPLIER (depends on per-day diversity snapshots which we don't have)
 *   - Referral payouts (run cron/referral-payouts after backfill if desired)
 *
 * Usage:
 *   # From .env.local:
 *   npx tsx scripts/backfill-missed-profits.ts                 # dry-run
 *   npx tsx scripts/backfill-missed-profits.ts --confirm       # writes
 *
 *   # With explicit DB url:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/backfill-missed-profits.ts --confirm
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// ---- env loading (mirrors fix-strategy-enddates.ts) ----
const envPath = resolve(process.cwd(), ".env.local");
try {
  const envFile = readFileSync(envPath, "utf-8");
  envFile.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const match = trimmed.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        const cleanValue = value.trim().replace(/^["']|["']$/g, "");
        if (!process.env[key]) {
          process.env[key] = cleanValue;
        }
      }
    }
  });
} catch {
  // .env.local optional — caller may have exported DATABASE_URL already
}

import { db } from "../src/shared/lib/db";
import { ProfitType, StrategyStatus } from "@prisma/client";

const DRY_RUN = !process.argv.includes("--confirm");

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function randomPercent(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

async function main() {
  console.log(`[backfill] mode = ${DRY_RUN ? "DRY RUN" : "WRITE"}`);

  const strategies = await db.strategy.findMany({
    where: { status: StrategyStatus.COMPLETED },
    orderBy: { createdAt: "asc" },
  });
  console.log(`[backfill] completed strategies in scope: ${strategies.length}`);

  const stats = {
    inspected: 0,
    skippedNoBug: 0,
    skippedAlreadyBackfilled: 0,
    skippedNoWallet: 0,
    backfilled: 0,
    totalCreditedUsdt: 0,
    totalProfitRecords: 0,
  };

  const now = new Date();

  for (const s of strategies) {
    stats.inspected++;
    const id = s.id.slice(0, 8);
    const elapsedMs = s.endDate.getTime() - s.startDate.getTime();
    const intendedMs = s.durationDays * ONE_DAY_MS;
    // "Bug applied" = recorded duration is < 90% of intended in days
    const bugApplied = elapsedMs < intendedMs * 0.9;
    if (!bugApplied) {
      stats.skippedNoBug++;
      console.log(`  ${id}  skip: endDate looks sane (Δ=${(elapsedMs / ONE_DAY_MS).toFixed(2)}d, intended=${s.durationDays}d)`);
      continue;
    }

    const existingBackfillTx = await db.transaction.findFirst({
      where: {
        type: "STRATEGY_PROFIT",
        meta: { path: ["backfill"], equals: true },
        AND: { meta: { path: ["strategyId"], equals: s.id } },
      },
    });
    if (existingBackfillTx) {
      stats.skippedAlreadyBackfilled++;
      console.log(`  ${id}  skip: already backfilled`);
      continue;
    }

    const wallet = await db.wallet.findUnique({ where: { userId: s.userId } });
    if (!wallet) {
      stats.skippedNoWallet++;
      console.log(`  ${id}  skip: no wallet for user ${s.userId.slice(0, 8)}`);
      continue;
    }

    // How many days should this strategy have paid?
    // The "intended" end is startDate + durationDays days. Cap at now so we
    // don't fabricate profits for the future.
    const intendedEnd = new Date(s.startDate.getTime() + intendedMs);
    const cap = intendedEnd.getTime() > now.getTime() ? now : intendedEnd;
    const elapsedDays = Math.max(
      0,
      Math.floor((cap.getTime() - s.startDate.getTime()) / ONE_DAY_MS)
    );

    if (elapsedDays === 0) {
      stats.skippedNoBug++;
      console.log(`  ${id}  skip: 0 elapsed days vs now`);
      continue;
    }

    const minPct = Number(s.minPercent);
    const maxPct = Number(s.maxPercent);
    const principal = Number(s.amount);

    type Row = { date: Date; percent: number; amount: number };
    const rows: Row[] = [];
    for (let i = 1; i <= elapsedDays; i++) {
      // Profit for day-i. Stamp at startOfUTC(startDate + i days).
      const dt = new Date(s.startDate.getTime() + i * ONE_DAY_MS);
      const pct = Math.round(randomPercent(minPct, maxPct) * 100) / 100;
      const amt = Math.round(principal * (pct / 100) * 100000000) / 100000000;
      rows.push({ date: dt, percent: pct, amount: amt });
    }
    const total = rows.reduce((sum, r) => sum + r.amount, 0);

    console.log(
      `  ${id}  user=${s.userId.slice(0, 8)} principal=${principal} dur=${s.durationDays}d elapsed=${elapsedDays}d ` +
        `pctRange=[${minPct},${maxPct}] → ${rows.length} rows, total=${total.toFixed(8)} USDT`
    );

    if (DRY_RUN) {
      stats.backfilled++;
      stats.totalCreditedUsdt += total;
      stats.totalProfitRecords += rows.length;
      continue;
    }

    await db.$transaction(async (tx) => {
      for (const row of rows) {
        await tx.strategyProfit.create({
          data: {
            strategyId: s.id,
            userId: s.userId,
            date: row.date,
            percent: row.percent,
            amount: row.amount,
            type: ProfitType.PROFIT_DAY,
          },
        });
      }

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balanceUsdt: { increment: total } },
      });

      await tx.transaction.create({
        data: {
          walletId: wallet.id,
          type: "STRATEGY_PROFIT",
          amount: total,
          currency: "USDT_POLYGON",
          meta: {
            backfill: true,
            strategyId: s.id,
            durationDays: s.durationDays,
            elapsedDays,
            principal,
            note: "Backfill for missed dividends caused by minutes-instead-of-days bug",
          },
        },
      });
    });

    stats.backfilled++;
    stats.totalCreditedUsdt += total;
    stats.totalProfitRecords += rows.length;
    console.log(`  ${id}  ✅ credited ${total.toFixed(8)} USDT (${rows.length} profit records)`);
  }

  console.log("\n[backfill] summary:", stats);
  if (DRY_RUN) console.log("[backfill] dry run — re-run with --confirm to apply");
}

main()
  .catch((e) => {
    console.error("[backfill] fatal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
