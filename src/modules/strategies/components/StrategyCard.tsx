"use client";

import { StrategyStatus } from "@prisma/client";

interface StrategyCardProps {
  id: string;
  strategyName: string; // Name of the strategy from config
  amount: number;
  minPercent: number;
  maxPercent: number;
  status: StrategyStatus;
  endDate: Date;
  totalEarned: number;
  daysLeft: number;
  appliedMultiplier: number | null;
  portfolioShare?: number; // Share of this strategy in total portfolio (0..1)
  onClick?: () => void;
}

export function StrategyCard({
  strategyName,
  amount,
  minPercent,
  maxPercent,
  status,
  endDate,
  totalEarned,
  daysLeft,
  appliedMultiplier,
  portfolioShare,
  onClick,
}: StrategyCardProps) {

  const getStatusColor = () => {
    switch (status) {
      case "ACTIVE":
        return "text-mint";
      case "COMPLETED":
        return "text-white-600";
      case "CANCELLED":
        return "text-redhaze";
      default:
        return "text-white-600";
    }
  };

  return (
    <div
      className={`p-4 rounded-xl border border-onsurface-900 bg-onsurface-950 hover:bg-onsurface-900 transition-colors ${
        onClick ? "cursor-pointer" : ""
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-body font-medium text-white-900">{strategyName}</h3>
          <p className="text-small text-white-600">{amount.toFixed(2)} USDT</p>
        </div>
        <span className={`text-small ${getStatusColor()}`}>{status}</span>
      </div>

      <div className="space-y-2">
        <div>
          <p className="text-small text-white-600">Percent range</p>
          <p className="text-body text-white-900">
            {minPercent.toFixed(2)}% - {maxPercent.toFixed(2)}%
          </p>
        </div>

        {appliedMultiplier && (
          <div>
            <p className="text-small text-white-600">Yield Multiplayer bonus</p>
            <p className="text-body text-mint">+{appliedMultiplier.toFixed(2)}%</p>
          </div>
        )}

        <div>
          <p className="text-small text-white-600">Total earned</p>
          <p className="text-body text-white-900">{totalEarned.toFixed(2)} USDT</p>
        </div>

        {status === "ACTIVE" && (
          <div>
            <p className="text-small text-white-600">Days left</p>
            <p className="text-body text-white-900">{daysLeft}</p>
          </div>
        )}

        {portfolioShare !== undefined && status === "ACTIVE" && (
          <div>
            <p className="text-small text-white-600">
              Share in portfolio
              <span
                className="ml-1 text-white-500 cursor-help"
                title="The more evenly you distribute your capital between strategies, the higher your Yield Multiplayer."
              >
                ℹ️
              </span>
            </p>
            <p className="text-body text-white-900">{Math.round(portfolioShare * 100)}%</p>
          </div>
        )}
      </div>
    </div>
  );
}

