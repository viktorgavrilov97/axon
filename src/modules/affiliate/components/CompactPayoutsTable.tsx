import type { AffiliateDashboard } from "../api/get-dashboard";
import { getUserDisplayName } from "@/shared/lib/user-display";

interface CompactPayoutsTableProps {
  payouts: AffiliateDashboard["recentPayouts"];
}

export function CompactPayoutsTable({ payouts }: CompactPayoutsTableProps) {
  if (payouts.length === 0) {
    return (
      <div className="p-4 bg-surface-800 rounded-lg border border-onsurface-950 text-center">
        <p className="text-sm text-white-600">No payouts yet.</p>
      </div>
    );
  }

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-onsurface-950">
            <th className="text-left py-2 px-2 text-white-600 font-normal">Date</th>
            <th className="text-left py-2 px-2 text-white-600 font-normal">User</th>
            <th className="text-left py-2 px-2 text-white-600 font-normal">Level</th>
            <th className="text-right py-2 px-2 text-white-600 font-normal">Amount</th>
          </tr>
        </thead>
        <tbody>
          {payouts.map((payout) => (
            <tr key={payout.id} className="border-b border-onsurface-950">
              <td className="py-2 px-2 text-white-900">{formatDate(payout.createdAt)}</td>
              <td className="py-2 px-2 text-white-900">
                {getUserDisplayName({
                  email: payout.fromUserEmail,
                  name: payout.fromUserName,
                  displayName: payout.fromUserDisplayName,
                })}
              </td>
              <td className="py-2 px-2 text-white-900">L{payout.level}</td>
              <td className="py-2 px-2 text-white-900 text-right">
                ${formatCurrency(payout.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

