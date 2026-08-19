"use server";

import { z } from "zod";
import { getCurrentUser } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";
import { DepositOrigin, TransactionType } from "@prisma/client";
import { debitWallet } from "@/shared/lib/wallet/ledger";
import { createAuditLog } from "@/shared/lib/audit-log";

const inputSchema = z
  .object({
    userId: z.string().optional(),
    depositId: z.string().optional(),
    includeManual: z.boolean().optional(),
  })
  .refine(
    (v) => !(v.userId && v.depositId),
    { message: "Pass userId OR depositId, not both" }
  );

/**
 * Admin (SUPERADMIN-only) action: reverse and remove TEST (and optionally
 * MANUAL) deposits.
 *
 * Per-row mode  : `depositId` set — works on a single TEST or MANUAL row.
 * User-scope    : `userId` set — purges all TEST (or TEST+MANUAL when
 *                 `includeManual=true`) for that user.
 * Bulk mode     : neither set — purges across the whole DB. REAL is never
 *                 touched.
 *
 * Reverse semantics: if the deposit was paid, write an ADJUSTMENT debit to
 * the wallet via the ledger (overdraft allowed — funds may have been spent
 * on an active strategy already). Then delete the Deposit row.
 */
export async function purgeTestDepositsAction(input: {
  userId?: string;
  depositId?: string;
  includeManual?: boolean;
}): Promise<{ success: true; purged: number } | { success: false; error: string }> {
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "SUPERADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { userId, depositId, includeManual } = parsed.data;

  const allowedOrigins: DepositOrigin[] = depositId
    ? [DepositOrigin.TEST, DepositOrigin.MANUAL]
    : includeManual
      ? [DepositOrigin.TEST, DepositOrigin.MANUAL]
      : [DepositOrigin.TEST];

  const where: Parameters<typeof db.deposit.findMany>[0] = {
    where: {
      origin: { in: allowedOrigins },
      ...(userId ? { userId } : {}),
      ...(depositId ? { id: depositId } : {}),
    },
  };

  const deposits = await db.deposit.findMany(where);

  let purged = 0;
  for (const deposit of deposits) {
    try {
      await db.$transaction(async (tx) => {
        if (deposit.status === "paid" && deposit.confirmedAt) {
          await debitWallet(tx, {
            walletId: deposit.walletId,
            amount: deposit.amountUsdt,
            type: TransactionType.ADJUSTMENT,
            allowOverdraft: true,
            meta: {
              reason:
                deposit.origin === DepositOrigin.MANUAL
                  ? "manual_deposit_reversal"
                  : "test_deposit_purge",
              originalDepositId: deposit.id,
              originalOrigin: deposit.origin,
              adminUserId: actor.id,
            },
          });
        }
        await tx.deposit.delete({ where: { id: deposit.id } });
      });
      purged++;
    } catch (error) {
      console.error(`[purge-test-deposits] failed for ${deposit.id}:`, error);
    }
  }

  await createAuditLog({
    action: "TEST_DEPOSITS_PURGED",
    entityType: "DEPOSIT",
    metadata: {
      mode: depositId ? "single" : userId ? "user" : "bulk",
      includeManual: !!includeManual,
      candidates: deposits.length,
      purged,
      adminUserId: actor.id,
    },
    userId: actor.id,
  });

  return { success: true, purged };
}
