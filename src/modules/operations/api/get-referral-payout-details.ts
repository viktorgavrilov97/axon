"use server";

import { db } from "@/shared/lib/db";
import { getCurrentUser } from "@/shared/lib/auth";
import { getUserDisplayName } from "@/shared/lib/user-display";
import { getLevelPercent } from "@/modules/affiliate/lib/affiliate-config";
import { isTestMode } from "@/shared/lib/env";
import { getProfitPeriodBounds } from "@/config/profit-period";

export interface ReferralPayoutDetail {
  fromUserId: string;
  fromUserName: string;
  fromUserDisplayName: string | null;
  fromUserAvatarUrl: string | null;
  fromUserAvatarColor: string | null;
  level: number;
  percent: number;
  amount: number;
}

export interface ReferralPayoutDetails {
  transactionId: string;
  totalAmount: number;
  periodStart: Date;
  periodEnd: Date;
  breakdown: ReferralPayoutDetail[];
  createdAt: Date;
}

/**
 * Get detailed information about a referral payout transaction
 */
export async function getReferralPayoutDetails(
  transactionId: string
): Promise<ReferralPayoutDetails | { error: string }> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Unauthorized" };
  }

  // Get transaction with wallet to verify ownership
  const transaction = await db.transaction.findUnique({
    where: { id: transactionId },
    include: {
      wallet: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!transaction) {
    return { error: "Transaction not found" };
  }

  // Verify transaction belongs to current user
  if (transaction.wallet.userId !== user.id) {
    return { error: "Unauthorized" };
  }

  // Verify it's a referral payout
  if (transaction.type !== "REFERRAL_PAYOUT") {
    return { error: "Not a referral payout transaction" };
  }

  const meta = transaction.meta as any;
  const breakdown = meta?.breakdown || [];
  const periodStartStr = meta?.periodStart;

  if (!periodStartStr || !Array.isArray(breakdown) || breakdown.length === 0) {
    return { error: "Invalid payout data" };
  }

  const periodStart = new Date(periodStartStr);
  const { periodEnd } = getProfitPeriodBounds(periodStart);

  // Get user details for each fromUserId
  const userIds = [...new Set(breakdown.map((b: any) => b.fromUserId))];
  const users = await db.user.findMany({
    where: {
      id: { in: userIds },
    },
    select: {
      id: true,
      email: true,
      name: true,
      displayName: true,
      avatarUrl: true,
      avatarColor: true,
    },
  });

  const usersMap = new Map(users.map((u) => [u.id, u]));

  // Build detailed breakdown
  const detailedBreakdown: ReferralPayoutDetail[] = breakdown.map((b: any) => {
    const user = usersMap.get(b.fromUserId);
    const level = typeof b.level === "number" ? b.level : parseInt(b.level, 10);
    const percent = getLevelPercent(level) || 0;
    return {
      fromUserId: b.fromUserId,
      fromUserName: user ? getUserDisplayName(user) : "Unknown",
      fromUserDisplayName: user?.displayName || null,
      fromUserAvatarUrl: user?.avatarUrl || null,
      fromUserAvatarColor: user?.avatarColor || null,
      level,
      percent,
      amount: typeof b.amount === "string" ? parseFloat(b.amount) : Number(b.amount),
    };
  });

  return {
    transactionId: transaction.id,
    totalAmount: Number(transaction.amount),
    periodStart,
    periodEnd,
    breakdown: detailedBreakdown,
    createdAt: transaction.createdAt,
  };
}

