"use client";

import { useState, useTransition, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { updateWithdrawalStatusAction } from "@/modules/admin/api/update-withdrawal-status";
import { triggerWithdrawalPayoutAction } from "@/modules/admin/api/trigger-withdrawal-payout";
import { syncWithdrawalStatusAction } from "@/modules/admin/api/sync-withdrawal-status";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/inputs";
import { WithdrawalStatus, WithdrawalProvider } from "@prisma/client";
import { ArrowClockwise } from "@phosphor-icons/react";
import { WithdrawalDetailsModal } from "./WithdrawalDetailsModal";
import { getStatusText, getStatusColor } from "@/modules/operations/lib/status-utils";
import { WithdrawalStatusFilter, type WithdrawalStatusFilter as WithdrawalStatusFilterType } from "@/shared/ui/withdrawal-status-filter";

interface Withdrawal {
  id: string;
  userEmail: string;
  amount: number;
  toAddress: string;
  status: WithdrawalStatus;
  txHash: string | null;
  rejectionReason: string | null;
  createdAt: Date;
  processedAt: Date | null;
  provider: WithdrawalProvider;
  providerPayoutId: string | null;
  currency: string | null;
}

interface WithdrawalsTableProps {
  initialWithdrawals: Withdrawal[];
}

function WithdrawalItem({
  withdrawal,
  onPayout,
  onReject,
  onSyncStatus,
  onDetailsClick,
  isPending,
  payoutingId,
  rejectingId,
  syncingId,
  rejectionReason,
  onRejectionReasonChange,
  onCancelReject,
}: {
  withdrawal: Withdrawal;
  onPayout: (id: string) => void;
  onReject: (id: string) => void;
  onSyncStatus: (id: string) => void;
  onDetailsClick: (withdrawal: Withdrawal) => void;
  isPending: boolean;
  payoutingId: string | null;
  rejectingId: string | null;
  syncingId: string | null;
  rejectionReason: string;
  onRejectionReasonChange: (reason: string) => void;
  onCancelReject: () => void;
}) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const canShowActions = withdrawal.status === "PENDING" || withdrawal.status === "APPROVED" || withdrawal.status === "PROCESSING";

  return (
    <>
      <tr 
        className="bg-onsurface-900 hover:bg-onsurface-800 transition-all duration-200 cursor-pointer group rounded-xl"
        onClick={() => onDetailsClick(withdrawal)}
      >
        <td className="py-5 px-5 rounded-l-xl group-hover:px-6 transition-all duration-200 overflow-hidden">
          <span className="text-body text-white-900">
          {withdrawal.userEmail}
          </span>
        </td>
        <td className="py-5 px-5 group-hover:px-6 transition-all duration-200 overflow-hidden">
          <span className={`text-body font-medium ${
            withdrawal.status === "COMPLETED" 
              ? "text-[#A5EACF]"
              : "text-white-900"
          }`}>
            {withdrawal.amount.toFixed(2)} USDT
          </span>
        </td>
        <td className="py-5 px-5 group-hover:px-6 transition-all duration-200 overflow-hidden">
          <span className="text-body text-white-900 font-mono text-sm">
          {withdrawal.toAddress.slice(0, 10)}...{withdrawal.toAddress.slice(-10)}
          </span>
        </td>
        <td className="py-5 px-5 group-hover:px-6 transition-all duration-200 overflow-hidden">
          {(() => {
            const statusText = getStatusText(withdrawal.status);
            const statusConfig = 
              withdrawal.status === "COMPLETED"
                ? { bg: "bg-[#A5EACF]/10", text: "text-[#A5EACF]" }
                : withdrawal.status === "PENDING" || withdrawal.status === "APPROVED" || withdrawal.status === "PROCESSING"
                ? { bg: "bg-[#F4D48C]/10", text: "text-[#F4D48C]" }
                : withdrawal.status === "REJECTED"
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
          {formatDate(withdrawal.createdAt)}
          </span>
        </td>
        <td className="py-5 px-5 group-hover:px-6 transition-all duration-200 overflow-hidden">
          <span className="text-body text-white-900 font-mono text-sm">
          {withdrawal.txHash ? `${withdrawal.txHash.slice(0, 10)}...${withdrawal.txHash.slice(-10)}` : "-"}
          </span>
        </td>
        <td className="py-5 px-5 rounded-r-xl group-hover:px-6 text-right transition-all duration-200 overflow-hidden" onClick={(e) => e.stopPropagation()}>
          {canShowActions && rejectingId !== withdrawal.id && (
            <div className="flex gap-2">
              {withdrawal.provider === WithdrawalProvider.OXAPAY ? (
                <>
                  {withdrawal.providerPayoutId || withdrawal.status === "PROCESSING" ? (
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col">
                        <span className="text-body text-white-600 text-sm">Processing</span>
                        {withdrawal.providerPayoutId && (
                          <span className="text-xs text-white-600 font-mono">
                            {withdrawal.providerPayoutId.slice(0, 12)}...
                          </span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onSyncStatus(withdrawal.id)}
                        disabled={isPending || syncingId === withdrawal.id}
                        className="p-2"
                      >
                        <ArrowClockwise 
                          size={16} 
                          weight="regular" 
                          className={syncingId === withdrawal.id ? "animate-spin" : ""}
                        />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => onPayout(withdrawal.id)}
                      disabled={isPending || payoutingId === withdrawal.id}
                    >
                      {isPending && payoutingId === withdrawal.id ? "Creating payout..." : "Payout"}
                    </Button>
                  )}
                </>
              ) : (
                <span className="text-body text-white-600 text-sm">
                  Manual processing
                </span>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onReject(withdrawal.id)}
                disabled={isPending}
              >
                Reject
              </Button>
            </div>
          )}
        </td>
      </tr>
      {rejectingId === withdrawal.id && (
        <tr className="bg-onsurface-900 transition-all duration-200">
          <td colSpan={7} className="py-4 px-5 rounded-xl">
            <div className="flex flex-col gap-2">
              <textarea
                placeholder="Rejection reason (required)"
                value={rejectionReason}
                onChange={(e) => onRejectionReasonChange(e.target.value)}
                className="text-sm bg-onsurface-900 border border-white-500 rounded px-3 py-2 text-white-900 resize-none"
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => onReject(withdrawal.id)}
                  disabled={isPending || !rejectionReason.trim()}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onCancelReject}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function WithdrawalsTableContent({
  initialWithdrawals,
}: WithdrawalsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentStatus = (searchParams.get("status") || "all") as WithdrawalStatusFilterType;
  const withdrawalIdParam = searchParams.get("withdrawalId");
  const [withdrawals, setWithdrawals] =
    useState<Withdrawal[]>(initialWithdrawals);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string>("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>("");
  const [payoutingId, setPayoutingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<Withdrawal | null>(null);

  // Auto-open modal if withdrawalId is in query params
  useEffect(() => {
    if (withdrawalIdParam && initialWithdrawals.length > 0) {
      const withdrawal = initialWithdrawals.find((w) => w.id === withdrawalIdParam);
      if (withdrawal) {
        setSelectedWithdrawal(withdrawal);
      }
    }
  }, [withdrawalIdParam, initialWithdrawals]);

  const handlePayout = (withdrawalId: string) => {
    setError(null);
    setSuccess(null);
    setPayoutingId(withdrawalId);

    startTransition(async () => {
      const result = await triggerWithdrawalPayoutAction(withdrawalId);

      if (result?.error) {
        setError(result.error);
        setPayoutingId(null);
      } else if (result?.success) {
        setSuccess(result.message || "Payout created successfully");
        // Refresh withdrawals to show updated status
        // After payout creation, status becomes PROCESSING
        setWithdrawals((prev) =>
          prev.map((w) =>
            w.id === withdrawalId
              ? {
                  ...w,
                  status: result.payoutId ? "PROCESSING" : (w.status === "PENDING" ? "APPROVED" : w.status),
                  providerPayoutId: result.payoutId || w.providerPayoutId,
                }
              : w
          )
        );
        setPayoutingId(null);
        setTimeout(() => setSuccess(null), 5000);
      }
    });
  };

  const handleComplete = (withdrawalId: string) => {
    if (completingId === withdrawalId) {
      // Submit
      setError(null);
      setSuccess(null);

      startTransition(async () => {
        const formData = new FormData();
        formData.append("withdrawalId", withdrawalId);
        formData.append("status", "COMPLETED");
        if (txHash.trim()) {
          formData.append("txHash", txHash.trim());
        }

        const result = await updateWithdrawalStatusAction(formData);

        if (result?.error) {
          setError(result.error);
        } else if (result?.success) {
          setSuccess("Withdrawal marked as completed");
          setWithdrawals((prev) =>
            prev.map((w) =>
              w.id === withdrawalId
                ? {
                    ...w,
                    status: "COMPLETED",
                    txHash: txHash.trim() || w.txHash,
                    processedAt: new Date(),
                  }
                : w
            )
          );
          setCompletingId(null);
          setTxHash("");
          setTimeout(() => setSuccess(null), 3000);
        }
      });
    } else {
      // Open form
      setCompletingId(withdrawalId);
      setTxHash("");
    }
  };

  const handleReject = (withdrawalId: string) => {
    if (rejectingId === withdrawalId) {
      // Submit rejection with reason
      setError(null);
      setSuccess(null);

      startTransition(async () => {
        const formData = new FormData();
        formData.append("withdrawalId", withdrawalId);
        formData.append("status", "REJECTED");
        if (rejectionReason.trim()) {
          formData.append("rejectionReason", rejectionReason.trim());
        }

        const result = await updateWithdrawalStatusAction(formData);

        if (result?.error) {
          setError(result.error);
        } else if (result?.success) {
          setSuccess("Withdrawal rejected");
          setWithdrawals((prev) =>
            prev.map((w) =>
              w.id === withdrawalId
                ? {
                    ...w,
                    status: "REJECTED",
                    rejectionReason: rejectionReason.trim() || null,
                  }
                : w
            )
          );
          setRejectingId(null);
          setRejectionReason("");
          setTimeout(() => setSuccess(null), 3000);
        }
      });
    } else {
      // Open rejection form
      setRejectingId(withdrawalId);
      setRejectionReason("");
    }
  };

  const handleSyncStatus = (withdrawalId: string) => {
    setError(null);
    setSuccess(null);
    setSyncingId(withdrawalId);

    startTransition(async () => {
      const result = await syncWithdrawalStatusAction(withdrawalId);

      if (result?.error) {
        setError(result.error);
        setSyncingId(null);
      } else if (result?.success) {
        setSuccess(`Status synced: ${result.status}`);
        setSyncingId(null);
        
        // Update local state with new status
        setWithdrawals((prev) =>
          prev.map((w) =>
            w.id === withdrawalId
              ? {
                  ...w,
                  status: result.status as WithdrawalStatus,
                  // Status will be updated by router refresh
                }
              : w
          )
        );
        
        // Refresh data from server
        router.refresh();
        setTimeout(() => setSuccess(null), 3000);
      }
    });
  };

  const handleStatusFilter = (status: WithdrawalStatusFilterType) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === "all") {
      params.delete("status");
    } else {
      params.set("status", status);
    }
    router.push(`/admin/withdrawals?${params.toString()}`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl text-white-900">Withdrawals</h1>
        <WithdrawalStatusFilter
          value={currentStatus}
          onChange={handleStatusFilter}
        />
      </div>

      {error && (
        <div className="mb-4 p-4 bg-surface-800 border border-redhaze text-redhaze text-body rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-surface-800 border border-mint text-mint text-body rounded">
          {success}
        </div>
      )}

      <div className="rounded-xl overflow-hidden">
        {withdrawals.length === 0 ? (
          <div className="p-8">
            <p className="text-body text-white-600 text-center">
              No withdrawals yet
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-fixed border-separate" style={{ borderSpacing: '0 12px' }}>
              <colgroup>
                <col className="w-[20%]" />
                <col className="w-[12%]" />
                <col className="w-[18%]" />
                <col className="w-[12%]" />
                <col className="w-[15%]" />
                <col className="w-[15%]" />
                <col className="w-[8%]" />
              </colgroup>
              <thead>
                <tr>
                  <th className="text-left text-small text-white-700 pb-4 pl-0">User</th>
                  <th className="text-left text-small text-white-700 pb-4 pl-0">Amount</th>
                  <th className="text-left text-small text-white-700 pb-4 pl-0">Address</th>
                  <th className="text-left text-small text-white-700 pb-4 pl-0">Status</th>
                  <th className="text-left text-small text-white-700 pb-4 pl-0">Created</th>
                  <th className="text-left text-small text-white-700 pb-4 pl-0">txHash</th>
                  <th className="text-right text-small text-white-700 pb-4 pr-0">Actions</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((withdrawal) => (
                  <WithdrawalItem
                    key={withdrawal.id}
                    withdrawal={withdrawal}
                    onPayout={handlePayout}
                    onReject={handleReject}
                    onSyncStatus={handleSyncStatus}
                    onDetailsClick={setSelectedWithdrawal}
                    isPending={isPending}
                    payoutingId={payoutingId}
                    rejectingId={rejectingId}
                    syncingId={syncingId}
                    rejectionReason={rejectionReason}
                    onRejectionReasonChange={setRejectionReason}
                    onCancelReject={() => {
                      setRejectingId(null);
                      setRejectionReason("");
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedWithdrawal && (
        <WithdrawalDetailsModal
          withdrawal={selectedWithdrawal}
          onClose={() => {
            setSelectedWithdrawal(null);
            // Remove withdrawalId from URL
            const params = new URLSearchParams(searchParams.toString());
            params.delete("withdrawalId");
            router.push(`/admin/withdrawals?${params.toString()}`);
          }}
        />
      )}
    </div>
  );
}

export function WithdrawalsTable({
  initialWithdrawals,
}: WithdrawalsTableProps) {
  return (
    <Suspense fallback={
      <div className="space-y-3">
        <div className="px-0 py-4 rounded-xl flex items-center gap-4">
          <div className="w-6 h-6 border-2 border-white-700 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    }>
      <WithdrawalsTableContent initialWithdrawals={initialWithdrawals} />
    </Suspense>
  );
}

