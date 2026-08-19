import type { AffiliateDashboard } from "../api/get-dashboard";
import { IconCoins } from "@tabler/icons-react";

interface RecentPayoutsSectionProps {
  payouts: AffiliateDashboard["recentPayouts"];
}

export function RecentPayoutsSection({ payouts }: RecentPayoutsSectionProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  if (payouts.length === 0) {
    return (
      <div>
        <h2 className="text-heading mb-4">Recent Payouts</h2>
        <div className="p-8 bg-surface-800 rounded-lg border border-onsurface-950 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-onsurface-900 flex items-center justify-center">
              <IconCoins size={24} className="text-white-600" />
            </div>
            <div>
              <p className="text-small text-white-600 mb-1">No payouts yet</p>
              <p className="text-xs text-white-600 max-w-md">
                When your partners start earning daily profit, referral rewards will appear here.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-heading mb-4">Recent Payouts</h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[500px]">
          <thead>
            <tr className="border-b border-onsurface-950">
              <th className="text-left text-small text-white-700 pb-2 pt-2 whitespace-nowrap">Date</th>
              <th className="text-left text-small text-white-700 pb-2 pt-2 whitespace-nowrap">From</th>
              <th className="text-left text-small text-white-700 pb-2 pt-2 whitespace-nowrap">Level</th>
              <th className="text-right text-small text-white-700 pb-2 pt-2 whitespace-nowrap">Amount</th>
            </tr>
          </thead>
          <tbody>
            {payouts.map((payout) => (
              <tr key={payout.id} className="border-b border-onsurface-950">
                <td className="py-2 text-small text-white-700 whitespace-nowrap">
                  {formatDate(payout.createdAt)}
                </td>
                <td className="py-2 text-small text-white-900 min-w-0">
                  <div className="max-w-[150px]">
                    <p className="truncate">{payout.fromUserDisplayName || "Unknown"}</p>
                    {payout.fromUserReferralCode && (
                      <p className="text-xs text-white-600 font-mono truncate">
                        {payout.fromUserReferralCode}
                      </p>
                    )}
                  </div>
                </td>
                <td className="py-2 text-small text-white-900 whitespace-nowrap">
                  L{payout.level}
                </td>
                <td className="py-2 text-small text-white-900 text-right whitespace-nowrap">
                  ${payout.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

