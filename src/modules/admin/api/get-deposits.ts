"use server";

import { getCurrentUser } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";

// OxaPay deposit statuses
type OxaPayDepositStatus = "paying" | "paid" | "expired" | "failed" | "cancelled";

export async function getDepositsAction(
  status?: OxaPayDepositStatus,
  page: number = 1,
  limit: number = 50
) {
  const user = await getCurrentUser();

  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
    return { error: "Insufficient permissions" };
  }

  const skip = (page - 1) * limit;

  const where = status ? { status } : {};

  const [deposits, total] = await Promise.all([
    db.deposit.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        wallet: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                displayName: true,
                avatarUrl: true,
                avatarColor: true,
              },
            },
          },
        },
      },
    }),
    db.deposit.count({ where }),
  ]);

  return {
    success: true,
    deposits: deposits.map((d) => ({
      id: d.id,
      userEmail: d.wallet.user.email,
      userId: d.wallet.user.id,
      userName: d.wallet.user.name,
      userDisplayName: d.wallet.user.displayName,
      userAvatarUrl: d.wallet.user.avatarUrl,
      userAvatarColor: d.wallet.user.avatarColor,
      amountUsdt: Number(d.amountUsdt),
      payAmount: d.amountCrypto ? Number(d.amountCrypto) : null,
      payCurrency: d.payCurrency || null,
      status: d.status as OxaPayDepositStatus,
      address: d.payAddress,
      txHash: d.txHash,
      createdAt: d.createdAt,
      confirmedAt: d.confirmedAt,
    })),
    total,
    page,
    limit,
  };
}

