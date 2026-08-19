import { StrategyType, StrategyStatus, ProfitType } from "@prisma/client";

export type { StrategyType, StrategyStatus, ProfitType };

export interface StrategyConfigData {
  id?: string; // ID from database (for creating strategies)
  type: StrategyType;
  name: string;
  description?: string | null;
  accentColor?: string | null; // Hex color for top border (e.g., "#781FF5")
  minAmount: number;
  maxAmount: number;
  minDays: number;
  maxDays: number;
  baseMinPercent: number;
  baseMaxPercent: number;
  allowMultiplier: boolean;
}

export interface CreateStrategyInput {
  configId: string; // ID of StrategyConfig (instead of type)
  amount: number;
  durationDays: number;
}

export interface StrategyCalculationResult {
  minPercent: number;
  maxPercent: number;
  estimatedTotalProfit: number;
  principalReturnDate: Date;
}

export interface DailyProfitResult {
  strategyId: string;
  userId: string;
  percent: number;
  amount: number;
  type: ProfitType;
  profitDate?: Date; // Optional: calculated time for the profit (for testing with minutes)
}

export interface MultiplierBonus {
  baseBonusPercent: number;
  diversityScore: number; // 0..1
  effectiveBonusPercent: number; // baseBonusPercent * diversityScore
  bonusAmount: number;
  activeStrategiesCount: number;
  largestShare: number; // 0..1
}

export interface TerminalMetrics {
  total: number;
  tvl: number;
  available: number;
  earned: number;
  bonusEarned: number; // Bonus from multipliers
  withdrawn: number;
  referralsCount: number; // Number of active referrals
}

