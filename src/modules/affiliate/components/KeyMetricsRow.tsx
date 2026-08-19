interface KeyMetricsRowProps {
  turnover: number;
  nextLevelTurnover: number | null;
  activeReferralsCount: number;
  todayEarnings: number;
  monthEarnings: number;
  maxOpenedLevel: number;
}

export function KeyMetricsRow({
  turnover,
  nextLevelTurnover,
  activeReferralsCount,
  todayEarnings,
  monthEarnings,
  maxOpenedLevel,
}: KeyMetricsRowProps) {
  const formatCurrency = (value: number) => {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Turnover */}
      <div className="p-4 bg-surface-800 rounded-lg border border-onsurface-950">
        <p className="text-small text-white-600 mb-1.5">Turnover</p>
        <p className="text-heading text-white-900 mb-1">${formatCurrency(turnover)}</p>
        {nextLevelTurnover ? (
          <p className="text-xs text-white-600">
            ${formatCurrency(nextLevelTurnover - turnover)} until next unlock
          </p>
        ) : (
          <p className="text-xs text-white-600">All levels unlocked</p>
        )}
      </div>

      {/* Active Referrals */}
      <div className="p-4 bg-surface-800 rounded-lg border border-onsurface-950">
        <p className="text-small text-white-600 mb-1.5">Active Referrals</p>
        <p className="text-heading text-white-900 mb-1">{activeReferralsCount}</p>
        <p className="text-xs text-white-600">1st line with active strategies</p>
      </div>

      {/* Earnings */}
      <div className="p-4 bg-surface-800 rounded-lg border border-onsurface-950">
        <p className="text-small text-white-600 mb-1.5">Earnings</p>
        <p className="text-heading text-white-900 mb-1">${formatCurrency(todayEarnings)}</p>
        <p className="text-xs text-white-600">
          Daily / ${formatCurrency(monthEarnings)} monthly
        </p>
      </div>

      {/* Highest Level */}
      <div className="p-4 bg-surface-800 rounded-lg border border-onsurface-950">
        <p className="text-small text-white-600 mb-1.5">Highest Level</p>
        <p className="text-heading text-white-900 mb-1">Level {maxOpenedLevel}</p>
        <p className="text-xs text-white-600">levels opened</p>
      </div>
    </div>
  );
}

