"use client";

import { useEffect, useState } from "react";
import { TerminalMetrics } from "../lib/strategies-types";
import { YieldMultiplayerStatus } from "./YieldMultiplayerStatus";
import { EarnedChart } from "@/modules/terminal/components/EarnedChart";
import { TERMINAL_CARD_PADDING } from "@/shared/ui/terminal-card/styles";
import { Button } from "@/shared/ui/button";
import { TopUpDialog } from "@/modules/wallet/components/TopUpDialog";
import { WithdrawDialog } from "@/modules/wallet/components/WithdrawDialog";
import { useAnimatedValue } from "@/shared/hooks/use-animated-value";

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

interface TerminalTickersInitialData {
  metrics: TerminalMetrics;
  yieldMultiplayer: YieldMultiplayerData;
}

interface TerminalTickersProps {
  userId: string;
  initialData?: TerminalTickersInitialData;
}

export function TerminalTickers({ userId, initialData }: TerminalTickersProps) {
  const [metrics, setMetrics] = useState<TerminalMetrics | null>(initialData?.metrics ?? null);
  const [yieldMultiplayer, setYieldMultiplayer] = useState<YieldMultiplayerData | null>(
    initialData?.yieldMultiplayer ?? null
  );
  const [loading, setLoading] = useState(!initialData);
  const [showTopUp, setShowTopUp] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);

  // Animated values - must be called unconditionally (hooks rules)
  const animatedTotal = useAnimatedValue(metrics?.total ?? 0);
  const animatedAvailable = useAnimatedValue(metrics?.available ?? 0);
  const animatedTvl = useAnimatedValue(metrics?.tvl ?? 0);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const [metricsResponse, yieldMultiplayerResponse] = await Promise.all([
          fetch("/api/strategies/metrics"),
          fetch("/api/strategies/yield-multiplayer"),
        ]);

        if (metricsResponse.ok) {
          const data = await metricsResponse.json();
          setMetrics(data);
        }

        if (yieldMultiplayerResponse.ok) {
          const boostData = await yieldMultiplayerResponse.json();
          setYieldMultiplayer(boostData);
        }
      } catch (error) {
        console.error("Error fetching metrics:", error);
      } finally {
        setLoading(false);
      }
    }

    // Skip the initial fetch if we hydrated from SSR — periodic refresh still applies.
    if (!initialData) {
      fetchMetrics();
    }
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [userId, initialData]);

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Total Block Skeleton */}
        <div className={`${TERMINAL_CARD_PADDING.className} rounded-xl bg-onsurface-900 mb-6 animate-pulse`}>
          <div className="mb-20 flex items-start justify-between">
            <div>
              <div className="h-3 bg-onsurface-950 rounded w-16 mb-2"></div>
              <div className="h-8 bg-onsurface-950 rounded w-32"></div>
            </div>
            <div className="flex gap-4">
              <div className="h-10 bg-onsurface-950 rounded w-32"></div>
              <div className="h-10 bg-onsurface-950 rounded w-32"></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="h-5 bg-onsurface-950 rounded w-24 mb-1"></div>
              <div className="h-3 bg-onsurface-950 rounded w-20 mb-6"></div>
              <div className="h-2 bg-onsurface-950 rounded w-full"></div>
            </div>
            <div>
              <div className="h-5 bg-onsurface-950 rounded w-24 mb-1"></div>
              <div className="h-3 bg-onsurface-950 rounded w-20 mb-6"></div>
              <div className="h-2 bg-onsurface-950 rounded w-full"></div>
            </div>
          </div>
        </div>
        {/* Bottom Blocks Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-full">
            <div className={`${TERMINAL_CARD_PADDING.className} rounded-xl bg-onsurface-900 h-full animate-pulse`}>
              <div className="h-5 bg-onsurface-950 rounded w-20 mb-6"></div>
              <div className="h-64 bg-onsurface-950 rounded"></div>
            </div>
          </div>
          <div className="lg:col-span-1 h-full">
            <div className={`${TERMINAL_CARD_PADDING.className} rounded-xl bg-onsurface-900 h-full animate-pulse`}>
              <div className="h-4 bg-onsurface-950 rounded w-32 mb-20"></div>
              <div className="h-8 bg-onsurface-950 rounded w-24 mb-4"></div>
              <div className="h-2 bg-onsurface-950 rounded w-full mb-6"></div>
              <div className="h-9 bg-onsurface-950 rounded w-full mb-2"></div>
              <div className="h-3 bg-onsurface-950 rounded w-full"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  // Calculate percentages for visual indicators
  const availablePercent = metrics.total > 0 ? (metrics.available / metrics.total) * 100 : 0;
  const tvlPercent = metrics.total > 0 ? (metrics.tvl / metrics.total) * 100 : 0;

  return (
    <div>
      {/* Combined Total Block with Available and TVL indicators */}
      <div className={`${TERMINAL_CARD_PADDING.className} rounded-xl bg-onsurface-900 mb-6`}>
        {/* Total at the top */}
        <div className="mb-20 sidebar:mb-20 flex items-start justify-between">
          <div>
            <p className="text-small text-white-600 mb-2">Total</p>
            <p className="text-display text-white-900" style={{ fontSize: '1.6rem' }}>
              {animatedTotal.toFixed(2)} USDT
            </p>
          </div>
          {/* Buttons on desktop - hidden on mobile */}
          <div className="hidden sidebar:flex gap-4">
            <Button
              variant="primary"
              size="lg"
              onClick={() => setShowTopUp(true)}
            >
              Top up balance
            </Button>
            <Button
              variant="primary"
              size="lg"
              onClick={() => setShowWithdraw(true)}
            >
              Withdrawal
            </Button>
          </div>
        </div>

        {/* Available and TVL with visual indicators - like Cashflow in/out */}
        <div className="grid grid-cols-2 gap-6">
          {/* Available */}
          <div>
            <p className="text-body text-white-900 mb-1">{animatedAvailable.toFixed(2)} USDT</p>
            <p className="text-sm text-white-700 mb-6">Available</p>
            <div className="relative">
              <p className="text-sm text-white-700 mb-3">{availablePercent.toFixed(1)}%</p>
              <div className="h-1.5 bg-onsurface-950 rounded-full overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ width: `${availablePercent}%`, backgroundColor: '#FFFDB6' }}
                />
              </div>
            </div>
          </div>

          {/* TVL */}
          <div>
            <p className="text-body text-white-900 mb-1">{animatedTvl.toFixed(2)} USDT</p>
            <p className="text-sm text-white-700 mb-6">Invested (locked)</p>
            <div className="relative">
              <p className="text-sm text-white-700 mb-3">{tvlPercent.toFixed(1)}%</p>
              <div className="h-1.5 bg-onsurface-950 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white-900 rounded-full transition-all"
                  style={{ width: `${tvlPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Buttons on mobile - shown at bottom, full width */}
        <div className="flex flex-row gap-4 mt-6 sidebar:hidden">
          <Button
            variant="primary"
            size="lg"
            onClick={() => setShowTopUp(true)}
            className="flex-1"
          >
            Top up balance
          </Button>
          <Button
            variant="primary"
            size="lg"
            onClick={() => setShowWithdraw(true)}
            className="flex-1"
          >
            Withdrawal
          </Button>
        </div>
      </div>

      {/* Bottom Blocks: Earned Chart and Yield Multiplayer */}
      <div className="grid grid-cols-1 yield:grid-cols-3 gap-6">
        {/* Earned Chart Block - spans 2 columns (same width as Total + Available) */}
        <div className="yield:col-span-2 h-full">
          <EarnedChart />
        </div>

        {/* Yield Multiplayer Status Block - spans 1 column (same width as TVL) */}
        <div className="yield:col-span-1 h-full">
          {yieldMultiplayer && <YieldMultiplayerStatus boostData={yieldMultiplayer} />}
        </div>
      </div>

      {showTopUp && (
        <TopUpDialog
          onClose={() => setShowTopUp(false)}
        />
      )}

      {showWithdraw && (
        <WithdrawDialog
          onClose={() => setShowWithdraw(false)}
        />
      )}
    </div>
  );
}

