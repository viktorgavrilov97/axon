import { TURNOVER_LEVELS } from "../lib/affiliate-config";

interface ProgressToNextLevelCardProps {
  turnover: number;
  nextLevelTurnover: number | null;
}

export function ProgressToNextLevelCard({
  turnover,
  nextLevelTurnover,
}: ProgressToNextLevelCardProps) {
  if (!nextLevelTurnover) {
    return (
      <div className="bg-surface-800 rounded-lg border border-onsurface-950 p-5">
        <h3 className="text-heading mb-3">Progress to next level</h3>
        <p className="text-small text-white-600">
          🎉 All 14 levels are unlocked! Keep your turnover active to maintain them.
        </p>
      </div>
    );
  }

  const progress = Math.min((turnover / nextLevelTurnover) * 100, 100);
  
  // Get checkpoints
  const checkpoints = TURNOVER_LEVELS.map(config => config.minTurnover);
  const currentCheckpointIndex = checkpoints.findIndex(cp => cp > turnover);
  const nextCheckpoint = currentCheckpointIndex >= 0 ? checkpoints[currentCheckpointIndex] : null;
  
  // Get levels that will unlock at next checkpoint
  const nextUnlockLevels = nextCheckpoint 
    ? TURNOVER_LEVELS.find(c => c.minTurnover === nextCheckpoint)?.levels.map(l => l.level) || []
    : [];

  return (
    <div className="bg-surface-800 rounded-lg border border-onsurface-950 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-heading">Progress to next level</h3>
        <span className="text-heading text-[#A5EACF]">{Math.round(progress)}%</span>
      </div>
      
      {/* Progress bar */}
      <div className="relative mb-4">
        <div className="w-full h-3 bg-onsurface-900 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#A5EACF] transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Checkpoints */}
        <div className="relative mt-2 h-6">
          {checkpoints.map((checkpoint, idx) => {
            const checkpointProgress = Math.min((checkpoint / nextLevelTurnover) * 100, 100);
            const isReached = turnover >= checkpoint;
            const isNext = checkpoint === nextLevelTurnover;
            
            return (
              <div
                key={checkpoint}
                className="absolute flex flex-col items-center transform -translate-x-1/2"
                style={{ left: `${checkpointProgress}%` }}
              >
                <div
                  className={`w-2 h-2 rounded-full mb-1 ${
                    isReached ? 'bg-[#A5EACF]' : isNext ? 'bg-white-600' : 'bg-onsurface-950'
                  }`}
                />
                <span className={`text-[10px] whitespace-nowrap ${isReached ? 'text-[#A5EACF]' : 'text-white-600'}`}>
                  ${(checkpoint / 1000).toFixed(0)}k
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current progress */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-small text-white-900">
          ${turnover.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ${nextLevelTurnover.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className="text-small text-white-600">
          ${(nextLevelTurnover - turnover).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to go
        </p>
      </div>

      {/* Next unlock info */}
      {nextUnlockLevels.length > 0 && (
        <div className="pt-3 border-t border-onsurface-950">
          <p className="text-xs text-white-600 mb-1">
            Unlock at ${nextLevelTurnover.toLocaleString("en-US")}:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {nextUnlockLevels.map(level => (
              <span
                key={level}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-onsurface-900 text-white-600 border border-onsurface-950"
              >
                Level {level}
              </span>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-white-600 mt-3">
        Turnover = your active strategies + 1st line active strategies
      </p>
    </div>
  );
}

