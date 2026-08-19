"use client";

import type { AffiliateDashboard } from "../api/get-dashboard";

interface NetworkTreePreviewProps {
  networkLevels: AffiliateDashboard["networkLevels"];
}

export function NetworkTreePreview({ networkLevels }: NetworkTreePreviewProps) {
  const totalUsers = networkLevels.reduce((sum, level) => sum + level.totalUsers, 0);
  const totalActive = networkLevels.reduce((sum, level) => sum + level.activeUsers, 0);

  return (
    <div className="w-full bg-surface-800 rounded-lg border border-onsurface-950 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-heading">Network Overview</h3>
        <div className="flex items-center gap-4 text-small">
          <div className="text-white-600">
            Total: <span className="text-white-900 font-medium">{totalUsers}</span>
          </div>
          <div className="text-white-600">
            Active: <span className="text-white-900 font-medium">{totalActive}</span>
          </div>
        </div>
      </div>
      
      {/* Compact horizontal view */}
      <div className="w-full overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          <div className="flex flex-col items-center gap-1 flex-shrink-0 px-2">
            <div className="w-10 h-10 rounded-full bg-[#A5EACF]/20 border-2 border-[#A5EACF] flex items-center justify-center">
              <span className="text-xs text-[#A5EACF] font-medium">You</span>
            </div>
            <p className="text-[10px] text-white-600">L0</p>
          </div>
          
          {networkLevels.map((level) => (
            <div key={level.level} className="flex items-center gap-1 flex-shrink-0">
              <div className="w-3 h-0.5 bg-onsurface-950" />
              <div className="flex flex-col items-center gap-1 px-1">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                    level.totalUsers > 0
                      ? "bg-[#A5EACF]/10 border-[#A5EACF]"
                      : "bg-onsurface-900 border-onsurface-950"
                  }`}
                >
                  <span
                    className={`text-[9px] font-medium ${
                      level.totalUsers > 0 ? "text-[#A5EACF]" : "text-white-600"
                    }`}
                  >
                    {level.level}
                  </span>
                </div>
                <div className="text-center min-w-[30px]">
                  <p className="text-[10px] text-white-900 font-medium">{level.totalUsers}</p>
                  <p className="text-[9px] text-white-600">{level.activeUsers}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
