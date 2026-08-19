"use client";

import { useMemo } from "react";
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
import { TERMINAL_CARD_PADDING } from "@/shared/ui/terminal-card/styles";
import { useAnimatedValue } from "@/shared/hooks/use-animated-value";
import { ProfitType } from "@prisma/client";

interface StrategyProfit {
  id: string;
  date: Date;
  percent: number;
  amount: number;
  type: ProfitType;
}

interface StrategyEarnedChartProps {
  profits: StrategyProfit[];
  strategyName: string;
}

export function StrategyEarnedChart({ profits, strategyName }: StrategyEarnedChartProps) {
  // Calculate totals
  const totalEarned = profits
    .filter((p) => p.type === "PROFIT_DAY")
    .reduce((sum, p) => sum + p.amount, 0);
  
  const totalBonus = profits
    .filter((p) => p.type === "BONUS_MULTIPLIER")
    .reduce((sum, p) => sum + p.amount, 0);

  const animatedTotal = useAnimatedValue(totalEarned);
  const animatedBonus = useAnimatedValue(totalBonus);

  // Prepare chart data - cumulative earnings
  const chartData = useMemo(() => {
    // Sort profits by date ascending
    const sortedProfits = [...profits].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let cumulativeProfit = 0;
    let cumulativeBonus = 0;

    return sortedProfits.map((profit) => {
      if (profit.type === "PROFIT_DAY") {
        cumulativeProfit += profit.amount;
      } else if (profit.type === "BONUS_MULTIPLIER") {
        cumulativeBonus += profit.amount;
      }

      const date = new Date(profit.date);
      const formattedDate = date.toLocaleDateString("en-US", { 
        month: "short", 
        day: "numeric" 
      });

      return {
        date: formattedDate,
        fullDate: profit.date,
        "Daily Profit": Number(cumulativeProfit.toFixed(2)),
        "Yield Multiplayer": Number(cumulativeBonus.toFixed(2)),
      };
    });
  }, [profits]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 shadow-lg" style={{ backgroundColor: '#2D2D2D', borderRadius: '12px' }}>
          <p className="text-small mb-2" style={{ color: '#7A7A7A' }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className={index < payload.length - 1 ? "mb-2" : ""}>
              <p className="text-body" style={{ color: '#7A7A7A' }}>{entry.name}</p>
              <p className="text-body text-white-900">{entry.value.toFixed(2)} USDT</p>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`${TERMINAL_CARD_PADDING.className} rounded-xl bg-onsurface-900 flex flex-col h-full`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-heading text-white-900">Earned on {strategyName}</h2>
      </div>

      <div className="mb-6">
        {/* Earned */}
        <div>
          <p className="text-caption text-white-600 mb-3">Earned</p>
          <p className="text-display text-white-900" style={{ fontSize: '1rem' }}>
            {animatedTotal.toFixed(2)} USDT
          </p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
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
              {/* Daily Profit Line */}
              <Line
                type="monotone"
                dataKey="Daily Profit"
                stroke="#FFFDB6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, fill: "#FFFDB6" }}
                isAnimationActive={true}
                animationDuration={800}
                animationBegin={0}
                animationEasing="linear"
              />
              {/* Yield Multiplayer Line (only if there are bonuses) */}
              {totalBonus > 0 && (
                <Line
                  type="monotone"
                  dataKey="Yield Multiplayer"
                  stroke="#A5EACF"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, fill: "#A5EACF" }}
                  isAnimationActive={true}
                  animationDuration={800}
                  animationBegin={0}
                  animationEasing="linear"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="w-full flex items-center justify-center" style={{ height: '250px' }}>
          <p className="text-body text-white-700">No profits yet</p>
        </div>
      )}
    </div>
  );
}

