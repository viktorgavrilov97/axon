"use server";

import { db } from "@/shared/lib/db";
import { syncDepositStatusFromProvider } from "../lib/wallet-service";

/**
 * Server action to sync all active deposits (PENDING, PROCESSING) from payment providers
 * Works with OxaPay via provider abstraction
 * This is called periodically to ensure status is up-to-date even if webhook fails
 */
export async function syncActiveDepositsAction() {
  try {
    // Find all active deposits (PENDING or PROCESSING) that have providerPaymentId
    const activeDeposits = await db.deposit.findMany({
      where: {
        status: {
          in: ["paying"], // Only paying deposits are considered active
        },
        providerPaymentId: {
          not: null,
        },
      },
      select: {
        id: true,
        providerPaymentId: true,
        status: true,
      },
    });

    if (activeDeposits.length === 0) {
      return {
        success: true,
        synced: 0,
        updated: 0,
      };
    }

    let updated = 0;
    const errors: string[] = [];

    // Sync all active deposits in parallel (optimized)
    // This significantly reduces total sync time when there are multiple deposits
    const syncResults = await Promise.allSettled(
      activeDeposits.map(async (deposit) => {
      try {
        const result = await syncDepositStatusFromProvider(deposit.id);
          return {
            depositId: deposit.id,
            result,
            oldStatus: deposit.status,
          };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        errors.push(`Deposit ${deposit.id}: ${errorMessage}`);
        console.error(`Failed to sync deposit ${deposit.id}:`, error);
          throw error;
        }
      })
    );

    // Count updated deposits
    for (const syncResult of syncResults) {
      if (syncResult.status === "fulfilled") {
        const { result, oldStatus } = syncResult.value;
        if (result.balanceCredited || result.deposit.status !== oldStatus) {
          updated++;
        }
      }
    }

    return {
      success: true,
      synced: activeDeposits.length,
      updated,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error("Sync active deposits error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to sync active deposits",
    };
  }
}

