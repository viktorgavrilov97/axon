"use server";

import { getServerSession } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";
import { WithdrawalStatus } from "@prisma/client";

export async function cancelWithdrawalAction(withdrawalId: string) {
  const session = await getServerSession();

  if (!session?.user?.id) {
    return {
      error: "Authentication required",
    };
  }

  try {
    // Get wallet
    const wallet = await db.wallet.findUnique({
      where: { userId: session.user.id },
    });

    if (!wallet) {
      return {
        error: "Wallet not found",
      };
    }

    // Get withdrawal
    const withdrawal = await db.withdrawal.findFirst({
      where: {
        id: withdrawalId,
        walletId: wallet.id,
      },
    });

    if (!withdrawal) {
      return {
        error: "Withdrawal not found",
      };
    }

    // Only PENDING withdrawals can be cancelled
    if (withdrawal.status !== WithdrawalStatus.PENDING) {
      return {
        error: "Only pending withdrawals can be cancelled",
      };
    }

    // Update withdrawal status to REJECTED (cancelled by user)
    await db.withdrawal.update({
      where: { id: withdrawalId },
      data: {
        status: WithdrawalStatus.REJECTED,
        rejectionReason: "Cancelled by user",
      },
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error("Cancel withdrawal error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to cancel withdrawal",
    };
  }
}

