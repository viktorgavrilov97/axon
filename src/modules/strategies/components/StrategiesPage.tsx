"use client";

import { useState } from "react";
import { StrategyCard } from "./StrategyCard";
import { StrategyCreationFlow } from "./StrategyCreationFlow";
import { StrategyConfigData } from "../lib/strategies-types";
import { StrategyType, StrategyStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { Button } from "@/shared/ui/button";

interface Strategy {
  id: string;
  strategyName: string; // Name of the strategy from config
  amount: number;
  minPercent: number;
  maxPercent: number;
  status: StrategyStatus;
  endDate: Date;
  createdAt: Date;
  profits: Array<{
    id: string;
    date: Date;
    percent: number;
    amount: number;
    type: string;
  }>;
  principalReturns: Array<{
    id: string;
    amount: number;
    createdAt: Date;
  }>;
  appliedMultiplier: number | null;
}

interface StrategiesPageClientProps {
  configs: StrategyConfigData[];
  strategies: Strategy[];
}

export function StrategiesPageClient({
  configs,
  strategies: initialStrategies,
}: StrategiesPageClientProps) {
  const [showCreate, setShowCreate] = useState(false);
  const router = useRouter();

  const handleSuccess = () => {
    setShowCreate(false);
    router.refresh();
  };

  const activeStrategies = initialStrategies.filter((s) => s.status === "ACTIVE");
  const completedStrategies = initialStrategies.filter((s) => s.status === "COMPLETED");

  const calculateTotalEarned = (strategy: Strategy) => {
    return strategy.profits
      .filter((p) => p.type === "PROFIT_DAY")
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const calculateDaysLeft = (endDate: Date) => {
    const now = new Date();
    const end = new Date(endDate);
    const diff = end.getTime() - now.getTime();
    // TEST: Используем минуты вместо дней
    return Math.max(0, Math.ceil(diff / (1000 * 60)));
  };

  if (showCreate) {
    return (
      <div className="p-8 max-w-2xl">
        <h1 className="text-display text-white-900 mb-6">Create Strategy</h1>
        <StrategyCreationFlow
          configs={configs}
          onSuccess={handleSuccess}
          onCancel={() => setShowCreate(false)}
        />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-display text-white-900">My Strategies</h1>
        <Button onClick={() => setShowCreate(true)}>Create Strategy</Button>
      </div>

      {activeStrategies.length > 0 && (
        <div className="mb-8">
          <h2 className="text-heading text-white-900 mb-4">Active Strategies</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeStrategies.map((strategy) => (
              <StrategyCard
                key={strategy.id}
                id={strategy.id}
                strategyName={strategy.strategyName}
                amount={strategy.amount}
                minPercent={strategy.minPercent}
                maxPercent={strategy.maxPercent}
                status={strategy.status}
                endDate={new Date(strategy.endDate)}
                totalEarned={calculateTotalEarned(strategy)}
                daysLeft={calculateDaysLeft(new Date(strategy.endDate))}
                appliedMultiplier={strategy.appliedMultiplier}
                onClick={() => router.push(`/strategies/${strategy.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {completedStrategies.length > 0 && (
        <div>
          <h2 className="text-heading text-white-900 mb-4">Completed Strategies</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedStrategies.map((strategy) => (
              <StrategyCard
                key={strategy.id}
                id={strategy.id}
                strategyName={strategy.strategyName}
                amount={strategy.amount}
                minPercent={strategy.minPercent}
                maxPercent={strategy.maxPercent}
                status={strategy.status}
                endDate={new Date(strategy.endDate)}
                totalEarned={calculateTotalEarned(strategy)}
                daysLeft={0}
                appliedMultiplier={strategy.appliedMultiplier}
                onClick={() => router.push(`/strategies/${strategy.id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {initialStrategies.length === 0 && (
        <div className="text-center py-12">
          <p className="text-body text-white-600 mb-4">No strategies yet</p>
          <Button onClick={() => setShowCreate(true)}>Create Your First Strategy</Button>
        </div>
      )}
    </div>
  );
}

