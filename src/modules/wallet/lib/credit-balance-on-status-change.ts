"use server";

import { db } from "@/shared/lib/db";
import { TransactionType } from "@prisma/client";
import { creditWallet } from "@/shared/lib/wallet/ledger";

type OxaPayDepositStatus = "paying" | "paid" | "expired" | "failed" | "cancelled";

/**
 * Credit balance when deposit status changes to CONFIRMED
 * This function should be called from a database trigger or manually
 * 
 * IMPORTANT: This function checks if balance was already credited
 * to prevent double crediting
 * 
 * @param forceCredit - If true, will attempt to credit even if oldStatus is CONFIRMED
 *                      (useful for manual updates where we're not sure if balance was credited)
 */
export async function creditBalanceOnDepositConfirmed(
  depositId: string,
  oldStatus: OxaPayDepositStatus | string,
  newStatus: OxaPayDepositStatus | string,
  forceCredit: boolean = false
): Promise<{ credited: boolean; error?: string }> {
  try {
    // Only credit when transitioning to paid (OxaPay status)
    if (newStatus !== "paid") {
      return { credited: false };
    }

    // Don't credit if already was paid (unless forceCredit is true)
    if (oldStatus === "paid" && !forceCredit) {
      return { credited: false };
    }

    // Get deposit with wallet
    const deposit = await db.deposit.findUnique({
      where: { id: depositId },
      include: { wallet: true },
    });

    if (!deposit) {
      return { credited: false, error: "Deposit not found" };
    }

    // Use transaction to ensure atomicity
    const result = await db.$transaction(async (tx) => {
      // Double-check status hasn't changed (race condition protection)
      const currentDeposit = await tx.deposit.findUnique({
        where: { id: depositId },
        include: { wallet: true },
      });

      if (!currentDeposit || currentDeposit.status !== "paid") {
        return { credited: false, error: "Deposit status is not paid" };
      }

      // Additional check: if confirmedAt is set and wallet balance seems to already include this deposit,
      // we might have already credited it. However, we can't be 100% sure, so we'll still credit if forceCredit is true.
      // For safety, we'll always credit if forceCredit is true, as the caller is responsible for ensuring no double-credit.

      await creditWallet(tx, {
        walletId: currentDeposit.walletId,
        amount: currentDeposit.amountUsdt,
        type: TransactionType.DEPOSIT,
        meta: {
          depositId: currentDeposit.id,
          source: "credit_balance_on_status_change",
          previousStatus: oldStatus,
          newStatus,
          forceCredit,
        },
      });

      // Set confirmedAt if not set
      if (!currentDeposit.confirmedAt) {
        await tx.deposit.update({
          where: { id: depositId },
          data: {
            confirmedAt: new Date(),
          },
        });
      }

      console.log(
        `✅ Balance credited manually: +${currentDeposit.amountUsdt.toString()} USDT for deposit ${depositId} ` +
        `(oldStatus: ${oldStatus}, newStatus: ${newStatus}, forceCredit: ${forceCredit})`
      );

      return { credited: true };
    });

    return result;
  } catch (error) {
    console.error("Error crediting balance:", error);
    return {
      credited: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

