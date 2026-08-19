"use server";

import { getCurrentUser } from "@/shared/lib/auth";
import { syncWithdrawalPayoutStatus } from "@/modules/wallet/lib/withdrawal-payout-service";

/**
 * Sync withdrawal status from OxaPay
 * Only admins can trigger this
 */
export async function syncWithdrawalStatusAction(withdrawalId: string) {
  const user = await getCurrentUser();

  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
    return { error: "Insufficient permissions" };
  }

  try {
    const result = await syncWithdrawalPayoutStatus(withdrawalId);
    return {
      success: true,
      status: result.status,
      balanceDeducted: result.balanceDeducted,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { error: errorMessage };
  }
}

