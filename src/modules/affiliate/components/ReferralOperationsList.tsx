"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Operation } from "@/modules/operations/lib/types";
import { OperationItem } from "@/modules/operations/components/OperationItem";
import { OperationItemSkeleton } from "@/modules/operations/components/OperationItemSkeleton";
import { ReferralRewardDetailsModal } from "@/modules/operations/components/ReferralRewardDetailsModal";
import { getOperationsAction } from "@/modules/operations/api/get-operations";
import { useRealtime } from "@/shared/lib/realtime-context";

export function ReferralOperationsList() {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);
  const router = useRouter();
  const { lastUpdate } = useRealtime();

  const selectedOperation = operations.find((op) => op.id === selectedOperationId) || null;

  // Fetch referral payout operations
  const fetchOperations = async () => {
    try {
      setIsLoading(true);
      const result = await getOperationsAction();
      if (result.success && result.operations) {
        // Filter only referral_payout operations
        const referralOperations = result.operations.filter(
          (op) => op.type === "referral_payout"
        );
        setOperations(referralOperations);
      }
    } catch (error) {
      console.error("Error fetching referral operations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchOperations();
  }, []);

  // Refresh on realtime updates
  useEffect(() => {
    if (lastUpdate) {
      fetchOperations();
    }
  }, [lastUpdate]);

  // Listen for affiliate_payout_created events
  useEffect(() => {
    const eventSource = new EventSource("/api/realtime/terminal");
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === "affiliate_payout_created" || 
            (data.type === "operation_created" && data.operationType === "referral_payout")) {
          console.log("[ReferralOperationsList] Referral payout created, refreshing...");
          setTimeout(() => {
            fetchOperations();
          }, 100);
        }
      } catch (e) {
        // Ignore parsing errors
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  if (isLoading) {
    return (
      <>
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <h2 className="text-2xl text-white-900">Recent Payouts</h2>
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
      </>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <h2 className="text-2xl text-white-900">Recent Payouts</h2>
      </div>
      {operations.length === 0 ? (
        <div className="p-4 sm:p-6 bg-onsurface-900 rounded-xl">
          <p className="text-body text-white-700">No referral payouts yet</p>
          <p className="text-small text-white-600 mt-2">
            As soon as your partners start earning on strategies, your referral rewards will appear here.
          </p>
        </div>
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
              {operations.map((operation) => (
                <OperationItem
                  key={operation.id}
                  operation={operation}
                  onDetailsClick={(id) => {
                    setSelectedOperationId(id);
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedOperation && (
        <ReferralRewardDetailsModal
          operation={selectedOperation}
          onClose={() => {
            setSelectedOperationId(null);
          }}
        />
      )}
    </>
  );
}

