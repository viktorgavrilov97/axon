import { getDepositsAction } from "@/modules/admin/api/get-deposits";
import { getWithdrawalsAction } from "@/modules/admin/api/get-withdrawals";
import { RecentActivityClient } from "./recent-activity-client";

export async function RecentActivity() {
  const [depositsResult, withdrawalsResult] = await Promise.all([
    getDepositsAction(undefined, 1, 5),
    getWithdrawalsAction(undefined, 1, 5),
  ]);

  const depositActivities = (depositsResult?.deposits || []).map((d) => ({
    id: d.id,
    type: "deposit" as const,
    userEmail: d.userEmail,
    amount: d.amountUsdt || d.payAmount || 0,
    status: d.status,
    createdAt: d.createdAt,
  }));

  const withdrawalActivities = (withdrawalsResult?.withdrawals || []).map((w) => ({
    id: w.id,
    type: "withdrawal" as const,
    userEmail: w.userEmail,
    amount: w.amount,
    status: w.status,
    createdAt: w.createdAt,
  }));

  const activities = [...depositActivities, ...withdrawalActivities]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10);

  return <RecentActivityClient activities={activities} />;
}

