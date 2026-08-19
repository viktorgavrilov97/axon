"use server";

import { z } from "zod";
import { getCurrentUser } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";
import {
  DepositOrigin,
  DepositProvider,
  TransactionType,
} from "@prisma/client";
import { creditWallet } from "@/shared/lib/wallet/ledger";
import { createAuditLog } from "@/shared/lib/audit-log";
import { emitRealtimeEvent } from "@/shared/lib/realtime-events";

const inputSchema = z.object({
  userId: z.string().min(1),
  amountUsdt: z.number().positive(),
  note: z.string().max(500).optional(),
});

/**
 * Admin (SUPERADMIN-only) action: create a TEST deposit and credit the wallet.
 *
 * The deposit gets `provider=MANUAL` + `origin=TEST` so it:
 *   - is excluded from referral turnover and prod metrics
 *   - is purgeable from /admin/test-balances
 *   - never collides with REAL OxaPay webhook flow
 */
export async function createTestDepositAction(input: {
  userId: string;
  amountUsdt: number;
  note?: string;
}): Promise<{ success: true; depositId: string } | { success: false; error: string }> {
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "SUPERADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { userId, amountUsdt, note } = parsed.data;

  const wallet = await db.wallet.findUnique({ where: { userId } });
  if (!wallet) {
    return { success: false, error: "Target user has no wallet" };
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const deposit = await tx.deposit.create({
        data: {
          userId,
          walletId: wallet.id,
          provider: DepositProvider.MANUAL,
          origin: DepositOrigin.TEST,
          amountUsdt,
          payCurrency: "test",
          status: "paid",
          confirmedAt: new Date(),
        },
      });

      await creditWallet(tx, {
        walletId: wallet.id,
        amount: amountUsdt,
        type: TransactionType.DEPOSIT,
        meta: {
          depositId: deposit.id,
          source: "admin_test_deposit",
          origin: DepositOrigin.TEST,
          note: note ?? null,
          adminUserId: actor.id,
        },
      });

      return deposit;
    });

    await createAuditLog({
      action: "TEST_DEPOSIT_CREATED",
      entityType: "DEPOSIT",
      entityId: result.id,
      metadata: {
        userId,
        amountUsdt: amountUsdt.toString(),
        note: note ?? null,
        adminUserId: actor.id,
      },
      userId: actor.id,
    });

    const updatedWallet = await db.wallet.findUnique({
      where: { id: wallet.id },
      select: { balanceUsdt: true },
    });
    if (updatedWallet) {
      await emitRealtimeEvent({
        type: "wallet_balance_updated",
        userId,
        walletId: wallet.id,
        balance: updatedWallet.balanceUsdt.toString(),
        timestamp: new Date().toISOString(),
      });
    }

    return { success: true, depositId: result.id };
  } catch (error) {
    console.error("[create-test-deposit] error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
