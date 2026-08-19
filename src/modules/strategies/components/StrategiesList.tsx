"use client";

import { StrategyStatus } from "@prisma/client";
import { StrategyItem } from "./StrategyItem";
import { useRouter } from "next/navigation";

interface Strategy {
  id: string;
  strategyName: string;
  amount: number;
  status: StrategyStatus;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  profits: Array<{
    id: string;
    date: Date;
    percent: number;
    amount: number;
    type: string;
  }>;
}

interface StrategiesListProps {
  strategies: Strategy[];
  title: string;
}

export function StrategiesList({ strategies, title }: StrategiesListProps) {
  const router = useRouter();

  const calculateTotalEarned = (strategy: Strategy) => {
    return strategy.profits
      .filter((p) => p.type === "PROFIT_DAY")
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const calculateDaysLeft = (endDate: Date) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const strategiesWithCalculations = strategies.map((strategy) => ({
    ...strategy,
    totalEarned: calculateTotalEarned(strategy),
    daysLeft: calculateDaysLeft(new Date(strategy.endDate)),
  }));

  if (strategiesWithCalculations.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 sm:mb-8">
      <h2 className="text-lg text-white-900 mb-6 sm:mb-8">{title}</h2>
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        <table className="w-full table-fixed border-separate" style={{ borderSpacing: '0 12px' }}>
          <colgroup>
            <col className="w-[60%]" />
            <col className="w-[40%]" />
          </colgroup>
          <tbody>
            {strategiesWithCalculations.map((strategy) => (
              <StrategyItem
                key={strategy.id}
                strategy={strategy}
                onDetailsClick={(id) => router.push(`/strategies/${id}`)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

