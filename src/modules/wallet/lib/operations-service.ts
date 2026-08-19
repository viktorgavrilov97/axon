import { db } from "@/shared/lib/db";
// OxaPay deposit statuses
type OxaPayDepositStatus = "paying" | "paid" | "expired" | "failed" | "cancelled";

/**
 * Get active deposit (PENDING only, created < 24 hours ago)
 * Active deposit is only PENDING - if status changed to PROCESSING or CONFIRMED, it's no longer "active"
 * This is used in TopUpDialog to show payment details with timer only for unpaid deposits
 */
export async function getActiveDeposit(userId: string) {
  const wallet = await db.wallet.findUnique({
    where: { userId },
  });

  if (!wallet) {
    return null;
  }

  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

  // Only return PENDING deposits - PROCESSING and CONFIRMED are not "active" for the top-up dialog
  const deposit = await db.deposit.findFirst({
    where: {
      walletId: wallet.id,
      status: "paying", // Only paying is considered "active" for unpaid deposits
      createdAt: {
        gte: twentyFourHoursAgo,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return deposit;
}

/**
 * Cancel deposit (set status to CANCELLED)
 */
export async function cancelDeposit(depositId: string, userId: string) {
  const wallet = await db.wallet.findUnique({
    where: { userId },
  });

  if (!wallet) {
    throw new Error("Wallet not found");
  }

  const deposit = await db.deposit.findFirst({
    where: {
      id: depositId,
      walletId: wallet.id,
    },
  });

  if (!deposit) {
    throw new Error("Deposit not found");
  }

  if (deposit.status !== "paying") {
    throw new Error("Only PENDING or PROCESSING deposits can be cancelled");
  }

  return await db.deposit.update({
    where: { id: depositId },
    data: {
      status: "cancelled",
    },
  });
}

