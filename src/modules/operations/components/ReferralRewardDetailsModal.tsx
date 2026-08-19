"use client";

import { useState, useEffect, useCallback } from "react";
import type { Operation } from "../lib/types";
import { getReferralPayoutDetails, type ReferralPayoutDetails } from "../api/get-referral-payout-details";
import { MODAL_STYLES } from "@/shared/ui/modal/styles";
import { isTestMode } from "@/shared/lib/env";
import { CaretDown } from "@phosphor-icons/react";
import { UserAvatar } from "@/shared/ui/user-avatar";
import { Spinner } from "@/shared/ui/spinner";

interface ReferralRewardDetailsModalProps {
  operation: Operation;
  onClose: () => void;
}

export function ReferralRewardDetailsModal({
  operation,
  onClose,
}: ReferralRewardDetailsModalProps) {
  console.log("[ReferralRewardDetailsModal] Rendering modal for operation:", operation.id, operation.type);
  
  const [details, setDetails] = useState<ReferralPayoutDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLevels, setExpandedLevels] = useState<Set<number>>(new Set());

  const testMode = isTestMode();

  // Handle close with state reset
  const handleClose = useCallback(() => {
    setExpandedLevels(new Set());
    setDetails(null);
    setError(null);
    setIsLoading(true);
    onClose();
  }, [onClose]);

  useEffect(() => {
    // Reset all state when operation changes (modal opens for new operation)
    setExpandedLevels(new Set());
    setDetails(null);
    setError(null);
    setIsLoading(true);

    const fetchDetails = async () => {
      try {
        console.log("[ReferralRewardDetailsModal] Fetching details for operation:", operation.id, operation.type);
        const result = await getReferralPayoutDetails(operation.id);
        console.log("[ReferralRewardDetailsModal] Result:", result);
        if ("error" in result) {
          console.error("[ReferralRewardDetailsModal] Error:", result.error);
          setError(result.error);
        } else {
          setDetails(result);
          // Keep all levels collapsed on initial load
          setExpandedLevels(new Set());
        }
      } catch (err) {
        console.error("[ReferralRewardDetailsModal] Exception:", err);
        setError(err instanceof Error ? err.message : "Failed to load details");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [operation.id, operation.type]);

  // Handle ESC key press and body scale/blur
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    document.documentElement.classList.add("modal-open");
    document.body.classList.add("modal-open");
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.documentElement.classList.remove("modal-open");
      document.body.classList.remove("modal-open");
      document.removeEventListener("keydown", handleEscape);
    };
  }, [handleClose]);

  const formatDate = (date: Date) => {
    if (testMode) {
      // For test mode, show time range
      const start = new Date(date);
      const end = new Date(start.getTime() + 60 * 1000); // +1 minute
      return `${start.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}–${end.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
    } else {
      // For production, show date and UTC time
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "UTC",
        timeZoneName: "short",
      }).format(date);
    }
  };

  const formatPeriodDate = (date: Date) => {
    if (testMode) {
      const start = new Date(date);
      const end = new Date(start.getTime() + 60 * 1000);
      return `${start.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}–${end.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })}`;
    } else {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(date);
    }
  };

  const toggleLevel = (level: number) => {
    const newExpanded = new Set(expandedLevels);
    if (newExpanded.has(level)) {
      newExpanded.delete(level);
    } else {
      newExpanded.add(level);
    }
    setExpandedLevels(newExpanded);
  };

  // Group breakdown by level
  const breakdownByLevel = details
    ? details.breakdown.reduce((acc, item) => {
        if (!acc[item.level]) {
          acc[item.level] = [];
        }
        acc[item.level].push(item);
        return acc;
      }, {} as Record<number, typeof details.breakdown>)
    : {};

  // Calculate total per level
  const levelTotals = Object.entries(breakdownByLevel).reduce((acc, [level, items]) => {
    acc[Number(level)] = items.reduce((sum, item) => sum + item.amount, 0);
    return acc;
  }, {} as Record<number, number>);

  // Sort levels
  const sortedLevels = Object.keys(breakdownByLevel)
    .map(Number)
    .sort((a, b) => a - b);

  console.log("[ReferralRewardDetailsModal] Rendering modal, details:", details, "isLoading:", isLoading, "error:", error);

  if (!operation || operation.type !== "referral_payout") {
    console.error("[ReferralRewardDetailsModal] Invalid operation:", operation);
    return null;
  }

  return (
    <div
      className={MODAL_STYLES.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          console.log("[ReferralRewardDetailsModal] Backdrop clicked, closing");
          handleClose();
        }
      }}
      style={{ zIndex: 10000 }}
    >
      <div
        className={MODAL_STYLES.content}
        onClick={(e) => e.stopPropagation()}
        style={{ zIndex: 10001 }}
      >
        <div className="flex justify-between items-start mb-6">
          <h2 className={MODAL_STYLES.title}>Referral Reward</h2>
          <button onClick={handleClose} className={MODAL_STYLES.closeButton}>
            ✕
          </button>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" className="border-white-900" />
          </div>
        )}

        {error && (
          <div className="py-8 text-center text-[#F2A8A8]">
            {error}
          </div>
        )}

        {details && (
          <div className="space-y-6">
            {/* Total earned */}
            <div className="bg-onsurface-950 rounded-xl p-4 border border-onsurface-900">
              <p className="text-[12px] text-white-600 mb-4">Total reward</p>
              <p className="text-[22px] font-regular text-[#fff] tracking-[-0.01em]">
                +{details.totalAmount.toFixed(2)} USDT
              </p>
              <p className="text-[12px] text-white-600 mt-4">
                Level rewards from your referral network
              </p>
            </div>

            {/* Period */}
            <div className="flex items-center justify-between w-full">
              <p className="text-[14px] text-white-600">Period</p>
              <p className="text-[14px] text-white-900">
                {testMode
                  ? formatPeriodDate(details.periodStart)
                  : `${formatPeriodDate(details.periodStart)} • 00:00 UTC`}
              </p>
            </div>

            {/* Breakdown by Levels */}
            <div>
              <p className="text-[14px] text-white-600 mb-3">Breakdown by levels</p>
              <div className="space-y-2">
                {sortedLevels.map((level) => {
                  const items = breakdownByLevel[level];
                  const total = levelTotals[level];
                  const isExpanded = expandedLevels.has(level);
                  const percent = items[0]?.percent || 0;

                  return (
                    <div
                      key={level}
                      className="bg-onsurface-950 rounded-xl p-4 border border-onsurface-900 cursor-pointer hover:bg-onsurface-900 transition-colors"
                      onClick={() => toggleLevel(level)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CaretDown
                            size={16}
                            weight="regular"
                            className={`text-white-600 transition-transform duration-200 ${
                              isExpanded ? "rotate-0" : "-rotate-90"
                            }`}
                          />
                          <span className="text-[14px] text-white-900">
                            Level {level} ({(percent * 100).toFixed(0)}%)
                          </span>
                        </div>
                        <span className="text-[14px] font-medium text-[#fff]">
                          +{total.toFixed(2)} USDT
                        </span>
                      </div>

                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-onsurface-900 space-y-2">
                          {items.map((item, idx) => (
                            <div
                              key={`${item.fromUserId}-${idx}`}
                              className="flex items-center justify-between text-[13px]"
                            >
                              <div className="flex items-center gap-3">
                                <UserAvatar
                                  user={{
                                    id: item.fromUserId,
                                    email: null,
                                    name: item.fromUserName,
                                    displayName: item.fromUserDisplayName,
                                    avatarUrl: item.fromUserAvatarUrl,
                                    avatarColor: item.fromUserAvatarColor,
                                  }}
                                  size={20}
                                />
                                <span className="text-white-900">
                                  {item.fromUserDisplayName || item.fromUserName}
                                </span>
                              </div>
                              <span className="text-white-900">
                                {item.amount.toFixed(2)} USDT
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* How it was calculated */}
            <div className="bg-onsurface-950 rounded-xl p-4 border border-onsurface-900">
              <p className="text-[13px] text-white-900 mb-2 font-medium">
                How it was calculated
              </p>
              <p className="text-[13px] text-white-600 leading-relaxed">
                This reward is based on the daily profit generated by your referrals.
                The system calculates: Referral daily profit × Level percentage.
              </p>
            </div>


            {/* Meta info */}
            <div className="pt-4 border-t border-onsurface-900 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[12px] text-white-600">Reward ID</p>
                <p className="text-[12px] text-white-900 font-mono">
                  RFP-{details.transactionId.slice(-6).toUpperCase()}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[12px] text-white-600">Processed</p>
                <p className="text-[12px] text-white-900">
                  {testMode
                    ? formatDate(details.createdAt)
                    : new Intl.DateTimeFormat("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "UTC",
                        timeZoneName: "short",
                      }).format(details.createdAt)}
                </p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[12px] text-white-600">Payout method</p>
                <p className="text-[12px] text-white-900">Wallet balance (USDT)</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

