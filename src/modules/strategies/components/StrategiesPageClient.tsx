"use client";

import { StrategyConfigCard } from "./StrategyConfigCard";
import { StrategiesList } from "./StrategiesList";
import { StrategyConfigData } from "../lib/strategies-types";
import { StrategyStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { AutoProfitProcessor } from "./AutoProfitProcessor";

interface Strategy {
  id: string;
  configId: string | null; // ID of StrategyConfig used to create this strategy
  strategyName: string; // Name of the strategy from config
  amount: number;
  minPercent: number;
  maxPercent: number;
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
  const router = useRouter();

  const activeStrategies = initialStrategies.filter((s) => s.status === "ACTIVE");
  const completedStrategies = initialStrategies.filter((s) => s.status === "COMPLETED");

  // Get set of configIds that have active investments
  const activeConfigIds = new Set(
    activeStrategies
      .map((s) => s.configId)
      .filter((id): id is string => id !== null && id !== undefined)
  );

  const handleInvestSuccess = () => {
    router.refresh();
  };

  return (
    <div className="p-4 pb-20 sidebar:pb-4">
      <AutoProfitProcessor />
      <h1 className="text-2xl text-white-900 mb-6 sm:mb-8">Strategies</h1>

      {/* Available Strategy Configurations */}
      {configs.length > 0 && (
        <div className="mb-6 sm:mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {configs.map((config) => (
              <StrategyConfigCard
                key={config.id || config.type}
                config={config}
                hasActiveInvestment={activeConfigIds.has(config.id || "")}
                onInvest={handleInvestSuccess}
              />
            ))}
          </div>
        </div>
      )}

      {/* Active Strategies */}
      <StrategiesList
        strategies={activeStrategies}
        title="My Active Strategies"
      />

      {/* Completed Strategies */}
      <StrategiesList
        strategies={completedStrategies}
        title="Completed Strategies"
      />

      {/* Empty State */}
      {configs.length === 0 && initialStrategies.length === 0 && (
        <div className="py-8">
          <p className="text-body text-white-700 text-left">No strategies available</p>
        </div>
      )}
    </div>
  );
}
