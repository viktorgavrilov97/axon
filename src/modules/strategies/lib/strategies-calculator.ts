import { StrategyConfigData, StrategyCalculationResult } from "./strategies-types";
import { isTestMode } from "@/shared/lib/env";

/**
 * Calculate percent boundaries based on duration only
 * 
 * Процент зависит ТОЛЬКО от количества дней инвестирования:
 * - Минимум дней = минимальный процент (baseMinPercent)
 * - Максимум дней = максимальный процент (baseMaxPercent)
 * - Промежуточные дни = линейная интерполяция
 * 
 * Формула:
 * durationFactor = (days - minDays) / (maxDays - minDays)
 * minPercent = baseMinPercent + (baseMaxPercent - baseMinPercent) * durationFactor
 * maxPercent = minPercent + 0.08
 */
export function calculatePercentBoundaries(
  config: StrategyConfigData,
  amount: number,
  durationDays: number
): { minPercent: number; maxPercent: number } {
  // Validate inputs
  if (amount < config.minAmount || amount > config.maxAmount) {
    throw new Error(`Amount must be between ${config.minAmount} and ${config.maxAmount}`);
  }

  if (durationDays < config.minDays || durationDays > config.maxDays) {
    throw new Error(`Duration must be between ${config.minDays} and ${config.maxDays} days`);
  }

  // Calculate duration factor (0.0 to 1.0)
  // 0.0 = minDays, 1.0 = maxDays
  const durationFactor = (durationDays - config.minDays) / (config.maxDays - config.minDays);

  // Calculate minPercent based ONLY on duration
  // Linear interpolation between baseMinPercent and baseMaxPercent
  const baseRange = config.baseMaxPercent - config.baseMinPercent;
  const minPercent = config.baseMinPercent + baseRange * durationFactor;

  // Calculate maxPercent (minPercent + 0.08)
  const maxPercent = minPercent + 0.08;

  // Round to 2 decimals
  return {
    minPercent: Math.round(minPercent * 100) / 100,
    maxPercent: Math.round(maxPercent * 100) / 100,
  };
}

/**
 * Calculate estimated total profit based on average percent
 */
export function calculateEstimatedProfit(
  amount: number,
  durationDays: number,
  minPercent: number,
  maxPercent: number
): number {
  const avgPercent = (minPercent + maxPercent) / 2;
  const dailyProfit = amount * (avgPercent / 100);
  return dailyProfit * durationDays;
}

/**
 * Calculate full strategy details
 */
export function calculateStrategyDetails(
  config: StrategyConfigData,
  amount: number,
  durationDays: number
): StrategyCalculationResult {
  const { minPercent, maxPercent } = calculatePercentBoundaries(config, amount, durationDays);
  const estimatedTotalProfit = calculateEstimatedProfit(amount, durationDays, minPercent, maxPercent);
  
  const startDate = new Date();
  const endDate = new Date(startDate);
  if (isTestMode()) {
    endDate.setMinutes(endDate.getMinutes() + durationDays);
  } else {
    endDate.setDate(endDate.getDate() + durationDays);
  }

  return {
    minPercent,
    maxPercent,
    estimatedTotalProfit,
    principalReturnDate: endDate,
  };
}

