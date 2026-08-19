"use client";

import { getNextLevelThreshold, TURNOVER_LEVELS } from "../lib/affiliate-config";
import { Button } from "@/shared/ui/button";
import type { AffiliateDashboard } from "../api/get-dashboard";

interface CompactProgressBarProps {
  turnover: number;
  nextLevelTurnover: number | null;
  currentLevel: number;
  levels: AffiliateDashboard["levels"];
}

export function CompactProgressBar({
  turnover,
  nextLevelTurnover,
  currentLevel,
  levels,
}: CompactProgressBarProps) {
  const formatCurrency = (value: number) => {
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  // Find which levels will unlock next
  const getNextUnlockLevels = () => {
    if (!nextLevelTurnover) return null;
    
    for (const config of TURNOVER_LEVELS) {
      if (config.minTurnover === nextLevelTurnover) {
        return config.levels.map(l => `Level ${l.level} (${(l.percent * 100).toFixed(0)}%)`).join(", ");
      }
    }
    return null;
  };

  const nextLevels = getNextUnlockLevels();
  const progress = nextLevelTurnover ? Math.min((turnover / nextLevelTurnover) * 100, 100) : 100;

  return (
    <>
      <div className="space-y-4">
        {/* Your Level */}
        <div>
          <p className="text-caption text-white-600 mb-3">Your level</p>
          <p className="text-display text-white-900" style={{ fontSize: '1.6rem' }}>Level {currentLevel} / 14</p>
        </div>

        {/* Turnover */}
        <div className="flex items-center justify-between">
          <span className="text-body text-white-600">Turnover:</span>
          <span className="text-body text-white-900">
            {formatCurrency(turnover)} USDT / {nextLevelTurnover ? `${formatCurrency(nextLevelTurnover)} USDT` : "—"}
          </span>
        </div>

        {nextLevelTurnover && (
          <>
            <div className="w-full h-2 bg-onsurface-800 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{ width: `${progress}%`, backgroundColor: '#FFFDAD' }}
              />
            </div>

            {nextLevels && (
              <div className="flex items-center justify-between">
                <span className="text-small text-white-600">Next unlock:</span>
                <span className="text-small text-white-900">{nextLevels}</span>
              </div>
            )}
          </>
        )}

        <p className="text-small text-white-600">
          Your turnover = your active strategies + 1st line active strategies
        </p>

        {/* How levels work button */}
        <a
          href="/referral-levels"
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <Button
            variant="primary"
            size="lg"
            className="w-full"
          >
            How levels work
          </Button>
        </a>
      </div>
    </>
  );
}

