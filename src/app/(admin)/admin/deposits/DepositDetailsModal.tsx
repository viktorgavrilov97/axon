"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MODAL_STYLES } from "@/shared/ui/modal/styles";
import { Button } from "@/shared/ui/button";
import { confirmDepositAction } from "@/modules/admin/api/confirm-deposit";
import { getStatusText } from "@/modules/operations/lib/status-utils";
import { NETWORKS, type NetworkType } from "@/modules/wallet/lib/network-types";
import { UserAvatar } from "@/shared/ui/user-avatar";
import { getUserDisplayName } from "@/shared/lib/user-display";

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
  status: OxaPayDepositStatus;
  address: string | null;
  txHash: string | null;
  createdAt: Date;
  confirmedAt: Date | null;
}

interface DepositDetailsModalProps {
  deposit: Deposit;
  onClose: () => void;
}

// Helper function to infer network from address/currency
const inferNetworkFromAddress = (address: string | null | undefined): NetworkType | null => {
  if (!address) return null;
  // Most addresses are hex strings, but we can't reliably determine network from address alone
  // For now, return null - network info would need to come from deposit data
  return null;
};

// Get blockchain explorer URL
const getBlockchainExplorerUrl = (txHash: string | null, address: string | null): { url: string; label: string } | null => {
  if (!txHash) return null;

  // Try to infer network from txHash format or address
  // For now, we'll default to Etherscan for 0x addresses
  if (txHash.startsWith("0x")) {
    // Could be Ethereum, BSC, Polygon, etc. Default to Ethereum
    return {
      url: `https://etherscan.io/tx/${txHash}`,
      label: "Open in Etherscan",
    };
  }
  
  // Tron addresses start with T
  if (address?.startsWith("T")) {
    return {
      url: `https://tronscan.org/#/transaction/${txHash}`,
      label: "View in TronScan",
    };
  }

  return null;
};

export function DepositDetailsModal({ deposit: initialDeposit, onClose }: DepositDetailsModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deposit, setDeposit] = useState<Deposit>(initialDeposit);

  // Subscribe to realtime deposit status updates
  useEffect(() => {
    const eventSource = new EventSource("/api/realtime/terminal");
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle deposit status updates
        if (data.type === "deposit_status_updated" && data.depositId === deposit.id) {
          console.log("[DepositDetailsModal] deposit_status_updated received:", data);
          
          // Update deposit status in local state immediately
          setDeposit((prevDeposit) => {
            const updated = {
              ...prevDeposit,
              status: data.status as OxaPayDepositStatus,
              confirmedAt: data.confirmedAt ? new Date(data.confirmedAt) : (data.status === "paid" ? new Date() : prevDeposit.confirmedAt),
            };
            console.log("[DepositDetailsModal] Updated deposit state:", updated);
            return updated;
          });
        }
      } catch (e) {
        console.error("[DepositDetailsModal] Failed to handle realtime event:", e);
      }
    };

    eventSource.onerror = (error) => {
      console.error("[DepositDetailsModal] EventSource error:", error);
    };

    return () => {
      eventSource.close();
    };
  }, [deposit.id]);

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const amount = deposit.payAmount || deposit.amountUsdt;
  const explorerInfo = getBlockchainExplorerUrl(deposit.txHash, deposit.address);

  const handleConfirm = () => {
    if (!confirm("Are you sure you want to confirm this deposit? This will credit the balance to the user.")) {
      return;
    }

    startTransition(async () => {
      const result = await confirmDepositAction(deposit.id);
      if (result.success) {
        // Update status immediately (realtime event will also update it, but this is instant)
        setDeposit((prevDeposit) => ({
          ...prevDeposit,
          status: "paid" as OxaPayDepositStatus,
          confirmedAt: new Date(),
        }));
        // Don't close modal, let user see the updated status
        // router.refresh() will be called by realtime event handler
      } else {
        alert(result.error || "Failed to confirm deposit");
      }
    });
  };

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
        <div className="mb-6">
          <h2 className={MODAL_STYLES.title}>Deposit Details</h2>
          
          {/* User */}
          <div className="flex items-center gap-3 mt-4">
            <UserAvatar
              user={{
                id: deposit.userId,
                email: deposit.userEmail,
                name: deposit.userName,
                displayName: deposit.userDisplayName,
                avatarUrl: deposit.userAvatarUrl,
                avatarColor: deposit.userAvatarColor,
              }}
              size={24}
            />
            <div className="flex flex-col">
              <p className="text-[14px] text-white-900">
                {getUserDisplayName({
                  email: deposit.userEmail,
                  name: deposit.userName,
                  displayName: deposit.userDisplayName,
                })}
              </p>
              <p className="text-[12px] text-white-600">
                {deposit.userEmail}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">

          {/* Amount */}
          <div className="flex items-center justify-between w-full">
            <p className="text-[14px] text-white-600">Amount</p>
            <p className={`text-[14px] ${
              deposit.status === "paid" ? "text-[#A5EACF]" : "text-white-900"
            }`}>
              {amount.toFixed(2)} USDT
            </p>
          </div>

          {/* Payment Currency (if different from USDT) */}
          {deposit.payCurrency && 
           !deposit.payCurrency.toUpperCase().includes("USDT") && 
           deposit.payAmount && (
            <>
              <div className="flex items-center justify-between w-full">
                <p className="text-[14px] text-white-600">Payment Currency</p>
                <p className="text-[14px] text-white-900">
                  {deposit.payCurrency.toUpperCase()}
                </p>
              </div>
              <div className="flex items-center justify-between w-full">
                <p className="text-[14px] text-white-600">Payment Amount</p>
                <p className="text-[14px] text-white-900">
                  {deposit.payAmount.toFixed(8)} {deposit.payCurrency.toUpperCase()}
                </p>
              </div>
            </>
          )}

          {/* Status */}
          <div className="flex items-center justify-between w-full">
            <p className="text-[14px] text-white-600">Status</p>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-small ${statusConfig.bg} ${statusConfig.text}`}>
              {statusText}
            </span>
          </div>

          {/* Payment Address */}
          {deposit.address && (
            <div className="flex items-center justify-between w-full">
              <p className="text-[14px] text-white-600">Payment address</p>
              <code
                className="text-[14px] text-white-900 font-mono break-all text-right max-w-[60%]"
                title={deposit.address}
              >
                {deposit.address}
              </code>
            </div>
          )}

          {/* Transaction hash */}
          {deposit.txHash && (
            <div className="flex items-center justify-between w-full">
              <p className="text-[14px] text-white-600">Transaction hash</p>
              <code
                className="text-[14px] text-white-900 font-mono break-all text-right max-w-[60%]"
                title={deposit.txHash}
              >
                {deposit.txHash}
              </code>
            </div>
          )}

          {/* Created at */}
          <div className="flex items-center justify-between w-full">
            <p className="text-[14px] text-white-600">Created at</p>
            <p className="text-[14px] text-white-900">{formatDate(deposit.createdAt)}</p>
          </div>

          {/* Confirmed at */}
          {deposit.confirmedAt && (
            <div className="flex items-center justify-between w-full">
              <p className="text-[14px] text-white-600">Confirmed at</p>
              <p className="text-[14px] text-white-900">{formatDate(deposit.confirmedAt)}</p>
            </div>
          )}
        </div>

        {/* Separator - скрыт для paid статуса */}
        {deposit.status !== "paid" && (
          <div className="border-t border-onsurface-950 mt-8"></div>
        )}

        {/* Actions */}
        <div className="mt-8 space-y-3">
          {deposit.status === "paying" && (
            <Button
              variant="primary"
              onClick={handleConfirm}
              disabled={isPending}
              className="w-full"
            >
              {isPending ? "Confirming..." : "Confirm (Test)"}
            </Button>
          )}

          {explorerInfo && deposit.status === "paid" && (
            <Button
              variant="primary"
              onClick={() => window.open(explorerInfo.url, "_blank", "noopener,noreferrer")}
              className="w-full"
            >
              {explorerInfo.label}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

