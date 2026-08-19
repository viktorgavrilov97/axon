"use client";

import { useEffect, useState } from "react";
import { getProfitPeriodBounds } from "@/config/profit-period";
import { isTestMode } from "@/shared/lib/env";

/**
 * Component to display next payout time
 * Shows countdown to next profit period
 */
export function NextPayoutTimer() {
  const [timeUntilNext, setTimeUntilNext] = useState<string>("");
  const [mounted, setMounted] = useState(false);
  const [testMode, setTestMode] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTestMode(isTestMode());
    
    const updateTimer = () => {
      const now = new Date();
      const { periodEnd } = getProfitPeriodBounds(now);
      
      // Next payout is at the start of the next period
      const nextPayout = periodEnd;
      const diff = nextPayout.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeUntilNext("Now");
        return;
      }

      if (testMode) {
        // Test mode: show seconds
        const seconds = Math.floor(diff / 1000);
        setTimeUntilNext(`${seconds}s`);
      } else {
        // Production mode: show hours and minutes
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (hours > 0) {
          setTimeUntilNext(`${hours}h ${minutes}m`);
        } else {
          setTimeUntilNext(`${minutes}m`);
        }
      }
    };

    // Update immediately
    updateTimer();

    // Update every second in test mode, every minute in production
    const interval = setInterval(updateTimer, testMode ? 1000 : 60000);

    return () => clearInterval(interval);
  }, [testMode]);

  // Don't render timer until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="flex items-center gap-2 text-body text-white-600">
        <span>Profits run every 1 minute</span>
        <span>•</span>
        <span>Next payout in ...</span>
      </div>
    );
  }

  // Format the run time text
  const runTimeText = testMode 
    ? "Profits run every 1 minute" 
    : "Daily profits run at 00:00 UTC";

  return (
    <div className="flex items-center gap-2 text-body text-white-600">
      <span>{runTimeText}</span>
      <span>•</span>
      <span>Next payout in {timeUntilNext}</span>
    </div>
  );
}

