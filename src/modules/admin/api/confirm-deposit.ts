"use server";

import { getCurrentUser } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";
import { DepositOrigin, TransactionType } from "@prisma/client";
import { emitRealtimeEvent } from "@/shared/lib/realtime-events";
import { creditWallet } from "@/shared/lib/wallet/ledger";

/**
 * Confirm deposit manually (for testing only)
 * Updates deposit status to "paid" and credits balance to user wallet
 */
export async function confirmDepositAction(depositId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    // Get deposit with wallet and user
    const deposit = await db.deposit.findUnique({
      where: { id: depositId },
      include: { 
        wallet: true,
        user: {
          select: { id: true },
        },
      },
    });

    if (!deposit) {
      return { success: false, error: "Deposit not found" };
    }

    // Check if already paid
    if (deposit.status === "paid") {
      return { success: false, error: "Deposit is already paid" };
    }

    // Use transaction to ensure atomicity
    const result = await db.$transaction(async (tx) => {
      // Update deposit status to "paid". Reclassify origin → MANUAL since this
      // path is admin-confirmed (not webhook). REAL deposits never come through here.
      const updatedDeposit = await tx.deposit.update({
        where: { id: depositId },
        data: {
          status: "paid",
          confirmedAt: new Date(),
          origin: DepositOrigin.MANUAL,
        },
      });

      const { newBalance } = await creditWallet(tx, {
        walletId: deposit.walletId,
        amount: deposit.amountUsdt,
        type: TransactionType.DEPOSIT,
        meta: {
          depositId: deposit.id,
          source: "admin_manual_confirm",
          origin: DepositOrigin.MANUAL,
        },
      });

      console.log(
        `✅ [Admin] Deposit ${depositId} confirmed manually. Balance credited: +${deposit.amountUsdt.toString()} USDT`
      );

      return { deposit: updatedDeposit, wallet: { balanceUsdt: newBalance } };
    });

    // Emit realtime events after transaction commit
    const confirmedAtISO = result.deposit.confirmedAt?.toISOString() || new Date().toISOString();
    
    // Send to both the deposit owner and admin users
    await Promise.all([
      // Event for deposit owner
      emitRealtimeEvent({
        type: "deposit_status_updated",
        userId: deposit.user.id,
        depositId: deposit.id,
        status: "paid",
        timestamp: new Date().toISOString(),
      }),
      // Event for admin (current user) - so admin sees the update immediately
      emitRealtimeEvent({
        type: "deposit_status_updated",
        userId: user.id,
        depositId: deposit.id,
        status: "paid",
        timestamp: new Date().toISOString(),
      }),
      emitRealtimeEvent({
        type: "wallet_balance_updated",
        userId: deposit.user.id,
        walletId: deposit.walletId,
        balance: result.wallet.balanceUsdt.toString(),
        timestamp: new Date().toISOString(),
      }),
    ]);

    // Recalculate referral turnover chain (deposit became active)
    try {
      const { recalculateTurnoverChainForUser } = await import("@/modules/affiliate/lib/affiliate-service");
      await recalculateTurnoverChainForUser(deposit.user.id);
      console.log(`[Referral] Recalculated turnover chain for user ${deposit.user.id} after manual deposit confirmation`);
    } catch (error) {
      console.error(`[Referral] Failed to recalculate turnover chain for user ${deposit.user.id}:`, error);
      // Don't fail the deposit confirmation if referral recalculation fails
    }

    return { success: true };
  } catch (error) {
    console.error("Error confirming deposit:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

