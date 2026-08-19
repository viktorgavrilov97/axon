"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Operation } from "../lib/types";
import { OperationItem } from "./OperationItem";
import { OperationItemSkeleton } from "./OperationItemSkeleton";
import { OperationDetailsModal } from "./OperationDetailsModal";
import { ReferralRewardDetailsModal } from "./ReferralRewardDetailsModal";
import { TopUpDialog } from "@/modules/wallet/components/TopUpDialog";
import { useRealtime } from "@/shared/lib/realtime-context";
import { getOperationByIdAction } from "../api/get-operation-by-id";
import { syncDepositStatusAction } from "@/modules/wallet/api/sync-deposit-status";
import { Cardholder3D } from "./Cardholder3D";
import { OperationTypeFilter, type OperationTypeFilter as OperationTypeFilterType } from "@/shared/ui/operation-type-filter";

interface OperationsListInfiniteProps {
  initialItems: Operation[];
  initialNextCursor: string | null;
  initialHasMore: boolean;
}

export function OperationsListInfinite({
  initialItems,
  initialNextCursor,
  initialHasMore,
}: OperationsListInfiniteProps) {
  const [items, setItems] = useState<Operation[]>(initialItems);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);
  const [showTopUp, setShowTopUp] = useState(false);
  const [typeFilter, setTypeFilter] = useState<OperationTypeFilterType>("all");
  const [isLoadingFilter, setIsLoadingFilter] = useState(false);
  const selectedOperation = items.find((op) => op.id === selectedOperationId) || null;
  const observerRef = useRef<HTMLDivElement | null>(null);
  const operationsRef = useRef<Operation[]>(initialItems);
  const router = useRouter();

  // Subscribe to realtime updates via shared context (single SSE connection)
  const { lastUpdate } = useRealtime();

  // Update local state when initialItems changes (after refresh from realtime)
  useEffect(() => {
    setItems(initialItems);
    operationsRef.current = initialItems;
    setNextCursor(initialNextCursor);
    setHasMore(initialHasMore);
  }, [initialItems, initialNextCursor, initialHasMore]);

  // Handle operation_created events - refresh operations list
  // RealtimeProvider already calls router.refresh(), but we add explicit handling here
  // to ensure the list updates when a new withdrawal is created
  useEffect(() => {
    // Use the existing EventSource connection from RealtimeProvider
    // We'll listen for operation_created events and refresh the router
    const eventSource = new EventSource("/api/realtime/terminal");
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "operation_created" && data.operationType === "withdrawal") {
          console.log("[OperationsListInfinite] withdrawal_created received, refreshing...");
          // Small delay to ensure DB transaction is committed
          setTimeout(() => {
            router.refresh();
          }, 100);
        }
      } catch (e) {
        // Ignore parsing errors
      }
    };

    return () => {
      eventSource.close();
    };
  }, [router]);

  // Reload operations when filter changes
  useEffect(() => {
    const reloadOperations = async () => {
      setIsLoadingFilter(true);
      try {
        const params = new URLSearchParams();
        params.set("limit", "10");
        if (typeFilter !== "all") {
          params.set("type", typeFilter);
        }

        const res = await fetch(`/api/wallet/operations?${params.toString()}`);
        if (!res.ok) {
          console.error("Failed to reload operations");
          return;
        }

        const data = await res.json();
        setItems(data.items);
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
        operationsRef.current = data.items;
      } catch (error) {
        console.error("Error reloading operations:", error);
      } finally {
        setIsLoadingFilter(false);
      }
    };

    reloadOperations();
  }, [typeFilter]);

  // Load more operations
  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !nextCursor) return;

    setIsLoadingMore(true);
    try {
      const params = new URLSearchParams();
      params.set("cursor", nextCursor);
      params.set("limit", "10");
      if (typeFilter !== "all") {
        params.set("type", typeFilter);
      }

      const res = await fetch(`/api/wallet/operations?${params.toString()}`);
      if (!res.ok) {
        console.error("Failed to load more operations");
        return;
      }

      const data = await res.json();

      setItems((prev) => {
        const newItems = [...prev, ...data.items];
        operationsRef.current = newItems;
        return newItems;
      });
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (error) {
      console.error("Error loading more operations:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, nextCursor, typeFilter]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!hasMore) return;

    const el = observerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && !isLoadingMore) {
          loadMore();
        }
      },
      {
        root: null,
        rootMargin: "200px",
        threshold: 0.1,
      }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, loadMore, isLoadingMore]);

  // Periodic update for active deposits with confirmations (every 5 seconds)
  useEffect(() => {
    const activeDepositIds = items
      .filter((op) => op.type === "deposit" && op.status === "paying")
      .map((op) => op.id);

    if (activeDepositIds.length === 0) return;

    const interval = setInterval(async () => {
      const currentOps = operationsRef.current;

      try {
        const updatedOps = await Promise.all(
          currentOps.map(async (op) => {
            if (op.type === "deposit" && op.status === "paying" && activeDepositIds.includes(op.id)) {
              try {
                const result = await getOperationByIdAction(op.id);
                if (result?.success && result.operation) {
                  const updatedOp = result.operation;

                  if (updatedOp.status === "paying") {
                    try {
                      await syncDepositStatusAction(op.id);
                      const afterSync = await getOperationByIdAction(op.id);
                      if (afterSync?.success && afterSync.operation) {
                        return afterSync.operation;
                      }
                    } catch (error) {
                      console.error(`Error syncing deposit status for ${op.id}:`, error);
                    }
                  }

                  return updatedOp;
                }
              } catch (error) {
                console.error(`Error updating operation ${op.id}:`, error);
              }
            }
            return op;
          })
        );

        operationsRef.current = updatedOps;
        setItems(updatedOps);
      } catch (error) {
        console.error("Error updating operations:", error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [items]);

  return (
    <>
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-4">
          <h1 className="text-2xl text-white-900">Operations</h1>
          <OperationTypeFilter
            value={typeFilter}
            onChange={setTypeFilter}
            disabled={isLoadingFilter}
          />
        </div>
        {items.length === 0 ? (
          <Cardholder3D />
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
                    <th className="hidden sm:table-cell text-left text-small text-white-700 pb-4 pl-8 ml-8">Date</th>
                    <th className="text-right text-small text-white-700 pb-4 pr-0">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((operation) => (
                    <OperationItem
                      key={operation.id}
                      operation={operation}
                      onDetailsClick={(id) => {
                        const op = items.find((o) => o.id === id);
                        // For deposits with "paying" status, open TopUpDialog instead
                        if (op?.type === "deposit" && op.status === "paying") {
                          setShowTopUp(true);
                        } else {
                          setSelectedOperationId(id);
                        }
                      }}
                    />
                  ))}
                  {/* Show skeleton loaders while loading more */}
                  {isLoadingMore && (
                    <>
                      <OperationItemSkeleton />
                      <OperationItemSkeleton />
                      <OperationItemSkeleton />
                      <OperationItemSkeleton />
                    </>
                  )}
                </tbody>
              </table>
            </div>
        )}

        {/* Sentinel for infinite scroll */}
        {hasMore && (
          <div ref={observerRef} className="h-1"></div>
        )}
      </div>

      {selectedOperation && selectedOperation.type === "referral_payout" ? (
        <ReferralRewardDetailsModal
          operation={selectedOperation}
          onClose={() => setSelectedOperationId(null)}
        />
      ) : selectedOperation ? (
        <OperationDetailsModal
          operation={selectedOperation}
          onClose={() => setSelectedOperationId(null)}
        />
      ) : null}

      {showTopUp && (
        <TopUpDialog
          onClose={() => setShowTopUp(false)}
        />
      )}
    </>
  );
}

