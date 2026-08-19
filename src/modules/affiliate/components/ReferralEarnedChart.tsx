"use client";

import { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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
  referralProfit: number;
  actualDate?: string;
}

interface EarningsResponse {
  data: EarningsDataPoint[];
  totals: {
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

export function ReferralEarnedChart() {
  const [period, setPeriod] = useState<PeriodType>("all");
  const [earningsData, setEarningsData] = useState<EarningsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);

  // Animated values
  const totalEarned = earningsData?.totals?.referralProfit ?? 0;
  const animatedTotal = useAnimatedValue(totalEarned);

  useEffect(() => {
    async function fetchEarnings() {
      setLoading(true);
      try {
        const response = await fetch(`/api/strategies/earnings?period=${period}`);
        if (response.ok) {
          const data = await response.json();
          // Extract only referral profit data
          const referralData = {
            data: data.data.map((point: any) => ({
              date: point.date,
              referralProfit: point.referralProfit || 0,
              actualDate: point.actualDate,
            })),
            totals: {
              referralProfit: data.totals?.referralProfit || 0,
            },
            period: data.period,
            profitPeriodMinutes: data.profitPeriodMinutes,
            isTestMode: data.isTestMode,
          };
          setEarningsData(referralData);
        } else {
          console.error("[ReferralEarnedChart] Error response:", response.status);
        }
      } catch (error) {
        console.error("[ReferralEarnedChart] Error fetching earnings:", error);
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
        <div className="mb-6">
          <div className="h-4 bg-onsurface-950 rounded w-24 mb-2"></div>
          <div className="h-8 bg-onsurface-950 rounded w-32"></div>
        </div>
        <div className="h-64 bg-onsurface-950 rounded"></div>
      </div>
    );
  }

  // Use empty data if no earnings data available
  const safeEarningsData = earningsData || {
    data: [],
    totals: {
      referralProfit: 0,
    },
    period: period,
    profitPeriodMinutes: 1,
    isTestMode: true,
  };

  // Format data for chart - accumulate values over time
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
    cumulativeReferral += point.referralProfit;

    // Format date - always show only day and month (e.g., "Nov 29")
    const formattedDate = date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric" 
    });

    const chartPoint = {
      date: formattedDate,
      fullDate: point.actualDate || point.date,
      "Referral Profit": Number(cumulativeReferral.toFixed(2)),
    };
    
    return chartPoint;
  });

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = chartData.find((d) => d.date === label);
      let displayDate = label;
      
      if (dataPoint && isTestMode) {
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

      return (
        <div className="p-3 shadow-lg" style={{ backgroundColor: '#2D2D2D', borderRadius: '12px' }}>
          <p className="text-caption mb-6" style={{ color: '#7A7A7A' }}>{displayDate}</p>
          {dataPoint && (
            <div>
              <p className="text-body" style={{ color: '#7A7A7A' }}>Referral</p>
              <p className="text-body text-white-900">{dataPoint["Referral Profit"].toFixed(2)} USDT</p>
            </div>
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

      <div className="mb-6">
        {/* Total Earned - только для периода "all" */}
        {period === "all" && (
          <div>
            <p className="text-caption text-white-600 mb-3">Total Earned</p>
            <p className="text-2xl text-white-900">
              {animatedTotal.toFixed(2)} USDT
            </p>
          </div>
        )}

        {/* Earned - для всех периодов, кроме "all" */}
        {period !== "all" && (
          <div>
            <p className="text-caption text-white-600 mb-3">Earned</p>
            <p className="text-2xl text-white-900">
              {animatedTotal.toFixed(2)} USDT
            </p>
          </div>
        )}
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
            {/* Referral Profit Line */}
            <Line
              type="monotone"
              dataKey="Referral Profit"
              stroke="#FFFDAD"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, fill: "#FFFDAD" }}
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

