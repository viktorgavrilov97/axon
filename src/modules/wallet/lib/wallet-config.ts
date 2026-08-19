/**
 * Wallet Configuration
 * Provider selection and default settings
 */

import type { DepositProviderName, WithdrawalProviderName } from './payment-providers';

/**
 * Get deposit provider from environment variable
 * Defaults to OXAPAY if not set or invalid
 */
function getDepositProviderFromEnv(): DepositProviderName {
  // Only OXAPAY is supported
  return 'OXAPAY';
}

/**
 * Get withdrawal provider from environment variable
 * Defaults to OXAPAY if not set or invalid
 */
function getWithdrawalProviderFromEnv(): WithdrawalProviderName {
  const value = process.env.WITHDRAWAL_PROVIDER?.toUpperCase()?.trim();
  if (value === 'INTERNAL') {
    return 'INTERNAL';
  }
  // Default to OXAPAY
  return 'OXAPAY';
}

/**
 * Default deposit provider
 * Set via DEPOSIT_PROVIDER environment variable
 */
export const DEFAULT_DEPOSIT_PROVIDER: DepositProviderName = getDepositProviderFromEnv();

/**
 * Default withdrawal provider
 * Set via WITHDRAWAL_PROVIDER environment variable
 */
export const DEFAULT_WITHDRAWAL_PROVIDER: WithdrawalProviderName = getWithdrawalProviderFromEnv();

/**
 * Validate provider configuration
 * Currently no validation needed (only OXAPAY is supported)
 */
export function validateProviderConfig(): void {
  // No validation needed - only OXAPAY is supported
}

