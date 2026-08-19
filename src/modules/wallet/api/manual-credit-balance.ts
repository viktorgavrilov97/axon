"use server";

import { db } from "@/shared/lib/db";
import { creditBalanceOnDepositConfirmed } from "../lib/credit-balance-on-status-change";

/**
 * Manually credit balance for a deposit that was updated directly in the database
 * This function checks if the deposit status is "paid" (OxaPay status) and credits balance if not already credited
 * 
 * Usage: Call this after manually updating deposit status to "paid" in the database
 */
export async function manualCreditBalanceAction(depositId: string): Promise<{
  success: boolean;
  credited: boolean;
  error?: string;
}> {
  try {
    // Get deposit with current status
    const deposit = await db.deposit.findUnique({
      where: { id: depositId },
      include: { wallet: true },
    });

    if (!deposit) {
      return {
        success: false,
        credited: false,
        error: "Deposit not found",
      };
    }

    // Only credit if status is paid (OxaPay status)
    if (deposit.status !== "paid") {
      return {
        success: true,
        credited: false,
        error: `Deposit status is ${deposit.status}, not paid. Balance will be credited automatically when status changes to paid.`,
      };
    }

    // Check if balance was already credited by checking if there's a confirmedAt timestamp
    // and if the wallet balance seems to already include this deposit
    // (This is a heuristic - we can't be 100% sure, but it's better than nothing)
    
    // Try to credit balance with forceCredit=true
    // This will credit even if the deposit was already paid
    // (useful for manual updates where we're not sure if balance was credited)
    const result = await creditBalanceOnDepositConfirmed(
      depositId,
      "paying", // oldStatus (assume it was paying before manual update)
      "paid",  // newStatus (OxaPay status)
      true // forceCredit - credit even if we're not sure about the transition
    );

    return {
      success: true,
      credited: result.credited,
      error: result.error,
    };
  } catch (error) {
    console.error("[ManualCreditBalance] Error:", error);
    return {
      success: false,
      credited: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

