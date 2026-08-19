import { getCurrentUser } from "@/shared/lib/auth";
import { db } from "@/shared/lib/db";
import { redirect } from "next/navigation";
import { RecentActivity } from "./recent-activity";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  if (!user || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
    redirect("/operations");
  }

  // Get statistics
  const [
    totalUsers,
    pendingDeposits,
    recentConfirmedDeposits,
    totalBalance,
  ] = await Promise.all([
    // Total users
    db.user.count(),
    // Active deposits (paying)
    db.deposit.count({
      where: { status: "paying" },
    }),
    // Paid deposits in last 24 hours
    db.deposit.count({
      where: {
        status: "paid",
        confirmedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    }),
    // Total balance from all wallets
    db.wallet.aggregate({
      _sum: {
        balanceUsdt: true,
      },
    }),
  ]);

  const balance = totalBalance._sum?.balanceUsdt || 0;

  return (
    <div className="p-4">
      <h1 className="text-2xl text-white-900 mb-2">Dashboard</h1>
      <p className="text-body text-white-700 mb-6">
        System overview
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total Users */}
        <div className="bg-onsurface-900 p-6 rounded-xl">
          <h3 className="text-body text-white-700 mb-2">Total users</h3>
          <p className="text-heading text-white-900">{totalUsers}</p>
        </div>

        {/* Pending Deposits */}
        <div className="bg-onsurface-900 p-6 rounded-xl">
          <h3 className="text-body text-white-700 mb-2">
            Active deposits
          </h3>
          <p className="text-heading text-white-900">{pendingDeposits}</p>
        </div>

        {/* Recent Confirmed Deposits */}
        <div className="bg-onsurface-900 p-6 rounded-xl">
          <h3 className="text-body text-white-700 mb-2">
            Confirmed in 24h
          </h3>
          <p className="text-heading text-white-900">
            {recentConfirmedDeposits}
          </p>
        </div>

        {/* Total Balance */}
        <div className="bg-onsurface-900 p-6 rounded-xl">
          <h3 className="text-body text-white-700 mb-2">
            Total balance
          </h3>
          <p className="text-heading text-white-900">
            {Number(balance).toFixed(2)} USDT
          </p>
        </div>
      </div>

      {/* Recent Activity */}
      <RecentActivity />
    </div>
  );
}

