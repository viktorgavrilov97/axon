"use client";

import { useState, useEffect } from "react";
import type { Operation } from "../lib/types";
import { getStatusText, getStatusColor, type OperationStatus } from "../lib/status-utils";
import { getDepositExpirationTime } from "../lib/date-utils";
import { ArrowUp, ArrowClockwise, TrendUp, Plus, Lock, Asterisk, Users } from "@phosphor-icons/react";

interface OperationItemProps {
  operation: Operation;
  onDetailsClick: (operationId: string) => void;
}

export function OperationItem({ operation, onDetailsClick }: OperationItemProps) {
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isNew, setIsNew] = useState(true);

  useEffect(() => {
    // Убираем флаг "новый" после анимации
    const timer = setTimeout(() => {
      setIsNew(false);
    }, 400); // Длительность анимации

    return () => clearTimeout(timer);
  }, []);

  // Get status display with confirmations (same logic as modals)
  const getStatusDisplay = () => {
    // Strategy transactions and referral payouts are always completed
    if (operation.type === "strategy_profit" || operation.type === "strategy_bonus" || operation.type === "referral_payout") {
      return {
        text: "Completed",
        color: "text-mint",
      };
    }

    if (operation.type !== "deposit") {
      // Special handling for withdrawal with PENDING status
      if (operation.type === "withdrawal" && operation.status === "PENDING") {
        return {
          text: "Pending withdrawal",
          color: "text-[#F4D48C]",
        };
      }
      // Strategy transactions have "completed" status, but we handle them separately
      if (operation.status === "completed") {
        return {
          text: "Completed",
          color: "text-mint",
        };
      }
      return {
        text: getStatusText(operation.status as OperationStatus),
        color: getStatusColor(operation.status as OperationStatus),
      };
    }

    const status = operation.status;
    const confirmations = operation.confirmations;
    const requiredConfirmations = operation.requiredConfirmations;
    const txStatus = operation.txStatus;

    // If status is "paid" OR confirmations reached required, show "Completed"
    if (status === "paid" || 
        (confirmations !== null && confirmations !== undefined && 
         requiredConfirmations !== null && requiredConfirmations !== undefined &&
         confirmations >= requiredConfirmations)) {
      return {
        text: "Completed",
        color: "text-mint",
      };
    }

    // If status is "paying" and we have confirmations info, show confirmation progress
    if (status === "paying") {
      if (confirmations !== null && confirmations !== undefined && 
          requiredConfirmations !== null && requiredConfirmations !== undefined) {
        return {
          text: `Confirming ${confirmations}/${requiredConfirmations}`,
          color: "text-orange-400",
        };
      }
      
      if (txStatus && (txStatus.toLowerCase() === "confirming" || txStatus.toLowerCase() === "confirmed")) {
        return {
          text: "Awaiting payment",
          color: "text-yellow-500",
        };
      }
      
      return {
        text: "Awaiting payment",
        color: "text-yellow-500",
      };
    }

    // Other statuses
    return {
      text: status === "expired" ? "Expired" : status === "failed" ? "Failed" : status === "cancelled" ? "Cancelled" : status === "completed" ? "Completed" : getStatusText(status as OperationStatus),
      color: status === "completed" ? "text-mint" : getStatusColor(status as OperationStatus),
    };
  };

  const statusDisplay = getStatusDisplay();
  const statusText = statusDisplay.text;
  const statusColor = statusDisplay.color;

  // Timer for active deposits (only paying status, no confirmations)
  useEffect(() => {
    // Clear timer if not a deposit, not paying, or has confirmations
    if (
      operation.type !== "deposit" ||
      operation.status !== "paying" ||
      (operation.confirmations !== null && operation.confirmations !== undefined)
    ) {
      setTimeLeft("");
      return;
    }

    const expirationTime = getDepositExpirationTime(operation.createdAt, operation.expiresAt);

    const updateTimer = () => {
      const now = new Date();
      const diff = expirationTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("Expired");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(
        `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [operation]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const getTypeText = () => {
    const strategyName = operation.strategyName;
    
    if (operation.type === "strategy_profit") {
      if (strategyName) {
        return (
          <>
            Daily Profit <span className="text-white-600">from {strategyName}</span>
          </>
        );
      }
      return "Daily Profit";
    }
    if (operation.type === "strategy_bonus") {
      const bonusPercent = operation.effectiveBonusPercent;
      return (
        <>
          Yield Multiplayer Bonus
          {bonusPercent !== undefined && (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-small bg-[#DCC6FF]/15 text-[#DCC6FF] ml-2">
              {bonusPercent.toFixed(2)}%
            </span>
          )}
        </>
      );
    }
    if (operation.type === "strategy_investment") {
      if (strategyName) {
        return (
          <>
            Allocated to <span className="text-white-600">{strategyName}</span>
          </>
        );
      }
      return "Allocated to Strategy";
    }
    if (operation.type === "capital_return") {
      if (strategyName) {
        return (
          <>
            Capital Returned <span className="text-white-600">from {strategyName}</span>
          </>
        );
      }
      return "Capital Returned";
    }
    if (operation.type === "referral_payout") {
      return operation.description || "Referral Reward";
    }
    return operation.type === "deposit" ? "Top up balance" : "Withdrawal";
  };

  const getIconBackgroundColor = () => {
    if (operation.type === "strategy_profit") {
      return "bg-[#A5EACF]/10";
    }
    if (operation.type === "strategy_bonus") {
      return "bg-[#DCC6FF]/10";
    }
    if (operation.type === "strategy_investment") {
      return "bg-[#A6A6A6]/10";
    }
    if (operation.type === "capital_return") {
      return "bg-white-900/10";
    }
    if (operation.type === "referral_payout") {
      return "bg-[#A5EACF]/10";
    }
    if (operation.type === "deposit") {
      // Check if deposit is completed (paid status or confirmations reached)
      const isCompleted = operation.status === "paid" || 
        (operation.confirmations !== null && operation.confirmations !== undefined && 
         operation.requiredConfirmations !== null && operation.requiredConfirmations !== undefined &&
         operation.confirmations >= operation.requiredConfirmations);
      
      if (isCompleted) {
        return "bg-[#A5EACF]/10"; // Green for completed
      }
      if (operation.status === "paying") {
        return "bg-[#F4D48C]/10";
      }
      if (operation.status === "failed" || operation.status === "expired" || operation.status === "cancelled") {
        return "bg-[#F2A8A8]/10";
      }
      return "bg-[#A8CFFF]/10";
    }
    if (operation.type === "withdrawal") {
      if (operation.status === "REJECTED") {
        return "bg-[#F2A8A8]/10";
      }
      if (operation.status === "PENDING" || operation.status === "APPROVED" || operation.status === "PROCESSING") {
        return "bg-[#F4D48C]/10";
      }
      return "bg-[#A8CFFF]/10";
    }
    return "bg-[#A8CFFF]/10"; // default
  };

  const getStatusBadge = () => {
    // Only show status badge for deposits and withdrawals
    if (operation.type !== "deposit" && operation.type !== "withdrawal") {
      return null;
    }

    // Определяем цвет фона и текста для статуса
    const statusConfig = 
      statusText === "Completed" || statusText === "APPROVED" || statusText === "PROCESSED"
        ? { bg: "bg-[#A5EACF]/10", text: "text-[#A5EACF]" } // Soft Mint
        : statusText === "Pending withdrawal"
        ? { bg: "bg-[#F4D48C]/10", text: "text-[#F4D48C]" } // Pastel Amber for withdrawal processing
        : statusText === "Awaiting payment" || statusText.includes("Confirming")
        ? { bg: "bg-[#F4D48C]/10", text: "text-[#F4D48C]" } // Pastel Amber
        : statusText === "Rejected" || statusText === "Failed" || statusText === "Expired" || statusText === "Cancelled"
        ? { bg: "bg-[#F2A8A8]/10", text: "text-[#F2A8A8]" } // Match icon color for rejected
        : { bg: "bg-[#A8CFFF]/10", text: "text-[#A8CFFF]" }; // Pastel Sky

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-small ${statusConfig.bg} ${statusConfig.text}`}>
        {statusText}
      </span>
    );
  };

  const handleClick = () => {
    console.log("[OperationItem] Clicked on operation:", operation.type, operation.id, operation);
    console.log("[OperationItem] onDetailsClick function:", typeof onDetailsClick, onDetailsClick);
    try {
      onDetailsClick(operation.id);
      console.log("[OperationItem] onDetailsClick called successfully");
    } catch (error) {
      console.error("[OperationItem] Error calling onDetailsClick:", error);
    }
  };

  return (
    <tr 
      className={`bg-onsurface-900 hover:bg-onsurface-800 transition-all duration-200 cursor-pointer group rounded-xl ${isNew ? 'animate-operation-enter' : ''}`}
      onClick={handleClick}
    >
      <td className="py-5 px-5 group-hover:px-6 transition-all duration-200 overflow-hidden rounded-l-xl">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className={`p-2 sm:p-2.5 rounded-full flex-shrink-0 flex items-center justify-center w-[40px] h-[40px] sm:w-[52px] sm:h-[52px] ${getIconBackgroundColor()}`}>
            {operation.type === "strategy_profit" ? (
              <TrendUp size={18} weight="regular" className="text-[#A5EACF]" />
            ) : operation.type === "strategy_bonus" ? (
              <Asterisk size={18} weight="regular" className="text-[#DCC6FF]" />
            ) : operation.type === "strategy_investment" ? (
              <Lock size={18} weight="regular" className="text-[#A6A6A6]" />
            ) : operation.type === "capital_return" ? (
              <ArrowClockwise size={18} weight="regular" className="text-white-900" />
            ) : operation.type === "referral_payout" ? (
              <Users size={18} weight="regular" className="text-[#A5EACF]" />
            ) : operation.type === "deposit" && operation.status === "paying" ? (
              <div className="flex items-center gap-0.5 h-3">
                <div 
                  className="w-0.5 bg-[#F4D48C] rounded-full"
                  style={{
                    height: '8px',
                    animation: 'scaleLoader 1.2s ease-in-out infinite',
                    animationDelay: '0ms'
                  }}
                />
                <div 
                  className="w-0.5 bg-[#F4D48C] rounded-full"
                  style={{
                    height: '8px',
                    animation: 'scaleLoader 1.2s ease-in-out infinite',
                    animationDelay: '0.2s'
                  }}
                />
                <div 
                  className="w-0.5 bg-[#F4D48C] rounded-full"
                  style={{
                    height: '8px',
                    animation: 'scaleLoader 1.2s ease-in-out infinite',
                    animationDelay: '0.4s'
                  }}
                />
              </div>
            ) : operation.type === "deposit" ? (
              (() => {
                // Check if deposit is completed (paid status or confirmations reached)
                const isCompleted = operation.status === "paid" || 
                  (operation.confirmations !== null && operation.confirmations !== undefined && 
                   operation.requiredConfirmations !== null && operation.requiredConfirmations !== undefined &&
                   operation.confirmations >= operation.requiredConfirmations);
                
                if (operation.status === "failed" || operation.status === "expired" || operation.status === "cancelled") {
                  return <Plus size={18} weight="regular" className="text-[#F2A8A8]" />;
                }
                if (isCompleted) {
                  return <Plus size={18} weight="regular" className="text-[#A5EACF]" />;
                }
                return <Plus size={18} weight="regular" className="text-[#A8CFFF]" />;
              })()
            ) : operation.type === "withdrawal" ? (
              operation.status === "REJECTED" ? (
                <ArrowUp size={18} weight="regular" className="text-[#F2A8A8]" />
              )               : operation.status === "PENDING" || operation.status === "APPROVED" || operation.status === "PROCESSING" ? (
                <div className="flex items-center gap-0.5 h-3">
                  <div 
                    className="w-0.5 bg-[#F4D48C] rounded-full"
                    style={{
                      height: '8px',
                      animation: 'scaleLoader 1.2s ease-in-out infinite',
                      animationDelay: '0ms'
                    }}
                  />
                  <div 
                    className="w-0.5 bg-[#F4D48C] rounded-full"
                    style={{
                      height: '8px',
                      animation: 'scaleLoader 1.2s ease-in-out infinite',
                      animationDelay: '0.2s'
                    }}
                  />
                  <div 
                    className="w-0.5 bg-[#F4D48C] rounded-full"
                    style={{
                      height: '8px',
                      animation: 'scaleLoader 1.2s ease-in-out infinite',
                      animationDelay: '0.4s'
                    }}
                  />
                </div>
              ) : (
                <ArrowUp size={18} weight="regular" className="text-[#A8CFFF]" />
              )
            ) : (
              <ArrowUp size={18} weight="regular" className="text-[#A8CFFF]" />
            )}
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <div className="text-body text-white-900 truncate">{getTypeText()}</div>
            {getStatusBadge()}
          </div>
        </div>
      </td>
      <td className="hidden sm:table-cell py-5 px-5 group-hover:px-6 transition-all duration-200 overflow-hidden text-left pl-8">
        <span className="text-body text-white-700 whitespace-nowrap">{formatDate(operation.createdAt)}</span>
      </td>
      <td className="py-5 px-5 group-hover:px-6 text-right transition-all duration-200 overflow-hidden rounded-r-xl">
        <span 
          className={`text-body whitespace-nowrap ${
            operation.type === "strategy_investment"
              ? "text-white-700"
              : (operation.type === "deposit" && (operation.status === "paying" || operation.status === "cancelled" || operation.status === "expired")) || (operation.type === "withdrawal" && operation.status === "PENDING")
              ? "text-white-600"
              : operation.type === "withdrawal"
              ? ""
              : "text-white-900"
          }`} 
          style={{ 
            fontSize: '14px',
            color: (operation.type === "withdrawal" && operation.status !== "PENDING") ? "#A6A6A6" : undefined
          }}
        >
          {operation.type === "strategy_profit" || operation.type === "strategy_bonus" || operation.type === "capital_return" || operation.type === "referral_payout" ? "+" : operation.type === "withdrawal" ? "-" : ""}
          {operation.amount.toFixed(2)} USDT
        </span>
      </td>
    </tr>
  );
}

