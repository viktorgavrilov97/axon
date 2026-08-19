import type { AffiliateDashboard } from "../api/get-dashboard";

interface NetworkTreeSectionProps {
  networkLevels: AffiliateDashboard["networkLevels"];
}

export function NetworkTreeSection({ networkLevels }: NetworkTreeSectionProps) {
  const formatCurrency = (value: number) => {
    if (value === 0) return "$0";
    if (value < 1000) return `$${value.toFixed(2)}`;
    if (value < 1000000) return `$${(value / 1000).toFixed(1)}k`;
    return `$${(value / 1000000).toFixed(2)}M`;
  };

  return (
    <div className="bg-surface-800 rounded-lg border border-onsurface-950 p-5">
      <h3 className="text-heading mb-4">Network Overview</h3>
      
      <div className="overflow-x-auto pb-2 -mx-4 md:mx-0 px-4 md:px-0">
        <div className="flex items-start gap-2 min-w-max">
          {/* Level 0 - You */}
          <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-[#A5EACF]/20 border-2 border-[#A5EACF] flex items-center justify-center">
              <span className="text-small text-[#A5EACF] font-medium">You</span>
            </div>
            <p className="text-xs text-white-600">Level 0</p>
          </div>

          {/* Levels 1-14 */}
          {networkLevels.map((level, idx) => (
            <div key={level.level} className="flex items-start gap-1 flex-shrink-0">
              {/* Connector line */}
              <div className="w-3 h-0.5 bg-onsurface-950 mt-6" />
              
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    level.totalUsers > 0
                      ? "bg-[#A5EACF]/10 border-[#A5EACF]"
                      : "bg-onsurface-900 border-onsurface-950"
                  }`}
                >
                  <span
                    className={`text-xs font-medium ${
                      level.totalUsers > 0 ? "text-[#A5EACF]" : "text-white-600"
                    }`}
                  >
                    L{level.level}
                  </span>
                </div>
                <div className="text-center min-w-[70px]">
                  <p className="text-xs text-white-900 font-medium">
                    {level.totalUsers} {level.totalUsers === 1 ? 'user' : 'users'}
                  </p>
                  <p className="text-[10px] text-white-600">
                    {level.activeUsers} active
                  </p>
                  {level.teamTurnover > 0 && (
                    <p className="text-[10px] text-[#A5EACF] mt-0.5 font-medium">
                      {formatCurrency(level.teamTurnover)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <p className="text-xs text-white-600 mt-4 text-center">
        Visual representation of your referral network depth (up to 14 levels)
      </p>
    </div>
  );
}

