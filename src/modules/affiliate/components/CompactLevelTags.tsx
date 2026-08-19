import type { AffiliateDashboard } from "../api/get-dashboard";

interface CompactLevelTagsProps {
  levels: AffiliateDashboard["levels"];
}

export function CompactLevelTags({ levels }: CompactLevelTagsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {levels.map((level) => {
        const isOpen = level.status === "open";
        const percent = (level.percent * 100).toFixed(0);

        return (
          <div
            key={level.level}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border transition-all ${
              isOpen
                ? "bg-[#A5EACF]/10 border-[#A5EACF] text-[#A5EACF]"
                : "bg-onsurface-900 border-onsurface-950 text-white-600"
            }`}
          >
            <span className="font-medium">L{level.level}</span>
            <span>•</span>
            <span>{percent}%</span>
            {isOpen ? (
              <span className="text-[#A5EACF]">✓</span>
            ) : (
              <>
                <span>🔒</span>
                {level.requiredTurnover > 0 && (
                  <span className="text-white-500">
                    (${level.requiredTurnover.toLocaleString("en-US")})
                  </span>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

