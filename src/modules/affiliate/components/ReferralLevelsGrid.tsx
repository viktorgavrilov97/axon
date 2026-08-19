"use client";

import type { AffiliateDashboard } from "../api/get-dashboard";

interface ReferralLevelsGridProps {
  levels: AffiliateDashboard["levels"];
  networkLevels: AffiliateDashboard["networkLevels"];
}

export function ReferralLevelsGrid({
  levels,
  networkLevels,
}: ReferralLevelsGridProps) {
  const networkLevelsMap = new Map(
    networkLevels.map((nl) => [nl.level, nl])
  );

  return (
    <div className="w-full">
      <div className="mb-4">
        <h2 className="text-heading mb-2">Referral Levels</h2>
        <p className="text-small text-white-600">
          Levels 1–3 are always active. Levels 4–14 depend on your turnover.
        </p>
      </div>
      
      {/* Compact table view */}
      <div className="w-full overflow-x-auto">
        <div className="min-w-[600px]">
          <div className="grid grid-cols-7 gap-2 mb-2">
            {levels.slice(0, 7).map((level) => {
              const networkData = networkLevelsMap.get(level.level);
              const isOpen = level.status === "open";

              return (
                <div
                  key={level.level}
                  className={`p-2 rounded border text-center ${
                    isOpen
                      ? "bg-[#A5EACF]/10 border-[#A5EACF]"
                      : "bg-surface-800 border-onsurface-950 opacity-60"
                  }`}
                >
                  <p className="text-xs font-medium mb-1">L{level.level}</p>
                  <p className="text-xs mb-1">{(level.percent * 100).toFixed(0)}%</p>
                  <p className="text-[10px] text-white-600">
                    {isOpen ? "Open" : "Locked"}
                  </p>
                  {networkData && (
                    <div className="mt-1 pt-1 border-t border-onsurface-950">
                      <p className="text-[9px] text-white-600">
                        {networkData.totalUsers}/{networkData.activeUsers}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="grid grid-cols-7 gap-2">
            {levels.slice(7, 14).map((level) => {
              const networkData = networkLevelsMap.get(level.level);
              const isOpen = level.status === "open";

              return (
                <div
                  key={level.level}
                  className={`p-2 rounded border text-center ${
                    isOpen
                      ? "bg-[#A5EACF]/10 border-[#A5EACF]"
                      : "bg-surface-800 border-onsurface-950 opacity-60"
                  }`}
                >
                  <p className="text-xs font-medium mb-1">L{level.level}</p>
                  <p className="text-xs mb-1">{(level.percent * 100).toFixed(0)}%</p>
                  <p className="text-[10px] text-white-600">
                    {isOpen ? "Open" : "Locked"}
                  </p>
                  {networkData && (
                    <div className="mt-1 pt-1 border-t border-onsurface-950">
                      <p className="text-[9px] text-white-600">
                        {networkData.totalUsers}/{networkData.activeUsers}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
