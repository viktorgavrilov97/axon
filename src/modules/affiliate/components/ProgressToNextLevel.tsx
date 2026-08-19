"use client";

interface ProgressToNextLevelProps {
  turnover: number;
  nextLevelTurnover: number | null;
}

export function ProgressToNextLevel({
  turnover,
  nextLevelTurnover,
}: ProgressToNextLevelProps) {
  if (!nextLevelTurnover) {
    return (
      <div className="w-full bg-surface-800 rounded-lg border border-onsurface-950 p-4">
        <h3 className="text-heading mb-2">Progress to next level</h3>
        <p className="text-small text-white-600">
          All 14 levels are unlocked. Keep your turnover active to maintain them.
        </p>
      </div>
    );
  }

  const progress = Math.min((turnover / nextLevelTurnover) * 100, 100);

  return (
    <div className="w-full bg-surface-800 rounded-lg border border-onsurface-950 p-4">
      <h3 className="text-heading mb-3">Progress to next level</h3>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-small text-white-900">
            ${turnover.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ${nextLevelTurnover.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-small text-white-600 flex-shrink-0">{Math.round(progress)}%</p>
        </div>
        <div className="w-full h-2 bg-onsurface-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#A5EACF] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-white-600">
          Turnover = your active strategies + 1st line active strategies
        </p>
      </div>
    </div>
  );
}
