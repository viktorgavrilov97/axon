"use client";

import { useState, useEffect } from "react";
import type { Operation } from "../lib/types";
import { getStatusText, getStatusColor, getStatusBgColor, type OperationStatus } from "../lib/status-utils";
import { getDepositExpirationTime } from "../lib/date-utils";
import { Button } from "@/shared/ui/button";
import { syncDepositStatusAction } from "@/modules/wallet/api/sync-deposit-status";
import { getOperationByIdAction } from "../api/get-operation-by-id";
import { useRealtime } from "@/shared/lib/realtime-context";
import { MODAL_STYLES } from "@/shared/ui/modal/styles";
import { NETWORKS, type NetworkType } from "@/modules/wallet/lib/network-types";
import { cancelWithdrawalAction } from "@/modules/wallet/api/cancel-withdrawal";
import toast from "react-hot-toast";

interface OperationDetailsModalProps {
  operation: Operation;
  onClose: () => void;
  onOpenTopUp?: () => void;
}

export function OperationDetailsModal({
  operation: initialOperation,
  onClose,
  onOpenTopUp,
}: OperationDetailsModalProps) {
  // Don't render this modal for referral_payout - use ReferralRewardDetailsModal instead
  if (initialOperation.type === "referral_payout") {
    return null;
  }

  const [operation, setOperation] = useState<Operation>(initialOperation);
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isLoadingOperation, setIsLoadingOperation] = useState(false);

  // Subscribe to realtime updates
  const { lastUpdate } = useRealtime();

  // Fetch fresh operation data with confirmations when modal opens
  useEffect(() => {
    const fetchFreshOperation = async () => {
      setIsLoadingOperation(true);
      try {
        const result = await getOperationByIdAction(initialOperation.id);
        if (result?.success && result.operation) {
          setOperation(result.operation);
        }
      } catch (error) {
        console.error("Error fetching fresh operation data:", error);
      } finally {
        setIsLoadingOperation(false);
      }
    };

    fetchFreshOperation();
  }, [initialOperation.id]);

  // Update operation when realtime update is received
  useEffect(() => {
    if (!lastUpdate) return;

    const fetchFreshOperation = async () => {
      try {
        const result = await getOperationByIdAction(initialOperation.id);
        if (result?.success && result.operation) {
          setOperation(result.operation);
        }
      } catch (error) {
        console.error("Error fetching fresh operation data on realtime update:", error);
      }
    };

    fetchFreshOperation();
  }, [lastUpdate, initialOperation.id]);

  // Periodic update for active deposits with confirmations (every 5 seconds)
  // Also sync status when confirmations reach required
  useEffect(() => {
    if (operation.type !== "deposit" || operation.status !== "paying") return;

    const interval = setInterval(async () => {
      try {
        const result = await getOperationByIdAction(operation.id);
        if (result?.success && result.operation) {
          const updatedOp = result.operation;
          setOperation(updatedOp);
          
          if (updatedOp.status === "paying") {
            try {
              await syncDepositStatusAction(operation.id);
              const afterSync = await getOperationByIdAction(operation.id);
              if (afterSync?.success && afterSync.operation) {
                setOperation(afterSync.operation);
              }
            } catch (error) {
              console.error("Error syncing deposit status:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching fresh operation data on periodic update:", error);
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [operation.id, operation.type, operation.status]);

  // Handle ESC key press and body scale/blur
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    // Add modal-open class to html and body for backdrop effect
    document.documentElement.classList.add("modal-open");
    document.body.classList.add("modal-open");
    document.addEventListener("keydown", handleEscape);
    
    return () => {
      document.documentElement.classList.remove("modal-open");
      document.body.classList.remove("modal-open");
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Timer for PENDING deposits only (not PROCESSING or CONFIRMED)
  useEffect(() => {
    // Clear timer if not a deposit or not PENDING
    if (operation.type !== "deposit" || operation.status !== "paying") {
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
    return new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
  };

  const handleOpenTopUp = () => {
    onClose();
    if (onOpenTopUp) {
      onOpenTopUp();
    } else {
      // Redirect to wallet and trigger top-up modal
      window.location.href = "/operations";
    }
  };

  const handleCancelWithdrawal = async () => {
    if (operation.type !== "withdrawal" || operation.status !== "PENDING") return;

    try {
      const result = await cancelWithdrawalAction(operation.id);
      if (result?.error) {
        toast.error(result.error);
      } else if (result?.success) {
        toast.success("Withdrawal cancelled successfully");
        // Refresh operation data
        const updatedResult = await getOperationByIdAction(operation.id);
        if (updatedResult?.success && updatedResult.operation) {
          setOperation(updatedResult.operation);
        }
        // Close modal after a short delay
        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (error) {
      console.error("Error cancelling withdrawal:", error);
      toast.error("Failed to cancel withdrawal");
    }
  };

  // Helper function to infer network from payCurrency
  const inferNetworkFromCurrency = (currency: string | null | undefined): NetworkType | null => {
    if (!currency) return null;
    const currencyLower = currency.toLowerCase();
    if (currencyLower.includes("matic") || currencyLower.includes("polygon")) {
      return "MATIC";
    } else if (currencyLower.includes("trc20") || currencyLower.includes("tron")) {
      return "TRC20";
    } else if (currencyLower.includes("erc20") || currencyLower.includes("ethereum")) {
      return "ERC20";
    } else if (currencyLower.includes("bep20") || currencyLower.includes("bsc") || currencyLower.includes("bnb")) {
      return "BEP20";
    } else if (currencyLower.includes("solana") || currencyLower.includes("sol")) {
      return "SOLANA";
    } else if (currencyLower.includes("ton")) {
      return "TON";
    }
    return null;
  };

  // Get blockchain explorer URL
  const getBlockchainExplorerUrl = (): { url: string; label: string } | null => {
    if (!operation.txHash) return null;

    const network = inferNetworkFromCurrency(operation.payCurrency);
    if (!network) return null;

    const txHash = operation.txHash;

    switch (network) {
      case "TRC20":
        return {
          url: `https://tronscan.org/#/transaction/${txHash}`,
          label: "View in TronScan",
        };
      case "ERC20":
        return {
          url: `https://etherscan.io/tx/${txHash}`,
          label: "Open in Etherscan",
        };
      case "BEP20":
        return {
          url: `https://bscscan.com/tx/${txHash}`,
          label: "Open in BscScan",
        };
      case "MATIC":
        return {
          url: `https://polygonscan.com/tx/${txHash}`,
          label: "Open in PolygonScan",
        };
      case "SOLANA":
        return {
          url: `https://solscan.io/tx/${txHash}`,
          label: "Open in Solscan",
        };
      case "TON":
        return {
          url: `https://tonscan.org/tx/${txHash}`,
          label: "Open in TONScan",
        };
      default:
        return null;
    }
  };


  // Get status display info with confirmations (same logic as TopUpDialog)
  const getStatusDisplay = () => {
    // Strategy transactions are always completed
    if (operation.type === "strategy_profit" || operation.type === "strategy_bonus" || operation.type === "strategy_investment" || operation.type === "capital_return") {
      return {
        text: "Completed",
        color: "text-mint",
        bgColor: "bg-mint/10",
        borderColor: "border-mint/30",
      };
    }

    // For withdrawals, use standard status display
    if (operation.type === "withdrawal") {
      const status = operation.status as OperationStatus;
      // PENDING status should be orange
      if (status === "PENDING") {
        return {
          text: getStatusText(status),
          color: "text-[#F4D48C]",
          bgColor: "bg-[#F4D48C]/10",
          borderColor: "border-white-500",
        };
      }
      // REJECTED status should match icon color
      if (status === "REJECTED") {
        return {
          text: getStatusText(status),
          color: "text-[#F2A8A8]",
          bgColor: "bg-[#F2A8A8]/10",
          borderColor: "border-white-500",
        };
      }
      return {
        text: getStatusText(status),
        color: getStatusColor(status),
        bgColor: getStatusBgColor(status),
        borderColor: "border-white-500",
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
        bgColor: "bg-mint/10",
        borderColor: "border-mint/20",
      };
    }

    // If status is "paying" and we have confirmations info, show confirmation progress
    if (status === "paying") {
      // Check if we have confirmations data
      if (confirmations !== null && confirmations !== undefined && 
          requiredConfirmations !== null && requiredConfirmations !== undefined) {
        return {
          text: `Confirming ${confirmations}/${requiredConfirmations}`,
          color: "text-orange-400",
          bgColor: "bg-orange-400/10",
          borderColor: "border-orange-400/20",
        };
      }
      
      // If we have txStatus indicating transaction is being confirmed
      if (txStatus && (txStatus.toLowerCase() === "confirming" || txStatus.toLowerCase() === "confirmed")) {
        return {
          text: "Awaiting payment",
          color: "text-yellow-500",
          bgColor: "bg-yellow-500/10",
          borderColor: "border-yellow-500/20",
        };
      }
      
      // Default "paying" status (waiting for payment)
      return {
        text: "Awaiting payment",
        color: "text-yellow-500",
        bgColor: "bg-yellow-500/10",
        borderColor: "border-yellow-500/20",
      };
    }

    // Other statuses
    return {
      text: status === "expired" ? "Expired" : status === "failed" ? "Failed" : status === "cancelled" ? "Cancelled" : status === "completed" ? "Completed" : getStatusText(status as OperationStatus),
      color: status === "completed" ? "text-mint" : getStatusColor(status as OperationStatus),
      bgColor: status === "completed" ? "bg-mint/10" : getStatusBgColor(status as OperationStatus),
      borderColor: status === "completed" ? "border-mint/30" : "border-white-500",
    };
  };

  const statusDisplay = getStatusDisplay();
  const statusText = statusDisplay.text;
  const statusColor = statusDisplay.color;
  const statusBgColor = statusDisplay.bgColor;

  return (
    <div 
      className={MODAL_STYLES.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className={MODAL_STYLES.content}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
              <h2 className={MODAL_STYLES.title}>
                {operation.type === "strategy_profit" 
                  ? (operation.strategyName ? (
                      <>Daily Profit <span className="text-white-600">from {operation.strategyName}</span></>
                    ) : "Daily Profit")
                  : operation.type === "strategy_bonus"
                  ? "Yield Multiplayer Bonus"
                  : operation.type === "strategy_investment"
                  ? (operation.strategyName ? (
                      <>Allocated to <span className="text-white-600">{operation.strategyName}</span></>
                    ) : "Allocated to Strategy")
                  : operation.type === "capital_return"
                  ? (operation.strategyName ? (
                      <>Capital Returned <span className="text-white-600">from {operation.strategyName}</span></>
                    ) : "Capital Returned")
                  : operation.type === "deposit" 
                  ? "Top up balance" 
                  : "Withdrawal"}
              </h2>
          <button
            onClick={onClose}
            className={MODAL_STYLES.closeButton}
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Amount, Network, Status - в две колонки (как в TopUpDialog) */}
          <div className="space-y-3 mt-12">
          {/* Amount */}
            <div className="flex items-center justify-between w-full mt-8">
              <p className="text-[14px] text-white-600">Amount</p>
              <p className={`text-[14px] ${
                  operation.type === "strategy_profit" || operation.type === "strategy_bonus" || operation.type === "capital_return" ||
                  operation.status === "paid" || 
                  (operation.type === "deposit" && 
                   operation.confirmations !== null && 
                   operation.confirmations !== undefined && 
                   operation.requiredConfirmations !== null && 
                   operation.requiredConfirmations !== undefined &&
                   operation.confirmations >= operation.requiredConfirmations)
                  ? "text-[#A5EACF]" 
                    : operation.type === "strategy_investment"
                    ? "text-white-700"
                    : "text-white-900"
                }`}>
                  {operation.type === "strategy_profit" || operation.type === "strategy_bonus" || operation.type === "capital_return" ? "+" : operation.type === "strategy_investment" ? "-" : ""}
                  {operation.amount.toFixed(2)} USDT
                </p>
            </div>

            {/* Network - только для депозитов и выводов */}
            {(operation.type === "deposit" || operation.type === "withdrawal") && (() => {
              const network = inferNetworkFromCurrency(operation.payCurrency);
              if (!network) return null;
              
              const networkInfo = NETWORKS[network];
              if (!networkInfo) return null;
              
              return (
                <div className="flex items-center justify-between w-full">
                  <p className="text-[14px] text-white-600">Network</p>
                  <p className="text-[14px] text-white-900">{networkInfo.label}</p>
                </div>
              );
            })()}

            {/* Status - в формате как Amount/Network */}
            <div className="flex items-center justify-between w-full">
              <p className="text-[14px] text-white-600">Status</p>
              <p className={`text-[14px] ${
                operation.type === "strategy_investment"
                  ? "text-white-900"
                  : statusText === "Completed"
                  ? "text-[#A5EACF]"
                  : statusText === "Awaiting payment" || statusText.includes("Confirming") || statusText === "Pending"
                  ? "text-[#F4D48C]"
                  : statusText === "Failed" || statusText === "Expired" || statusText === "Cancelled" || statusText === "Rejected"
                  ? "text-[#F2A8A8]"
                  : "text-[#A8CFFF]"
              }`}>
                {statusText}
              </p>
            </div>

            {/* Payment address - в формате как Amount/Network */}
            {operation.type === "deposit" && operation.address && (
              <div className="flex items-start justify-between w-full">
                <p className="text-[14px] text-white-600">Payment address</p>
                <code 
                  className="text-[14px] text-white-900 font-mono break-all text-right max-w-[60%]"
                  title={operation.address}
                >
                  {operation.address}
                </code>
              </div>
            )}

            {/* Transaction hash - в формате как Amount/Network */}
            {operation.txHash && (
              <div className="flex items-start justify-between w-full">
                <p className="text-[14px] text-white-600">Transaction hash</p>
                <code 
                  className="text-[14px] text-white-900 font-mono break-all text-right max-w-[60%]"
                  title={operation.txHash}
                >
                  {operation.txHash}
                </code>
              </div>
            )}
          </div>

          {/* Description for strategy transactions */}
          {(operation.type === "strategy_profit" || operation.type === "strategy_bonus" || operation.type === "strategy_investment" || operation.type === "capital_return") && operation.description && (
            <div>
              <p className="text-small text-white-700 mb-1">Description</p>
              <p className="text-body text-white-600 break-words whitespace-normal">
                {operation.description}
              </p>
            </div>
          )}

          {/* Deposit-specific fields */}
          {operation.type === "deposit" && (
            <>
              {operation.payAmount && (
                <div>
                  <p className="text-small text-white-700 mb-1">
                    Amount to pay
                  </p>
                  <p className="text-body text-white-900">
                    {operation.payAmount.toFixed(2)} {operation.payCurrency?.toUpperCase() || "USDT"} (Polygon)
                  </p>
                </div>
              )}


              {/* Created at - в формате как Amount/Network */}
              <div className="flex items-center justify-between w-full">
                <p className="text-[14px] text-white-600">Created at</p>
                <p className="text-[14px] text-white-900">{formatDate(operation.createdAt)}</p>
              </div>

              {/* Confirmed at - в формате как Amount/Network */}
              {operation.confirmedAt && (
                <div className="flex items-center justify-between w-full">
                  <p className="text-[14px] text-white-600">Confirmed at</p>
                  <p className="text-[14px] text-white-900">{formatDate(operation.confirmedAt)}</p>
                </div>
              )}

              {operation.status === "paying" && (
                <>
                  <div>
                    <p className="text-small text-white-700 mb-1">Expires at</p>
                    <p className="text-body text-white-900">
                      {formatDate(getDepositExpirationTime(operation.createdAt, operation.expiresAt))}
                    </p>
                  </div>
                  {/* Timer - only show if no confirmations yet */}
                  {!(operation.confirmations !== null && operation.confirmations !== undefined) && timeLeft && (
                    <div>
                      <p className="text-small text-white-700 mb-1">Time left</p>
                      <p className="text-body text-white-900">
                        <strong>{timeLeft}</strong>
                      </p>
                    </div>
                  )}
                  <Button onClick={handleOpenTopUp} className="w-full">
                    Open in top-up
                  </Button>
                </>
              )}

            </>
          )}

          {/* Withdrawal-specific fields */}
          {/* Strategy transaction fields */}
          {(operation.type === "strategy_profit" || operation.type === "strategy_bonus") && (
            <>
              {operation.profitType && (
                <div>
                  <p className="text-small text-white-700 mb-1">Type</p>
                  <p className="text-body text-white-900">
                    {operation.profitType === "PROFIT_DAY" ? "Daily Profit" : "Yield Multiplayer Bonus"}
                  </p>
                </div>
              )}
              {operation.strategyId && (
                <div>
                  <p className="text-small text-white-700 mb-1">Strategy ID</p>
                  <p className="text-body text-white-900 font-mono">
                    {operation.strategyId}
                  </p>
                </div>
              )}
            </>
          )}

          {operation.type === "withdrawal" && (
            <>
              {/* Destination address - в формате как Amount/Network */}
              {operation.toAddress && (
                <div className="flex items-start justify-between w-full">
                  <p className="text-[14px] text-white-600">Destination address</p>
                  <code 
                    className="text-[14px] text-white-900 font-mono break-all text-right max-w-[60%]"
                    title={operation.toAddress}
                  >
                    {operation.toAddress}
                  </code>
                </div>
              )}

              {/* Created at - в формате как Amount/Network */}
              <div className="flex items-center justify-between w-full">
                <p className="text-[14px] text-white-600">Created at</p>
                <p className="text-[14px] text-white-900">{formatDate(operation.createdAt)}</p>
              </div>

              {/* Processed at - в формате как Amount/Network */}
              {operation.processedAt && (
                <div className="flex items-center justify-between w-full">
                  <p className="text-[14px] text-white-600">Processed at</p>
                  <p className="text-[14px] text-white-900">{formatDate(operation.processedAt)}</p>
                </div>
              )}

              {operation.status === "REJECTED" && operation.rejectionReason && (
                <div className="flex items-start justify-between w-full">
                  <p className="text-[14px] text-white-600">Rejection reason</p>
                  <p className="text-[14px] text-[#F2A8A8] text-right max-w-[60%]">{operation.rejectionReason}</p>
                </div>
              )}

              {/* Cancel button for PENDING withdrawals */}
              {operation.status === "PENDING" && (
                <Button
                  onClick={handleCancelWithdrawal}
                  variant="secondary"
                  className="w-full py-2 mt-8"
                >
                  Cancel withdrawal
                </Button>
              )}
            </>
          )}
        </div>

        {/* Separator - скрыт для paid/cancelled статусов, PENDING withdrawals и REJECTED */}
        {!(operation.status === "paid" || operation.status === "completed" || operation.status === "cancelled" || operation.status === "failed" || operation.status === "expired" || operation.status === "PENDING" || operation.status === "REJECTED" || (operation.type === "deposit" && operation.confirmations !== null && operation.confirmations !== undefined && operation.requiredConfirmations !== null && operation.requiredConfirmations !== undefined && operation.confirmations >= operation.requiredConfirmations)) && (
          <div className="border-t border-onsurface-950 mt-8"></div>
        )}

        {/* Blockchain Explorer Button - показывается только если есть txHash и операция paid/confirmed */}
        {(() => {
          const explorerInfo = getBlockchainExplorerUrl();
          if (explorerInfo && (operation.status === "paid" || operation.status === "completed" || (operation.type === "deposit" && operation.confirmations !== null && operation.confirmations !== undefined && operation.requiredConfirmations !== null && operation.requiredConfirmations !== undefined && operation.confirmations >= operation.requiredConfirmations))) {
            return (
              <Button
                onClick={() => window.open(explorerInfo.url, "_blank", "noopener,noreferrer")}
                className="w-full py-2 mt-8"
                variant="primary"
              >
                {explorerInfo.label}
          </Button>
            );
          }
          return null;
        })()}
      </div>
    </div>
  );
}

