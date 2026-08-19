import { WithdrawalStatus, TransactionType } from "@prisma/client";

// OxaPay deposit statuses
type OxaPayDepositStatus = "paying" | "paid" | "expired" | "failed" | "cancelled";

export interface CreateDepositResult {
  depositId: string;
  payAddress: string;
  payAmount: number;
  payCurrency: string;
}

export interface WalletSummary {
  balance: number;
  deposits: Array<{
    id: string;
    amountUsdt: number;
    amountCrypto: number | null;
    status: OxaPayDepositStatus; // OxaPay status
    createdAt: Date;
  }>;
  withdrawals: Array<{
    id: string;
    amount: number;
    status: WithdrawalStatus;
    createdAt: Date;
  }>;
}

