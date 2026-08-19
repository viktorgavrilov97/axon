"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/shared/ui/button";
import { TERMINAL_CARD_PADDING } from "@/shared/ui/terminal-card/styles";
import clsx from "clsx";

interface YieldMultiplayerData {
  active: boolean;
  baseBonusPercent?: number;
  diversityScore?: number;
  effectiveBonusPercent?: number;
  activeStrategiesCount?: number;
  largestShare?: number;
  message?: string;
  hint?: string;
}

interface YieldMultiplayerStatusProps {
  boostData: YieldMultiplayerData;
}

const MAX_VALUE = 12;
const SEGMENT_WIDTH = 2; // px
const SEGMENT_GAP = 8; // px

export function YieldMultiplayerStatus({ boostData }: YieldMultiplayerStatusProps) {
  const [totalSegments, setTotalSegments] = useState(40);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate number of segments based on container width
  useEffect(() => {
    const updateSegments = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        // Calculate how many segments fit: (width + gap) / (segment_width + gap)
        // We add gap to account for the fact that the last segment doesn't have a gap after it
        // This ensures segments fill the entire width
        const segmentsPerRow = Math.floor((containerWidth + SEGMENT_GAP) / (SEGMENT_WIDTH + SEGMENT_GAP));
        setTotalSegments(Math.max(10, Math.min(segmentsPerRow, 100))); // min 10, max 100
      }
    };

    // Use ResizeObserver for more accurate width tracking
    if (containerRef.current) {
      const resizeObserver = new ResizeObserver(updateSegments);
      resizeObserver.observe(containerRef.current);
      
      // Initial calculation with a small delay to ensure DOM is ready
      setTimeout(updateSegments, 0);
      
      return () => {
        resizeObserver.disconnect();
      };
    }
  }, []);

  // Show active boost with new design
  if (boostData.active && boostData.effectiveBonusPercent && boostData.effectiveBonusPercent > 0) {
    const value = boostData.effectiveBonusPercent;
    const safeValue = Math.max(0, Math.min(value, MAX_VALUE));
    const activeSegments = Math.round((safeValue / MAX_VALUE) * totalSegments);

    return (
      <>
        <section
          className={clsx(
            "relative flex flex-col justify-between rounded-xl border border-onsurface-950 bg-onsurface-900 text-white h-full",
            TERMINAL_CARD_PADDING.className
          )}
        >
          {/* Header */}
          <header className="flex items-center justify-between gap-4   mb-0">
            <div className="text-sm text-white-900">
              Yield multiplayer
            </div>
          </header>

          {/* Value, Energy bar and Description */}
          <div className="mt-20">
            <div className="text-4xl md:text-3xl text-white-900 mb-8 pr-12">
              +{safeValue.toFixed(2)}%
            </div>
            <div ref={containerRef} className="flex items-end mb-6 w-full">
              {Array.from({ length: totalSegments }).map((_, index) => {
                const isActive = index < activeSegments;
                return (
                  <motion.div
                    key={index}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{
                      duration: 0.4,
                      delay: index * 0.015,
                    }}
                    className={clsx(
                      "h-[40px]",
                      isActive ? "" : "bg-onsurface-800"
                    )}
                    style={{
                      width: `${SEGMENT_WIDTH}px`,
                      marginRight: index < totalSegments - 1 ? `${SEGMENT_GAP}px` : '0',
                      backgroundColor: isActive ? '#FFFDB6' : undefined,
                    }}
                  />
                );
              })}
            </div>
          </div>
          
          {/* Button */}
          <a
            href="/yield"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="block mb-4"
          >
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
            >
              How it works?
            </Button>
          </a>
          
          {/* Description */}
          <p className="text-xs md:text-xs text-white-700">
            You earn +{safeValue.toFixed(2)}% on today&apos;s profit. Your strategies
            unlocked an extra boost on all today&apos;s payouts.
          </p>
        </section>
      </>
    );
  }

  // Show potential boost (exists but not active yet)
  if (!boostData.active && boostData.effectiveBonusPercent && boostData.effectiveBonusPercent > 0) {
    return (
      <div className="w-full h-full text-left p-6 rounded-xl bg-onsurface-900 hover:bg-onsurface-950 transition-colors flex flex-col">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="text-body text-white-700 font-medium mb-1">Yield Multiplayer potential</h3>
            <p className="text-small text-white-600">
              {boostData.message || `Potential boost: +${boostData.effectiveBonusPercent.toFixed(2)}% (balance your portfolio to activate)`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-heading text-white-600">+{boostData.effectiveBonusPercent.toFixed(2)}%</p>
          </div>
        </div>
        {boostData.hint && (
          <p className="text-small text-white-600 mt-2">
            {boostData.hint}
          </p>
        )}
        <div className="mt-6">
          <a
            href="/yield"
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <Button
              variant="primary"
              size="sm"
            >
              How Yield Multiplayer works
            </Button>
          </a>
        </div>
      </div>
    );
  }

  // No boost available - use same UI as active state but with 0%
  const activeStrategiesCount = boostData.activeStrategiesCount || 0;
  const safeValue = 0;
  const activeSegments = 0; // No active segments

  return (
    <>
      <section
        className={clsx(
          "relative flex flex-col justify-between rounded-xl border border-onsurface-950 bg-onsurface-900 text-white h-full",
          TERMINAL_CARD_PADDING.className
        )}
      >
        {/* Header */}
        <header className="flex items-center justify-between gap-4   mb-0">
          <div className="text-sm text-white-900">
            No Yield Multiplayer yet
          </div>
        </header>

        {/* Value, Energy bar and Description */}
        <div className="mt-20">
          <div className="text-4xl md:text-3xl text-white-900 mb-8 pr-12">
            +{safeValue.toFixed(2)}%
          </div>
          <div ref={containerRef} className="flex items-end mb-6 w-full">
            {Array.from({ length: totalSegments }).map((_, index) => {
              const isActive = index < activeSegments;
              return (
                <motion.div
                  key={index}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{
                    duration: 0.4,
                    delay: index * 0.015,
                  }}
                  className={clsx(
                    "h-[40px]",
                    isActive ? "" : "bg-onsurface-800"
                  )}
                  style={{
                    width: `${SEGMENT_WIDTH}px`,
                    marginRight: index < totalSegments - 1 ? `${SEGMENT_GAP}px` : '0',
                    backgroundColor: isActive ? '#FFFDB6' : undefined,
                  }}
                />
              );
            })}
          </div>
        </div>
        
        {/* Button */}
        <a
          href="/yield"
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            e.stopPropagation();
          }}
          className="block mb-4"
        >
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
          >
            How it works?
          </Button>
        </a>
        
        {/* Description */}
        <p className="text-xs md:text-xs text-white-700">
          You have {activeStrategiesCount} active strateg{activeStrategiesCount === 1 ? 'y' : 'ies'}. Open at least 2 strategies to unlock boosted daily profits.
        </p>
      </section>
    </>
  );
}
