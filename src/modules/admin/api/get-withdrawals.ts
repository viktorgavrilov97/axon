"use server";

import { getCurrentUser } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";
import { WithdrawalStatus, WithdrawalProvider } from "@prisma/client";
import { syncWithdrawalPayoutStatus } from "@/modules/wallet/lib/withdrawal-payout-service";

export async function getWithdrawalsAction(
  status?: WithdrawalStatus,
  page: number = 1,
  limit: number = 50
) {
  const user = await getCurrentUser();

  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
    return { error: "Insufficient permissions" };
  }

  const skip = (page - 1) * limit;

  const where = status ? { status } : {};

  const [withdrawals, total] = await Promise.all([
    db.withdrawal.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        wallet: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
      // Include provider fields to show payout status
    }),
    db.withdrawal.count({ where }),
  ]);

  // Sync statuses for OxaPay withdrawals that are still processing
  // Sync first batch (up to 5) to avoid too many API calls
  const withdrawalsToSync = withdrawals
    .filter((w) => 
      w.provider === WithdrawalProvider.OXAPAY && 
      w.providerPayoutId && 
      (w.status === WithdrawalStatus.PROCESSING || w.status === WithdrawalStatus.APPROVED)
    )
    .slice(0, 5); // Limit to 5 to avoid too many API calls

  if (withdrawalsToSync.length > 0) {
    // Sync in background, don't wait for all
    Promise.all(
      withdrawalsToSync.map((w) => 
        syncWithdrawalPayoutStatus(w.id).catch((error) => {
          console.error(`[Admin] Failed to sync withdrawal ${w.id}:`, error);
          return null;
        })
      )
    ).catch((error) => {
      console.error("[Admin] Error syncing withdrawal statuses:", error);
    });
  }

  return {
    success: true,
    withdrawals: withdrawals.map((w) => ({
      id: w.id,
      userEmail: w.wallet.user.email,
      amount: Number(w.amount),
      toAddress: w.toAddress,
      status: w.status,
      txHash: w.txHash,
      rejectionReason: w.rejectionReason,
      createdAt: w.createdAt,
      processedAt: w.processedAt,
      provider: w.provider,
      providerPayoutId: w.providerPayoutId,
      currency: w.currency,
    })),
    total,
    page,
    limit,
  };
}

