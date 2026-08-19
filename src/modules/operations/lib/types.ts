import { WithdrawalStatus } from "@prisma/client";

// OxaPay deposit statuses
type OxaPayDepositStatus = "paying" | "paid" | "expired" | "failed" | "cancelled";

export interface Operation {
  id: string;
  type: "deposit" | "withdrawal" | "strategy_profit" | "strategy_bonus" | "strategy_investment" | "capital_return" | "referral_payout";
  amount: number;
  status: OxaPayDepositStatus | WithdrawalStatus | "completed"; // OxaPay status for deposits, "completed" for strategy transactions
  createdAt: Date;
  confirmedAt?: Date | null;
  expiresAt?: Date; // Время истечения для депозитов
  // Deposit fields
  amountUsdt?: number;
  amountCrypto?: number | null;
  payAmount?: number | null;
  payCurrency?: string;
  address?: string | null;
  txHash?: string | null;
  confirmations?: number | null;
  requiredConfirmations?: number | null;
  txStatus?: string | null;
  // Withdrawal fields
  toAddress?: string;
  processedAt?: Date | null;
  rejectionReason?: string | null;
  // Strategy transaction fields
  strategyId?: string;
  profitId?: string;
  profitType?: "PROFIT_DAY" | "BONUS_MULTIPLIER";
  description?: string; // Description for strategy transactions
  strategyName?: string; // Name of the strategy for investment/return
  effectiveBonusPercent?: number; // Effective bonus percent for yield multiplayer bonus
}

