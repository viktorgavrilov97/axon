"use client";

import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getStatusText } from "@/modules/operations/lib/status-utils";
import { DepositDetailsModal } from "./DepositDetailsModal";
import { DepositStatusFilter, type DepositStatusFilter as DepositStatusFilterType } from "@/shared/ui/deposit-status-filter";

// OxaPay deposit statuses
type OxaPayDepositStatus = "paying" | "paid" | "expired" | "failed" | "cancelled";

interface Deposit {
  id: string;
  userEmail: string;
  userId: string;
  userName: string | null;
  userDisplayName: string | null;
  userAvatarUrl: string | null;
  userAvatarColor: string | null;
  amountUsdt: number;
  payAmount: number | null;
  payCurrency: string | null;
  status: OxaPayDepositStatus; // OxaPay status
  address: string | null;
  txHash: string | null;
  createdAt: Date;
  confirmedAt: Date | null;
}

interface DepositsTableProps {
  initialDeposits: Deposit[];
}

function DepositItem({ deposit, onDetailsClick }: { deposit: Deposit; onDetailsClick: (deposit: Deposit) => void }) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const amount = deposit.payAmount || deposit.amountUsdt;

  return (
    <tr 
      className="bg-onsurface-900 hover:bg-onsurface-800 transition-all duration-200 cursor-pointer group rounded-xl"
      onClick={() => onDetailsClick(deposit)}
    >
      <td className="py-5 px-5 rounded-l-xl group-hover:px-6 transition-all duration-200 overflow-hidden">
        <span className="text-body text-white-900">
        {deposit.userEmail}
        </span>
      </td>
      <td className="py-5 px-5 group-hover:px-6 transition-all duration-200 overflow-hidden">
        {(() => {
          const statusText = getStatusText(deposit.status);
          const statusConfig = 
            deposit.status === "paid"
              ? { bg: "bg-[#A5EACF]/10", text: "text-[#A5EACF]" }
              : deposit.status === "paying"
              ? { bg: "bg-[#F4D48C]/10", text: "text-[#F4D48C]" }
              : deposit.status === "failed" || deposit.status === "expired" || deposit.status === "cancelled"
              ? { bg: "bg-[#F2A8A8]/10", text: "text-[#F2A8A8]" }
              : { bg: "bg-[#A8CFFF]/10", text: "text-[#A8CFFF]" };
          
          return (
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-small ${statusConfig.bg} ${statusConfig.text}`}>
              {statusText}
        </span>
          );
        })()}
      </td>
      <td className="py-5 px-5 group-hover:px-6 transition-all duration-200 overflow-hidden">
        <span className="text-body text-white-700 whitespace-nowrap">
        {formatDate(deposit.createdAt)}
        </span>
      </td>
      <td className="py-5 px-5 rounded-r-xl group-hover:px-6 text-right transition-all duration-200 overflow-hidden">
        <span className="text-body font-medium text-white-900 whitespace-nowrap">
          {amount.toFixed(2)} USDT
        </span>
      </td>
    </tr>
  );
}

function DepositsTableContent({ initialDeposits }: DepositsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStatus = (searchParams.get("status") || "all") as DepositStatusFilterType;
  const depositIdParam = searchParams.get("depositId");
  const [selectedDeposit, setSelectedDeposit] = useState<Deposit | null>(null);
  const [deposits, setDeposits] = useState<Deposit[]>(initialDeposits);

  // Auto-open modal if depositId is in query params
  useEffect(() => {
    if (depositIdParam && deposits.length > 0) {
      const deposit = deposits.find((d) => d.id === depositIdParam);
      if (deposit) {
        setSelectedDeposit(deposit);
      }
    }
  }, [depositIdParam, deposits]);

  // Subscribe to realtime deposit status updates
  useEffect(() => {
    const eventSource = new EventSource("/api/realtime/terminal");
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle deposit status updates
        if (data.type === "deposit_status_updated") {
          console.log("[DepositsTable] deposit_status_updated received:", data);
          
          // Update deposit status in local state immediately
          setDeposits((prevDeposits) => {
            const updated = prevDeposits.map((deposit) =>
              deposit.id === data.depositId
                ? { 
                    ...deposit, 
                    status: data.status as OxaPayDepositStatus,
                    confirmedAt: data.confirmedAt ? new Date(data.confirmedAt) : (data.status === "paid" ? new Date() : deposit.confirmedAt),
                  }
                : deposit
            );
            console.log("[DepositsTable] Updated deposits state:", updated.find(d => d.id === data.depositId));
            return updated;
          });
          
          // Update selected deposit if it's the one being updated
          setSelectedDeposit((prev) => {
            if (prev && prev.id === data.depositId) {
              const updated = {
                ...prev,
                status: data.status as OxaPayDepositStatus,
                confirmedAt: data.confirmedAt ? new Date(data.confirmedAt) : (data.status === "paid" ? new Date() : prev.confirmedAt),
              };
              console.log("[DepositsTable] Updated selected deposit:", updated);
              return updated;
            }
            return prev;
          });
        }
      } catch (e) {
        console.error("[DepositsTable] Failed to handle realtime event:", e);
      }
    };

    eventSource.onerror = (error) => {
      console.error("[DepositsTable] EventSource error:", error);
    };

    return () => {
      eventSource.close();
    };
  }, [router]);

  const handleStatusFilter = (status: DepositStatusFilterType) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === "all") {
      params.delete("status");
    } else {
      params.set("status", status);
    }
    router.push(`/admin/deposits?${params.toString()}`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl text-white-900">Deposits</h1>
        <DepositStatusFilter
          value={currentStatus}
          onChange={handleStatusFilter}
        />
      </div>

      {/* Deposits Table */}
      <div className="rounded-xl overflow-hidden">
        {initialDeposits.length === 0 ? (
          <div className="p-8">
            <p className="text-body text-white-600 text-center">
              No deposits yet
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-separate" style={{ borderSpacing: '0 12px' }}>
              <colgroup>
                <col className="w-[35%]" />
                <col className="w-[20%]" />
                <col className="w-[25%]" />
                <col className="w-[20%]" />
              </colgroup>
              <thead>
                <tr>
                  <th className="text-left text-small text-white-700 pb-4 pl-0">User</th>
                  <th className="text-left text-small text-white-700 pb-4 pl-0">Status</th>
                  <th className="text-left text-small text-white-700 pb-4 pl-0">Created</th>
                  <th className="text-right text-small text-white-700 pb-4 pr-0">Amount</th>
                </tr>
              </thead>
              <tbody>
                {deposits.map((deposit) => (
                  <DepositItem 
                    key={deposit.id} 
                    deposit={deposit} 
                    onDetailsClick={setSelectedDeposit}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedDeposit && (
        <DepositDetailsModal
          deposit={selectedDeposit}
          onClose={() => {
            setSelectedDeposit(null);
            // Remove depositId from URL
            const params = new URLSearchParams(searchParams.toString());
            params.delete("depositId");
            router.push(`/admin/deposits?${params.toString()}`);
          }}
        />
      )}
    </div>
  );
}

export function DepositsTable({ initialDeposits }: DepositsTableProps) {
  return (
    <Suspense fallback={
      <div className="space-y-3">
        <div className="px-0 py-4 rounded-xl flex items-center gap-4">
          <div className="w-6 h-6 border-2 border-white-700 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    }>
      <DepositsTableContent initialDeposits={initialDeposits} />
    </Suspense>
  );
}

