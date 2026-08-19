"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Operation } from "@/modules/operations/lib/types";
import { Button } from "@/shared/ui/button";
import { OperationItem } from "@/modules/operations/components/OperationItem";
import { OperationItemSkeleton } from "@/modules/operations/components/OperationItemSkeleton";
import { OperationDetailsModal } from "@/modules/operations/components/OperationDetailsModal";
import { ReferralRewardDetailsModal } from "@/modules/operations/components/ReferralRewardDetailsModal";
import { TopUpDialog } from "@/modules/wallet/components/TopUpDialog";
import { useRealtime, isDepositUpdate } from "@/shared/lib/realtime-context";
import { getOperationByIdAction } from "@/modules/operations/api/get-operation-by-id";
import { syncDepositStatusAction } from "@/modules/wallet/api/sync-deposit-status";

interface RecentOperationsProps {
  userId: string;
}

export function RecentOperations({ userId }: RecentOperationsProps) {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);
  const [showTopUp, setShowTopUp] = useState(false);
  const operationsRef = useRef<Operation[]>([]);
  const router = useRouter();

  // Subscribe to realtime updates via shared context (single SSE connection)
  const { lastUpdate } = useRealtime();

  // Fetch operations function
  const fetchOperations = useCallback(async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) {
        setIsLoading(true);
      }
      const res = await fetch(`/api/wallet/operations?limit=3`, {
        cache: 'no-store', // Ensure fresh data
      });
      if (!res.ok) {
        console.error("Failed to fetch operations");
        return;
      }
      const data = await res.json();
      const fetchedOps = data.items || [];
      setOperations(fetchedOps);
      operationsRef.current = fetchedOps;
      console.log("[RecentOperations] Fetched operations:", fetchedOps.length);
    } catch (error) {
      console.error("Error fetching operations:", error);
    } finally {
      if (isInitialLoad) {
        setIsLoading(false);
      }
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchOperations(true);
  }, [userId]);

  // Immediately update operation status when deposit_status_updated event is received
  useEffect(() => {
    if (!isDepositUpdate(lastUpdate)) return;

    const update = lastUpdate;
    console.log("[RecentOperations] Processing deposit_status_updated:", update);

    // Check if this deposit already exists in the list
    const existingOp = operationsRef.current.find((op) => op.type === "deposit" && op.id === update.depositId);

    if (existingOp) {
      // Update existing deposit operation
      setOperations((prevOps) => {
        const updatedOps = prevOps.map((op) => {
          if (op.type === "deposit" && op.id === update.depositId) {
            console.log("[RecentOperations] Updating deposit operation:", op.id, "status:", op.status, "->", update.status);
            return {
              ...op,
              status: update.status,
              confirmations: update.confirmations ?? op.confirmations,
              requiredConfirmations: update.requiredConfirmations ?? op.requiredConfirmations,
              txStatus: update.txStatus ?? op.txStatus,
              confirmedAt: update.confirmedAt ? new Date(update.confirmedAt) : op.confirmedAt,
            };
          }
          return op;
        });

        // Update ref as well
        operationsRef.current = updatedOps;
        return updatedOps;
      });
    } else {
      // New deposit - fetch operations to get the new one
      console.log("[RecentOperations] New deposit detected, fetching operations...");
      fetchOperations(false);
    }
  }, [lastUpdate, fetchOperations]);

  // Handle operation_created events - refresh operations list
  // RealtimeProvider already calls router.refresh(), but we add explicit handling here
  // to ensure the list updates when a new operation is created
  useEffect(() => {
    // Use the existing EventSource connection from RealtimeProvider
    // We'll listen for operation_created events and refresh the router
    const eventSource = new EventSource("/api/realtime/terminal");
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle all operation_created events (strategy_profit, withdrawal, referral_payout, etc.)
        if (data.type === "operation_created") {
          console.log(`[RecentOperations] operation_created received:`, data.operationType);
          fetchOperations(false);
        }
        
        // Handle deposit_status_updated events (for new deposits and status updates)
        if (data.type === "deposit_status_updated") {
          console.log("[RecentOperations] deposit_status_updated received:", data.depositId);
          // Always fetch operations to get new deposits or updated ones
          // The lastUpdate effect will handle immediate status updates for existing deposits
          fetchOperations(false);
        }
        
        // Handle affiliate_payout_created events
        if (data.type === "affiliate_payout_created") {
          console.log("[RecentOperations] affiliate_payout_created received, refreshing...");
          fetchOperations(false);
        }
      } catch (e) {
        // Ignore parsing errors
      }
    };

    return () => {
      eventSource.close();
    };
  }, [fetchOperations]);

  // Periodic update for active deposits with confirmations (every 5 seconds)
  useEffect(() => {
    const activeDepositIds = operations
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

                  if (
                    updatedOp.confirmations !== null &&
                    updatedOp.confirmations !== undefined &&
                    updatedOp.requiredConfirmations !== null &&
                    updatedOp.requiredConfirmations !== undefined &&
                    updatedOp.confirmations >= updatedOp.requiredConfirmations &&
                    updatedOp.status === "paying"
                  ) {
                    try {
                      await syncDepositStatusAction(op.id);
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
        setOperations(updatedOps);
      } catch (error) {
        console.error("Error updating operations:", error);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [operations]);

  const selectedOperation = operations.find((op) => op.id === selectedOperationId) || null;

  if (isLoading) {
    return (
      <div className="mt-6 sm:mt-8">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-2xl text-white-900">Operations</h2>
        </div>
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
              <OperationItemSkeleton />
              <OperationItemSkeleton />
              <OperationItemSkeleton />
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (operations.length === 0) {
    return (
      <div className="mt-6 sm:mt-8">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-2xl text-white-900">Operations</h2>
          <Link href="/operations">
            <Button variant="secondary" size="sm">
              View All
            </Button>
          </Link>
        </div>
        <p className="text-body text-white-600">No operations yet</p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-6 sm:mt-8">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-2xl text-white-900">Operations</h2>
          <Link href="/operations">
            <Button variant="secondary" size="sm">
              View All
            </Button>
          </Link>
        </div>
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
              {operations.map((operation) => (
                <OperationItem
                  key={operation.id}
                  operation={operation}
                  onDetailsClick={(id) => {
                    const op = operations.find((o) => o.id === id);
                    if (op?.type === "deposit" && op.status === "paying") {
                      setShowTopUp(true);
                    } else {
                      setSelectedOperationId(id);
                    }
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
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

