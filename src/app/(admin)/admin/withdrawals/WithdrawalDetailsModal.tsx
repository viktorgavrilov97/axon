"use client";

import { WithdrawalStatus, WithdrawalProvider } from "@prisma/client";
import { MODAL_STYLES } from "@/shared/ui/modal/styles";
import { NETWORKS, type NetworkType } from "@/modules/wallet/lib/network-types";
import { getStatusText, getStatusColor } from "@/modules/operations/lib/status-utils";

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
  currency?: string | null;
}

interface WithdrawalDetailsModalProps {
  withdrawal: Withdrawal;
  onClose: () => void;
}

// Helper function to infer network from currency
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
const getBlockchainExplorerUrl = (withdrawal: Withdrawal): { url: string; label: string } | null => {
  if (!withdrawal.txHash) return null;

  const network = inferNetworkFromCurrency(withdrawal.currency);
  if (!network) return null;

  const txHash = withdrawal.txHash;

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

export function WithdrawalDetailsModal({ withdrawal, onClose }: WithdrawalDetailsModalProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };


  const explorerInfo = getBlockchainExplorerUrl(withdrawal);

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
          <h2 className={MODAL_STYLES.title}>Withdrawal</h2>
          <button
            onClick={onClose}
            className={MODAL_STYLES.closeButton}
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          {/* User Email */}
          <div className="flex items-center justify-between w-full">
            <p className="text-[14px] text-white-600">User</p>
            <p className="text-[14px] text-white-900">{withdrawal.userEmail}</p>
          </div>

          {/* Amount */}
          <div className="flex items-center justify-between w-full">
            <p className="text-[14px] text-white-600">Amount</p>
            <p className={`text-[14px] ${
              withdrawal.status === "COMPLETED" ? "text-[#A5EACF]" : "text-white-900"
            }`}>
              {withdrawal.amount.toFixed(2)} USDT
            </p>
          </div>

          {/* Network */}
          {(() => {
            const network = inferNetworkFromCurrency(withdrawal.currency);
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

          {/* Status */}
          <div className="flex items-center justify-between w-full">
            <p className="text-[14px] text-white-600">Status</p>
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
          </div>

          {/* Destination address */}
          <div className="flex items-center justify-between w-full">
            <p className="text-[14px] text-white-600">Destination address</p>
            <code
              className="text-[14px] text-white-900 font-mono break-all text-right max-w-[60%]"
              title={withdrawal.toAddress}
            >
              {withdrawal.toAddress}
            </code>
          </div>

          {/* Transaction hash */}
          {withdrawal.txHash && (
            <div className="flex items-center justify-between w-full">
              <p className="text-[14px] text-white-600">Transaction hash</p>
              <code
                className="text-[14px] text-white-900 font-mono break-all text-right max-w-[60%]"
                title={withdrawal.txHash}
              >
                {withdrawal.txHash}
              </code>
            </div>
          )}

          {/* Created at */}
          <div className="flex items-center justify-between w-full">
            <p className="text-[14px] text-white-600">Created at</p>
            <p className="text-[14px] text-white-900">{formatDate(withdrawal.createdAt)}</p>
          </div>

          {/* Processed at */}
          {withdrawal.processedAt && (
            <div className="flex items-center justify-between w-full">
              <p className="text-[14px] text-white-600">Processed at</p>
              <p className="text-[14px] text-white-900">{formatDate(withdrawal.processedAt)}</p>
            </div>
          )}

          {/* Provider Payout ID */}
          {withdrawal.providerPayoutId && (
            <div className="flex items-center justify-between w-full">
              <p className="text-[14px] text-white-600">Provider Payout ID</p>
              <p className="text-[14px] text-white-900 font-mono">{withdrawal.providerPayoutId}</p>
            </div>
          )}

          {/* Rejection reason */}
          {withdrawal.status === "REJECTED" && withdrawal.rejectionReason && (
            <div className="flex items-start justify-between w-full">
              <p className="text-[14px] text-white-600">Rejection reason</p>
              <p className="text-[14px] text-[#F2A8A8] text-right max-w-[60%]">{withdrawal.rejectionReason}</p>
            </div>
          )}
        </div>

        {/* Separator - скрыт для completed/rejected статусов */}
        {!(withdrawal.status === "COMPLETED" || withdrawal.status === "REJECTED") && (
          <div className="border-t border-onsurface-950 mt-8"></div>
        )}

        {/* Blockchain Explorer Button */}
        {explorerInfo && withdrawal.status === "COMPLETED" && (
          <button
            onClick={() => window.open(explorerInfo.url, "_blank", "noopener,noreferrer")}
            className="w-full py-2 mt-8 bg-onsurface-900 hover:bg-onsurface-800 text-white-900 rounded-full transition-colors"
          >
            {explorerInfo.label}
          </button>
        )}
      </div>
    </div>
  );
}

