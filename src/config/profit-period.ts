import { isTestMode } from "@/shared/lib/env";

/**
 * Profit Period Configuration
 * 
 * Defines the length of a profit period in minutes.
 * - Production: 1440 minutes = 24 hours (1 day)
 * - Development/Testing: 1 minute (for faster testing)
 * 
 * Automatically determined by environment:
 * - Test mode (development/preview): 1 minute
 * - Production: 1440 minutes (24 hours)
 * 
 * Can be overridden by PROFIT_PERIOD_MINUTES env variable.
 */
export const PROFIT_PERIOD_MINUTES = Number(
  process.env.PROFIT_PERIOD_MINUTES ?? (isTestMode() ? "1" : "1440")
);

/**
 * Get the start and end bounds of the profit period containing the given date
 * 
 * @param now - The date to find the period for
 * @returns Object with periodStart (inclusive) and periodEnd (exclusive)
 * 
 * @example
 * // If PROFIT_PERIOD_MINUTES = 1440 (1 day) and now = 2024-01-15 14:30:00
 * // Returns: { periodStart: 2024-01-15 00:00:00, periodEnd: 2024-01-16 00:00:00 }
 * 
 * @example
 * // If PROFIT_PERIOD_MINUTES = 1 (1 minute) and now = 2024-01-15 14:30:45
 * // Returns: { periodStart: 2024-01-15 14:30:00, periodEnd: 2024-01-15 14:31:00 }
 */
export function getProfitPeriodBounds(now: Date): {
  periodStart: Date;
  periodEnd: Date;
} {
  const periodMs = PROFIT_PERIOD_MINUTES * 60 * 1000;
  const ts = now.getTime();
  
  // Calculate the start of the period containing 'now'
  const periodStart = new Date(Math.floor(ts / periodMs) * periodMs);
  
  // Calculate the end of the period (exclusive)
  const periodEnd = new Date(periodStart.getTime() + periodMs);
  
  return { periodStart, periodEnd };
}

