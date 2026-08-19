import type { AffiliateDashboard } from "../api/get-dashboard";

interface ReferralLevelsSectionProps {
  levels: AffiliateDashboard["levels"];
  networkLevels: AffiliateDashboard["networkLevels"];
}

export function ReferralLevelsSection({
  levels,
  networkLevels,
}: ReferralLevelsSectionProps) {
  const alwaysActiveLevels = levels.filter(l => l.level <= 3);
  const turnoverRequiredLevels = levels.filter(l => l.level > 3);
  
  const networkLevelsMap = new Map(
    networkLevels.map((nl) => [nl.level, nl])
  );

  const LevelCard = ({ level }: { level: typeof levels[0] }) => {
    const networkData = networkLevelsMap.get(level.level);
    const isOpen = level.status === "open";

    return (
      <div
        className={`p-3 rounded-lg border transition-all ${
          isOpen
            ? "bg-[#A5EACF]/10 border-[#A5EACF]"
            : "bg-surface-800 border-onsurface-950 opacity-60"
        }`}
      >
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <p className="text-heading text-sm font-medium">Level {level.level}</p>
            {isOpen && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] bg-[#A5EACF]/20 text-[#A5EACF]">
                ✓
              </span>
            )}
          </div>
          <p className="text-body text-sm">{(level.percent * 100).toFixed(0)}%</p>
          <div
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${
              isOpen
                ? "bg-[#A5EACF]/20 text-[#A5EACF]"
                : "bg-onsurface-900 text-white-600"
            }`}
          >
            {isOpen ? "Unlocked" : "Locked"}
          </div>
          {!isOpen && level.requiredTurnover > 0 && (
            <p className="text-[10px] text-white-600 pt-1 border-t border-onsurface-950">
              ${level.requiredTurnover.toLocaleString("en-US")} to unlock
            </p>
          )}
          {networkData && networkData.todayEarningsFromLevel > 0 && (
            <p className="text-[10px] text-[#A5EACF] pt-1 border-t border-onsurface-950">
              Today: ${networkData.todayEarningsFromLevel.toFixed(2)}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Always Active Levels */}
      <div>
        <h2 className="text-heading mb-2">Always Active Levels</h2>
        <p className="text-small text-white-600 mb-4">
          Levels 1–3 are always unlocked. Start earning immediately from your direct referrals.
        </p>
        <div className="grid grid-cols-3 gap-3">
          {alwaysActiveLevels.map((level) => (
            <LevelCard key={level.level} level={level} />
          ))}
        </div>
      </div>

      {/* Turnover Required Levels */}
      <div>
        <h2 className="text-heading mb-2">Turnover Required Levels</h2>
        <p className="text-small text-white-600 mb-4">
          Levels 4–14 unlock as your turnover grows. Unlock more levels to earn from deeper network levels.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-11 gap-3 overflow-x-auto">
          {turnoverRequiredLevels.map((level) => (
            <LevelCard key={level.level} level={level} />
          ))}
        </div>
      </div>
    </div>
  );
}

