"use client";

import { StrategyStatus } from "@prisma/client";
import { ArrowUp } from "@phosphor-icons/react";

interface Strategy {
  id: string;
  strategyName: string;
  amount: number;
  status: StrategyStatus;
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  totalEarned: number;
  daysLeft: number;
}

interface StrategyItemProps {
  strategy: Strategy;
  onDetailsClick: (strategyId: string) => void;
}

export function StrategyItem({ strategy, onDetailsClick }: StrategyItemProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(date));
  };

  const getStatusBadge = () => {
    if (strategy.status === "ACTIVE") {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-small bg-[#F4D48C]/10 text-[#F4D48C]">
          Active
        </span>
      );
    }
    if (strategy.status === "COMPLETED") {
      return (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-small bg-[#A5EACF]/10 text-[#A5EACF]">
          Completed
        </span>
      );
    }
    return null;
  };

  const earnedPercent = strategy.amount > 0 
    ? ((strategy.totalEarned / strategy.amount) * 100).toFixed(2)
    : '0.00';

  return (
    <tr 
      className="bg-onsurface-900 hover:bg-onsurface-800 transition-all duration-200 cursor-pointer group rounded-xl"
      onClick={() => onDetailsClick(strategy.id)}
    >
      <td className="py-5 px-5 group-hover:px-6 transition-all duration-200 overflow-hidden rounded-l-xl">
        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex items-center gap-2">
            <div className="text-body text-white-900 truncate">{strategy.strategyName}</div>
            {getStatusBadge()}
          </div>
          <span className="text-small text-white-600 whitespace-nowrap">
            {formatDate(strategy.startDate)} - {formatDate(strategy.endDate)}
          </span>
        </div>
      </td>
      <td className="py-5 px-5 group-hover:px-6 text-right transition-all duration-200 overflow-hidden rounded-r-xl">
        <div className="flex flex-col items-end gap-1">
          <span className="text-body text-white-900 whitespace-nowrap">
            {strategy.amount.toFixed(2)} USDT
          </span>
          <span className="text-small text-white-600 whitespace-nowrap flex items-center gap-1">
            {strategy.totalEarned.toFixed(2)} USDT <span className="text-mint flex items-center gap-1">(<ArrowUp size={12} weight="regular" className="text-mint" />{earnedPercent}%)</span>
          </span>
        </div>
      </td>
    </tr>
  );
}

