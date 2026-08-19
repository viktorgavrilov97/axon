"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Operation } from "../lib/types";
import { OperationItem } from "./OperationItem";
import { OperationDetailsModal } from "./OperationDetailsModal";
import { ReferralRewardDetailsModal } from "./ReferralRewardDetailsModal";
import { TopUpDialog } from "@/modules/wallet/components/TopUpDialog";
import { useRealtime, isDepositUpdate } from "@/shared/lib/realtime-context";
import { getOperationByIdAction } from "../api/get-operation-by-id";
import { syncDepositStatusAction } from "@/modules/wallet/api/sync-deposit-status";
import { isTestMode } from "@/shared/lib/env";

interface OperationsListProps {
  operations: Operation[];
}

export function OperationsList({ operations: initialOperations }: OperationsListProps) {
  const [operations, setOperations] = useState<Operation[]>(initialOperations);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);
  const [showTopUp, setShowTopUp] = useState(false);
  const selectedOperation = operations.find((op) => op.id === selectedOperationId) || null;
  
  // Debug: log when selectedOperationId changes
  useEffect(() => {
    console.log("[OperationsList] selectedOperationId changed to:", selectedOperationId);
    if (selectedOperationId) {
      const found = operations.find((op) => op.id === selectedOperationId);
      console.log("[OperationsList] Found operation for selectedOperationId:", found?.type, found?.id);
    }
  }, [selectedOperationId, operations]);
  
  // Debug: log when selectedOperation changes
  useEffect(() => {
    if (selectedOperation) {
      console.log("[OperationsList] selectedOperation changed:", selectedOperation.type, selectedOperation.id);
    } else if (selectedOperationId) {
      console.log("[OperationsList] selectedOperationId is set but operation not found:", selectedOperationId, "Available IDs:", operations.map(o => o.id));
    }
  }, [selectedOperation, selectedOperationId, operations]);
  const operationsRef = useRef<Operation[]>(initialOperations);
  const router = useRouter();

  // Log environment info (client-side)
  useEffect(() => {
    console.log("Environment:", process.env.NEXT_PUBLIC_VERCEL_ENV);
    console.log("Test mode:", isTestMode());
  }, []);

  // Subscribe to realtime updates via shared context (single SSE connection)
  const { lastUpdate } = useRealtime();

  // Update local state when initialOperations changes (after refresh from realtime)
  useEffect(() => {
    setOperations(initialOperations);
    operationsRef.current = initialOperations;
  }, [initialOperations]);

  // Immediately update operation status when deposit_status_updated event is received
  useEffect(() => {
    if (!isDepositUpdate(lastUpdate)) return;

    const update = lastUpdate;
    console.log("[OperationsList] Processing deposit_status_updated:", update);

    setOperations((prevOps) => {
      const updatedOps = prevOps.map((op) => {
        // Update deposit operation if it matches the depositId
        if (op.type === "deposit" && op.id === update.depositId) {
          console.log("[OperationsList] Updating deposit operation:", op.id, "status:", op.status, "->", update.status);
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
  }, [lastUpdate]);

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
        
        if (data.type === "operation_created") {
          if (data.operationType === "withdrawal" || data.operationType === "referral_payout") {
            console.log(`[OperationsList] ${data.operationType} created received, refreshing...`);
            // Small delay to ensure DB transaction is committed
            setTimeout(() => {
              router.refresh();
            }, 100);
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }
    };

    return () => {
      eventSource.close();
    };
  }, [router]);

  // Periodic update for active deposits with confirmations (every 5 seconds)
  useEffect(() => {
    const activeDepositIds = initialOperations
      .filter((op) => op.type === "deposit" && op.status === "paying")
      .map((op) => op.id);

    if (activeDepositIds.length === 0) return;

    const interval = setInterval(async () => {
      // Get current operations from ref (always up-to-date)
      const currentOps = operationsRef.current;

      try {
        const updatedOps = await Promise.all(
          currentOps.map(async (op) => {
            // Only update active deposits
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
        
        // Update both state and ref after all async operations complete
        operationsRef.current = updatedOps;
        setOperations(updatedOps);
      } catch (error) {
        console.error("Error updating operations:", error);
      }
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [initialOperations]);

      return (
        <>
          <div className="w-full">
            <h2 className="text-lg text-white-900 mb-12">Recent activity</h2>
            {operations.length === 0 ? (
              <p className="text-body text-white-700 text-center py-8">
                No operations yet
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <colgroup>
                    <col className="w-[40%]" />
                    <col className="w-[30%]" />
                    <col className="w-[30%]" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="text-left text-small text-white-700 pb-6 pl-0">Operation</th>
                      <th className="text-left text-small text-white-700 pb-3 pl-0">Date</th>
                      <th className="text-right text-small text-white-700 pb-3 pr-0">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {operations.map((operation) => (
                      <OperationItem
                        key={operation.id}
                        operation={operation}
                        onDetailsClick={(id) => {
                          console.log("[OperationsList] onDetailsClick called with id:", id);
                          console.log("[OperationsList] Current operations:", operations.length);
                          const op = operations.find((o) => o.id === id);
                          console.log("[OperationsList] Found operation:", op?.type, op?.id, op);
                          // For deposits with "paying" status, open TopUpDialog instead
                          if (op?.type === "deposit" && op.status === "paying") {
                            console.log("[OperationsList] Opening TopUpDialog");
                            setShowTopUp(true);
                          } else {
                            console.log("[OperationsList] Setting selectedOperationId to:", id, "operation type:", op?.type);
                            setSelectedOperationId(id);
                            // Force a re-render check
                            setTimeout(() => {
                              console.log("[OperationsList] After setSelectedOperationId, selectedOperationId should be:", id);
                            }, 0);
                          }
                        }}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

      {selectedOperation && (
        <>
          {selectedOperation.type === "referral_payout" ? (
            <>
              {console.log("[OperationsList] Rendering ReferralRewardDetailsModal for:", selectedOperation.id)}
              <ReferralRewardDetailsModal
                operation={selectedOperation}
                onClose={() => {
                  console.log("[OperationsList] Closing ReferralRewardDetailsModal");
                  setSelectedOperationId(null);
                }}
              />
            </>
          ) : (
            <>
              {console.log("[OperationsList] Rendering OperationDetailsModal for:", selectedOperation.type, selectedOperation.id)}
              <OperationDetailsModal
                operation={selectedOperation}
                onClose={() => {
                  console.log("[OperationsList] Closing OperationDetailsModal");
                  setSelectedOperationId(null);
                }}
              />
            </>
          )}
        </>
      )}

      {showTopUp && (
        <TopUpDialog
          onClose={() => setShowTopUp(false)}
        />
      )}
    </>
  );
}

