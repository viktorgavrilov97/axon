"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import { PeriodType } from "@/shared/ui/period-select";
import { Button } from "@/shared/ui/button";
import { MODAL_STYLES } from "@/shared/ui/modal/styles";
import { TERMINAL_CARD_PADDING } from "@/shared/ui/terminal-card/styles";
import { useAnimatedValue } from "@/shared/hooks/use-animated-value";
import { CaretDown } from "@phosphor-icons/react";

interface EarningsDataPoint {
  date: string;
  investmentProfit: number;
  yieldMultiplayerProfit: number;
  referralProfit: number;
  actualDate?: string; // Actual time of the latest transaction in this period
}

interface EarningsResponse {
  data: EarningsDataPoint[];
  totals: {
    investmentProfit: number;
    yieldMultiplayerProfit: number;
    referralProfit: number;
  };
  period: PeriodType;
  profitPeriodMinutes: number;
  isTestMode: boolean;
}

const periods: { value: PeriodType; label: string }[] = [
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "halfyear", label: "Half Year" },
  { value: "all", label: "All Time" },
];

export function EarnedChart() {
  const [period, setPeriod] = useState<PeriodType>("all");
  const [earningsData, setEarningsData] = useState<EarningsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);

  // Animated values - must be called unconditionally (hooks rules)
  const totalEarned = earningsData?.totals 
    ? earningsData.totals.investmentProfit + earningsData.totals.yieldMultiplayerProfit + earningsData.totals.referralProfit 
    : 0;
  const animatedTotal = useAnimatedValue(totalEarned);
  const animatedInvestment = useAnimatedValue(earningsData?.totals.investmentProfit ?? 0);
  const animatedYield = useAnimatedValue(earningsData?.totals.yieldMultiplayerProfit ?? 0);
  const animatedReferral = useAnimatedValue(earningsData?.totals.referralProfit ?? 0);

  useEffect(() => {
    async function fetchEarnings() {
      setLoading(true);
      try {
        const response = await fetch(`/api/strategies/earnings?period=${period}`);
        if (response.ok) {
          const data = await response.json();
          console.log("[EarnedChart] Fetched earnings data:", data);
          console.log("[EarnedChart] Data points count:", data.data?.length || 0);
          setEarningsData(data);
        } else {
          const errorText = await response.text();
          console.error("[EarnedChart] Error response:", response.status, errorText);
        }
      } catch (error) {
        console.error("[EarnedChart] Error fetching earnings:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchEarnings();
  }, [period]);

  if (loading) {
    return (
      <div className={`${TERMINAL_CARD_PADDING.className} rounded-xl bg-onsurface-900 h-full animate-pulse`}>
        <div className="flex items-center justify-between mb-6">
          <div className="h-5 bg-onsurface-950 rounded w-20"></div>
          <div className="h-9 bg-onsurface-950 rounded w-24"></div>
        </div>
        <div className="flex flex-wrap items-start gap-16 mb-6">
          <div className="h-4 bg-onsurface-950 rounded w-24"></div>
          <div className="h-4 bg-onsurface-950 rounded w-20"></div>
          <div className="h-4 bg-onsurface-950 rounded w-28"></div>
          <div className="h-4 bg-onsurface-950 rounded w-16"></div>
        </div>
        <div className="h-64 bg-onsurface-950 rounded"></div>
      </div>
    );
  }

  // Use empty data if no earnings data available
  const safeEarningsData = earningsData || {
    data: [],
    totals: {
      investmentProfit: 0,
      yieldMultiplayerProfit: 0,
      referralProfit: 0,
    },
    period: period,
    profitPeriodMinutes: 1,
    isTestMode: true,
  };

  // Format data for chart - accumulate values over time for better visualization
  let cumulativeInvestment = 0;
  let cumulativeYieldMultiplayer = 0;
  let cumulativeReferral = 0;

  const isTestMode = safeEarningsData.profitPeriodMinutes === 1;
  
  // Generate default empty data if no data available
  let sortedData = [...safeEarningsData.data];
  
  if (sortedData.length === 0) {
    // Generate default dates based on period
    const now = new Date();
    const defaultDates: string[] = [];
    
    switch (period) {
      case "week":
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          defaultDates.push(date.toISOString());
        }
        break;
      case "month":
        for (let i = 29; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          defaultDates.push(date.toISOString());
        }
        break;
      case "quarter":
        for (let i = 89; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          defaultDates.push(date.toISOString());
        }
        break;
      case "halfyear":
        for (let i = 179; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          defaultDates.push(date.toISOString());
        }
        break;
      default: // all
        // Show last 30 days as default
        for (let i = 29; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          defaultDates.push(date.toISOString());
        }
    }
    
    sortedData = defaultDates.map((date) => ({
      date,
      investmentProfit: 0,
      yieldMultiplayerProfit: 0,
      referralProfit: 0,
      actualDate: date,
    }));
  } else {
    sortedData = sortedData.sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  const chartData = sortedData.map((point) => {
    const date = new Date(point.date);
    cumulativeInvestment += point.investmentProfit;
    cumulativeYieldMultiplayer += point.yieldMultiplayerProfit;
    cumulativeReferral += point.referralProfit;

    // Format date - always show only day and month (e.g., "Nov 29")
    const formattedDate = date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric" 
    });

    const chartPoint = {
      date: formattedDate,
      fullDate: point.actualDate || point.date, // Use actualDate if available, otherwise fallback to period start
      "Investment Profit": Number(cumulativeInvestment.toFixed(2)),
      "Yield Multiplayer": Number(cumulativeYieldMultiplayer.toFixed(2)),
      "Referral Profit": Number(cumulativeReferral.toFixed(2)),
    };
    
    return chartPoint;
  });
  
  console.log("[EarnedChart] Chart data:", chartData);
  console.log("[EarnedChart] Chart data length:", chartData.length);

  const totals = safeEarningsData.totals;

  // Custom tooltip - shows exact time for dev mode
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // Find the full date from the data point
      const dataPoint = chartData.find((d) => d.date === label);
      let displayDate = label;
      
      if (dataPoint && isTestMode) {
        // For dev mode, show exact date and time
        const fullDate = new Date(dataPoint.fullDate);
        displayDate = fullDate.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
      }

      // Show all data in tooltip (Investment Profit, Yield Multiplayer, Referral Profit)
      return (
        <div className="p-3 shadow-lg" style={{ backgroundColor: '#2D2D2D', borderRadius: '12px' }}>
          <p className="text-caption mb-2" style={{ color: '#7A7A7A' }}>{displayDate}</p>
          {dataPoint && (
            <>
              <div className="mb-2">
                <p className="text-body" style={{ color: '#7A7A7A' }}>Investment</p>
                <p className="text-body text-white-900">{dataPoint["Investment Profit"].toFixed(2)} USDT</p>
              </div>
              <div className="mb-2">
                <p className="text-body" style={{ color: '#7A7A7A' }}>Yield Multiplayer</p>
                <p className="text-body text-white-900">{dataPoint["Yield Multiplayer"].toFixed(2)} USDT</p>
              </div>
              <div>
                <p className="text-body" style={{ color: '#7A7A7A' }}>Referral</p>
                <p className="text-body text-white-900">{dataPoint["Referral Profit"].toFixed(2)} USDT</p>
              </div>
            </>
          )}
        </div>
      );
    }
    return null;
  };

    return (
      <div className={`${TERMINAL_CARD_PADDING.className} rounded-xl bg-onsurface-900 flex flex-col h-full`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-heading text-white-900">
          {period === "all" ? "Earned" : `Earned for ${periods.find(p => p.value === period)?.label.toLowerCase() || "period"}`}
        </h2>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsPeriodModalOpen(true)}
        >
          <span>{periods.find(p => p.value === period)?.label || "All Time"}</span>
          <CaretDown size={16} weight="regular" />
        </Button>
      </div>

      {/* Period Selection Modal */}
      {isPeriodModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[10002] flex items-center justify-center p-4 isolate"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setIsPeriodModalOpen(false);
            }
          }}
        >
          <div
            className="modal-content-bg rounded-2xl border border-onsurface-950 p-4 overflow-y-auto shadow-2xl w-full max-w-md max-h-[90vh] relative z-[10003] isolate modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ transform: 'translateZ(0)' }}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className={MODAL_STYLES.title}>Select Period</h2>
              <button
                onClick={() => setIsPeriodModalOpen(false)}
                className={MODAL_STYLES.closeButton}
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              {periods.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => {
                    setPeriod(p.value);
                    setIsPeriodModalOpen(false);
                  }}
                  className={`w-full px-4 py-3 flex items-start gap-3 text-left transition-all rounded-xl ${
                    period === p.value
                      ? "bg-onsurface-900 text-white-900"
                      : "text-white-900 hover:bg-onsurface-900"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-body text-white-900">{p.label}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-start gap-16 mb-6">
        {/* Total - только для периода "all" */}
        {period === "all" && (
          <div>
            <p className="text-caption text-white-600 mb-3">Total Earned</p>
            <p className="text-display text-white-900" style={{ fontSize: '1rem' }}>
              {animatedTotal.toFixed(2)} USDT
            </p>
          </div>
        )}

        {/* Earned - для всех периодов, кроме "all" */}
        {period !== "all" && (
          <div>
            <p className="text-caption text-white-600 mb-3">Earned</p>
            <p className="text-display text-white-900" style={{ fontSize: '1rem' }}>
              {animatedTotal.toFixed(2)} USDT
            </p>
          </div>
        )}

        {/* Investment Profit */}
        <div>
          <p className="text-caption text-white-600 mb-3">Investment</p>
          <p className="text-display text-white-900" style={{ fontSize: '1rem' }}>{animatedInvestment.toFixed(2)} USDT</p>
        </div>

        {/* Yield Multiplayer Profit */}
        <div>
          <p className="text-caption text-white-600 mb-3">Yield Multiplayer</p>
          <p className="text-display text-white-900" style={{ fontSize: '1rem' }}>{animatedYield.toFixed(2)} USDT</p>
        </div>

        {/* Referral Profit */}
        <div>
          <p className="text-caption text-white-600 mb-3">Referral</p>
          <p className="text-display text-white-900" style={{ fontSize: '1rem' }}>{animatedReferral.toFixed(2)} USDT</p>
        </div>
      </div>

      {/* Chart */}
      <div className="w-full" style={{ height: '250px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart 
            data={chartData} 
            margin={{ top: 10, right: 20, left: -30, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis
              dataKey="date"
              stroke="#666"
              style={{ fontSize: "11px" }}
              tick={{ fill: "#666666", dy: 10 }}
            />
            <YAxis
              stroke="#666"
              style={{ fontSize: "11px" }}
              tick={{ fill: "#666666", dx: 0, textAnchor: "start" }}
              tickFormatter={(value) => `${value.toFixed(0)}`}
              width={40}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            {/* Line */}
            <Line
              type="monotone"
              dataKey="Investment Profit"
              stroke="#FFFDB6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: "#FFFDB6" }}
              isAnimationActive={true}
              animationDuration={800}
              animationBegin={0}
              animationEasing="linear"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

