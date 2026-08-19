"use server";

import { getCurrentUser } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";
import { z } from "zod";
import { WithdrawalStatus, WithdrawalProvider, TransactionType } from "@prisma/client";
import { triggerWithdrawalPayout } from "@/modules/wallet/lib/withdrawal-payout-service";
import { createAuditLog } from "@/shared/lib/audit-log";
import { debitWallet } from "@/shared/lib/wallet/ledger";
import { headers } from "next/headers";

const updateStatusSchema = z.object({
  withdrawalId: z.string(),
  status: z.enum(["APPROVED", "REJECTED", "COMPLETED"]),
  txHash: z.string().optional(),
  rejectionReason: z.string().optional(),
});

export async function updateWithdrawalStatusAction(formData: FormData) {
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

  const rawData = {
    withdrawalId: formData.get("withdrawalId") as string,
    status: formData.get("status") as string,
    txHash: formData.get("txHash") as string | null,
    rejectionReason: formData.get("rejectionReason") as string | null,
  };

  const validation = updateStatusSchema.safeParse({
    withdrawalId: rawData.withdrawalId,
    status: rawData.status,
    txHash: rawData.txHash || undefined,
    rejectionReason: rawData.rejectionReason || undefined,
  });

  if (!validation.success) {
    return { error: "Invalid data" };
  }

  const { withdrawalId, status, txHash, rejectionReason } = validation.data;

  try {
    // Get withdrawal with wallet to deduct balance
    const withdrawal = await db.withdrawal.findUnique({
      where: { id: withdrawalId },
      include: { wallet: true },
    });

    if (!withdrawal) {
      return { error: "Withdrawal not found" };
    }

    // Prevent changing COMPLETED status to something else
    if (withdrawal.status === WithdrawalStatus.COMPLETED && status !== "COMPLETED") {
      return { error: "Cannot change status of completed withdrawal" };
    }

    // Use transaction to ensure atomicity
    await db.$transaction(async (tx) => {
      const updateData: {
        status: WithdrawalStatus;
        txHash?: string;
        rejectionReason?: string;
        processedAt?: Date;
      } = {
        status: status as WithdrawalStatus,
      };

      if (status === "COMPLETED") {
        // For COMPLETED status:
        // - If provider is OXAPAY and payout was initiated, balance is already deducted in syncWithdrawalPayoutStatus
        // - If provider is INTERNAL, deduct balance here (manual processing)
        const isOxaPayProvider = withdrawal.provider === WithdrawalProvider.OXAPAY;
        const hasPayoutId = !!withdrawal.providerPayoutId;

        if (isOxaPayProvider && hasPayoutId) {
          // Balance should be deducted by syncWithdrawalPayoutStatus when payout completes
          // Just update status and metadata
          updateData.processedAt = new Date();
          if (txHash) {
            updateData.txHash = txHash;
          }
        } else {
          // INTERNAL provider or manual completion: deduct balance here
          updateData.processedAt = new Date();
          if (txHash) {
            updateData.txHash = txHash;
          }

          // Check if balance was already deducted (prevent double deduction)
          const wasCompleted = withdrawal.status === "COMPLETED";
          if (!wasCompleted) {
            await debitWallet(tx, {
              walletId: withdrawal.walletId,
              amount: withdrawal.amount,
              type: TransactionType.WITHDRAWAL,
              meta: {
                withdrawalId: withdrawal.id,
                txHash: txHash ?? undefined,
                completedByAdmin: true,
              },
            });

            console.log(
              `✅ Balance deducted: -${withdrawal.amount.toString()} USDT for withdrawal ${withdrawal.id}`
            );
          }
        }
      }

      if (status === "REJECTED") {
        updateData.processedAt = new Date();
        if (rejectionReason) {
          updateData.rejectionReason = rejectionReason.trim();
        }
      }

      // Update withdrawal status
      await tx.withdrawal.update({
        where: { id: withdrawalId },
        data: updateData,
      });
    });

    // Audit log for withdrawal status change
    const headersList = await headers();
    await createAuditLog({
      action: status === "APPROVED" ? "WITHDRAWAL_APPROVED" : status === "REJECTED" ? "WITHDRAWAL_REJECTED" : "WITHDRAWAL_COMPLETED",
      entityType: "WITHDRAWAL",
      entityId: withdrawalId,
      metadata: {
        previousStatus: withdrawal.status,
        newStatus: status,
        amount: withdrawal.amount.toString(),
        toAddress: withdrawal.toAddress,
        txHash: txHash || null,
        rejectionReason: rejectionReason || null,
      },
      userId: currentUser.id,
      ipAddress: headersList.get("x-forwarded-for")?.split(",")[0] || headersList.get("x-real-ip") || undefined,
      userAgent: headersList.get("user-agent") || undefined,
    });

    // Trigger automatic payout if status changed to APPROVED and provider is OXAPAY
    if (status === "APPROVED" && withdrawal.provider === WithdrawalProvider.OXAPAY) {
      try {
        const payoutResult = await triggerWithdrawalPayout(withdrawalId, currentUser.id);
        if (payoutResult.error) {
          console.error(`[Payout] Failed to trigger payout: ${payoutResult.error}`);
          // Don't fail the status update, but log the error
          // Admin can retry payout later
        }
      } catch (error) {
        console.error(`[Payout] Error triggering payout:`, error);
        // Don't fail the status update, payout can be retried
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error updating withdrawal status:", error);
    return {
      error: error instanceof Error ? error.message : "Error updating status",
    };
  }
}

