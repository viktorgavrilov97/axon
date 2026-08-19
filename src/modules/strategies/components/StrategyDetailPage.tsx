"use client";

import { useState } from "react";
import { StrategyStatus, ProfitType } from "@prisma/client";
import { useRouter } from "next/navigation";
import { XCircle } from "@phosphor-icons/react";
import { Button } from "@/shared/ui/button";
import { cancelStrategyAction } from "../api/cancel-strategy";
import type { Operation } from "@/modules/operations/lib/types";
import { OperationItem } from "@/modules/operations/components/OperationItem";
import { OperationDetailsModal } from "@/modules/operations/components/OperationDetailsModal";
import { TERMINAL_CARD_PADDING } from "@/shared/ui/terminal-card/styles";
import { StrategyEarnedChart } from "./StrategyEarnedChart";

// Format date consistently for server and client (DD.MM.YYYY)
function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

interface StrategyDetailPageProps {
  strategy: {
    id: string;
    strategyName: string; // Name of the strategy from config
    amount: number;
    durationDays: number;
    startDate: Date;
    endDate: Date;
    status: StrategyStatus;
    minPercent: number;
    maxPercent: number;
    appliedMultiplier: number | null;
    createdAt: Date;
    profits: Array<{
      id: string;
      date: Date;
      percent: number;
      amount: number;
      type: ProfitType;
    }>;
    principalReturns: Array<{
      id: string;
      amount: number;
      createdAt: Date;
    }>;
  };
}

export function StrategyDetailPage({ strategy }: StrategyDetailPageProps) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);

  const totalEarned = strategy.profits
    .filter((p) => p.type === "PROFIT_DAY")
    .reduce((sum, p) => sum + p.amount, 0);

  const totalBonus = strategy.profits
    .filter((p) => p.type === "BONUS_MULTIPLIER")
    .reduce((sum, p) => sum + p.amount, 0);

  const daysLeft = strategy.status === "ACTIVE" 
    ? Math.max(0, Math.ceil((new Date(strategy.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Convert profits to Operation format
  const profitOperations: Operation[] = strategy.profits.map((profit) => ({
    id: profit.id,
    type: (profit.type === "PROFIT_DAY" ? "strategy_profit" : "strategy_bonus") as Operation["type"],
    amount: profit.amount,
    status: "completed" as const,
    createdAt: profit.date,
    strategyId: strategy.id,
    profitId: profit.id,
    profitType: profit.type,
    strategyName: strategy.strategyName,
    description: profit.type === "PROFIT_DAY" 
      ? `Daily Profit from ${strategy.strategyName}`
      : `Yield Multiplayer Bonus from ${strategy.strategyName}`,
  })).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const selectedOperation = profitOperations.find((op) => op.id === selectedOperationId) || null;

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this strategy? Your principal will be returned to your wallet.")) {
      return;
    }

    setIsCancelling(true);
    setError(null);

    try {
      const result = await cancelStrategyAction(strategy.id);
      if (result.success) {
        router.refresh();
        router.push("/strategies");
      } else {
        setError(result.error || "Failed to cancel strategy");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel strategy");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="p-4 pb-20 sidebar:pb-4">
      <button
        onClick={() => router.back()}
        className="text-body text-white-700 hover:text-white-900 mb-6"
      >
        ← Back to Strategies
      </button>

      {error && (
        <div className="mb-6 p-4 bg-onsurface-900 border border-redhaze text-redhaze text-body rounded-xl">
          {error}
        </div>
      )}

      {/* Strategy Total Block - как Total в Terminal */}
      <div className={`${TERMINAL_CARD_PADDING.className} rounded-xl bg-onsurface-900 mb-6`}>
        {/* Strategy Name at the top */}
        <div className="mb-20 sidebar:mb-20 flex items-start justify-between">
          <div>
            <h1 className="text-display text-white-900 mb-2" style={{ fontSize: '1.6rem' }}>
              {strategy.strategyName}
            </h1>
          </div>
          {strategy.status === "ACTIVE" && (
            <Button
              variant="primary"
              onClick={handleCancel}
              disabled={isCancelling}
              className="flex items-center gap-2"
            >
              {isCancelling ? "Cancelling..." : "Cancel (dev mode)"}
            </Button>
          )}
        </div>

        {/* Stats Grid - 3 колонки по 2 тикера в каждой */}
        <div className="grid grid-cols-3 gap-6">
          {/* Column 1 */}
          <div className="space-y-6">
            {/* Invested */}
            <div>
              <p className="text-body text-white-900 mb-1">{strategy.amount.toFixed(2)} USDT</p>
              <p className="text-sm text-white-700">Invested</p>
            </div>
            {/* Total Earned */}
            <div>
              <p className="text-body text-white-900 mb-1">{totalEarned.toFixed(2)} USDT</p>
              <p className="text-sm text-white-700">Total Earned</p>
            </div>
          </div>

          {/* Column 2 */}
          <div className="space-y-6">
            {/* Investment term */}
            <div>
              <p className="text-body text-white-900 mb-1">{strategy.durationDays} days</p>
              <p className="text-sm text-white-700">Investment term</p>
            </div>
            {/* Status */}
            <div>
              <p className="text-body text-white-900 mb-1">{strategy.status}</p>
              <p className="text-sm text-white-700">Status</p>
            </div>
          </div>

          {/* Column 3 */}
          <div className="space-y-6">
            {/* Percent Range */}
            <div>
              <p className="text-body text-white-900 mb-1">
                {strategy.minPercent.toFixed(2)}% - {strategy.maxPercent.toFixed(2)}%
              </p>
              <p className="text-sm text-white-700">Percent Range</p>
            </div>
            {/* Days Left or Yield Multiplayer */}
            {strategy.status === "ACTIVE" ? (
              <div>
                <p className="text-body text-white-900 mb-1">{daysLeft}</p>
                <p className="text-sm text-white-700">Days Left</p>
              </div>
            ) : strategy.appliedMultiplier ? (
              <div>
                <p className="text-body text-mint mb-1">+{strategy.appliedMultiplier.toFixed(2)}%</p>
                <p className="text-sm text-white-700">Yield Multiplayer</p>
              </div>
            ) : null}
          </div>
        </div>

        {/* Timeline Info */}
        <div className="mt-6 space-y-3 pt-6 border-t border-onsurface-950">
          <div className="flex items-center justify-between w-full">
            <p className="text-[14px] text-white-600">Start Date</p>
            <p className="text-[14px] text-white-900">{formatDate(strategy.startDate)}</p>
          </div>
          <div className="flex items-center justify-between w-full">
            <p className="text-[14px] text-white-600">End Date</p>
            <p className="text-[14px] text-white-900">{formatDate(strategy.endDate)}</p>
          </div>
          {strategy.principalReturns.length > 0 && (
            <div className="flex items-center justify-between w-full">
              <p className="text-[14px] text-white-600">Principal Returned</p>
              <p className="text-[14px] text-mint">{formatDate(strategy.principalReturns[0].createdAt)}</p>
            </div>
          )}
          {strategy.appliedMultiplier && strategy.status === "ACTIVE" && (
            <div className="flex items-center justify-between w-full">
              <p className="text-[14px] text-white-600">Yield Multiplayer</p>
              <p className="text-[14px] text-mint">+{strategy.appliedMultiplier.toFixed(2)}%</p>
            </div>
          )}
          {strategy.appliedMultiplier && strategy.status === "ACTIVE" && (
            <div className="flex items-center justify-between w-full">
              <p className="text-[14px] text-white-600">Bonus Earned</p>
              <p className="text-[14px] text-white-900">{totalBonus.toFixed(2)} USDT</p>
            </div>
          )}
        </div>
      </div>

      {/* Earned Chart Block */}
      <div className="mb-8">
        <StrategyEarnedChart 
          profits={strategy.profits.map(p => ({
            id: p.id,
            date: p.date,
            percent: p.percent,
            amount: p.amount,
            type: p.type,
          }))}
          strategyName={strategy.strategyName}
        />
      </div>

      {/* Profit Log - как операции */}
      <div className="mt-8">
        <h2 className="text-2xl text-white-900 mb-6">Profit Log</h2>
        {profitOperations.length === 0 ? (
          <p className="text-body text-white-700">No profits yet</p>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full table-fixed border-separate" style={{ borderSpacing: '0 12px' }}>
              <colgroup>
                <col className="w-[60%] sm:w-[40%]" />
                <col className="hidden sm:table-column sm:w-[30%]" />
                <col className="w-[40%] sm:w-[30%]" />
              </colgroup>
              <thead>
                <tr>
                  <th className="text-left text-small text-white-700 pb-4 pl-0">Operation</th>
                  <th className="hidden sm:table-cell text-left text-small text-white-700 pb-4 pl-8">Date</th>
                  <th className="text-right text-small text-white-700 pb-4 pr-0">Amount</th>
                </tr>
              </thead>
              <tbody>
                {profitOperations.map((operation) => (
                  <OperationItem
                    key={operation.id}
                    operation={operation}
                    onDetailsClick={(id) => setSelectedOperationId(id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedOperation && (
        <OperationDetailsModal
          operation={selectedOperation}
          onClose={() => setSelectedOperationId(null)}
        />
      )}
    </div>
  );
}
