"use server";

import { getCurrentUser } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";
import { WithdrawalStatus, WithdrawalProvider } from "@prisma/client";
import { triggerWithdrawalPayout } from "@/modules/wallet/lib/withdrawal-payout-service";

/**
 * Trigger payout for withdrawal
 * If status is PENDING, first approves it, then creates payout
 * If status is APPROVED, just creates payout
 */
export async function triggerWithdrawalPayoutAction(withdrawalId: string) {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return { error: "Not authorized" };
  }

  if (
    currentUser.role !== "ADMIN" &&
    currentUser.role !== "SUPERADMIN"
  ) {
    return { error: "Insufficient permissions" };
  }

  try {
    // Get withdrawal
    const withdrawal = await db.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: { wallet: true },
    });

    if (!withdrawal) {
      return { error: "Withdrawal not found" };
    }

    // If already completed, can't payout
    if (withdrawal.status === WithdrawalStatus.COMPLETED) {
      return { error: "Withdrawal already completed" };
    }

    // If status is PENDING, first approve it
    if (withdrawal.status === WithdrawalStatus.PENDING) {
      await db.withdrawal.update({
        where: { id: withdrawalId },
        data: {
          status: WithdrawalStatus.APPROVED,
        },
      });
    }

    // Check if provider is OXAPAY
    if (withdrawal.provider !== WithdrawalProvider.OXAPAY) {
      return { 
        error: "Automatic payout is only available for OXAPAY provider. Use manual processing." 
      };
    }

    // Trigger payout
    const payoutResult = await triggerWithdrawalPayout(withdrawalId, currentUser.id);

    if (payoutResult.error) {
      // Provide more detailed error message for 401 Unauthorized
      if (payoutResult.error.includes("Unauthorized") || payoutResult.error.includes("401")) {
        return { 
          error: "OxaPay Payout API authorization error.\n\n" +
                 "Possible causes:\n" +
                 "1. API key does not have payout permissions\n" +
                 "2. API key is incorrect or inactive\n" +
                 "3. A separate API key is required for Payout API (OXAPAY_PAYOUT_API_KEY)\n\n" +
                 `Error details: ${payoutResult.error}`
        };
      }
      return { error: payoutResult.error };
    }

    return { 
      success: true, 
      payoutId: payoutResult.payoutId,
      message: payoutResult.payoutId 
        ? `Payout created. Payout ID: ${payoutResult.payoutId}`
        : "Payout was already created earlier"
    };
  } catch (error) {
    console.error("Error triggering payout:", error);
    return {
      error: error instanceof Error ? error.message : "Error creating payout",
    };
  }
}

