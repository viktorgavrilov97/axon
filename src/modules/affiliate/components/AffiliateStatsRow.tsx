"use client";

interface AffiliateStatsRowProps {
  turnover: number;
  nextLevelTurnover: number | null;
  activeReferralsCount: number;
  totalEarnings: number;
  todayEarnings: number;
  monthEarnings: number;
  maxOpenedLevel: number;
}

export function AffiliateStatsRow({
  turnover,
  nextLevelTurnover,
  activeReferralsCount,
  totalEarnings,
  todayEarnings,
  monthEarnings,
  maxOpenedLevel,
}: AffiliateStatsRowProps) {
  const formatCurrency = (value: number) => {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="w-full grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Total Turnover */}
      <div className="p-3 bg-surface-800 rounded-lg border border-onsurface-950">
        <p className="text-small text-white-600 mb-1.5">Total Turnover</p>
        <p className="text-heading text-white-900 mb-1">
          ${formatCurrency(turnover)}
        </p>
        {nextLevelTurnover ? (
          <p className="text-xs text-white-600">
            ${formatCurrency(nextLevelTurnover - turnover)} until next
          </p>
        ) : (
          <p className="text-xs text-white-600">Max level unlocked</p>
        )}
      </div>

      {/* Active Referrals */}
      <div className="p-3 bg-surface-800 rounded-lg border border-onsurface-950">
        <p className="text-small text-white-600 mb-1.5">Active Referrals</p>
        <p className="text-heading text-white-900 mb-1">{activeReferralsCount}</p>
        <p className="text-xs text-white-600">1st line with deposits</p>
      </div>

      {/* Earnings */}
      <div className="p-3 bg-surface-800 rounded-lg border border-onsurface-950">
        <p className="text-small text-white-600 mb-1.5">Earnings</p>
        <p className="text-heading text-white-900 mb-1">
          ${formatCurrency(totalEarnings)}
        </p>
        <p className="text-xs text-white-600">
          Today: ${formatCurrency(todayEarnings)} · Month: ${formatCurrency(monthEarnings)}
        </p>
      </div>

      {/* Highest Level */}
      <div className="p-3 bg-surface-800 rounded-lg border border-onsurface-950">
        <p className="text-small text-white-600 mb-1.5">Highest Level</p>
        <p className="text-heading text-white-900 mb-1">Level {maxOpenedLevel}</p>
        <p className="text-xs text-white-600">levels opened</p>
      </div>
    </div>
  );
}
