/**
 * OxaPay Configuration
 * Handles configuration for OxaPay payment provider
 * 
 * OxaPay uses two separate API keys:
 * - Merchant API Key: for accepting payments (deposits)
 * - Payout API Key: for making payouts (withdrawals)
 */

export interface OxaPayConfig {
  merchantApiKey: string;  // Merchant API Key for deposits
  payoutApiKey?: string;   // Payout API Key for withdrawals
  baseUrl: string;
  enabled: boolean;
}

export interface OxaPayPayoutConfig {
  payoutApiKey: string;
  baseUrl: string;
  enabled: boolean;
}

/**
 * Get OxaPay configuration for deposits (Merchant API)
 */
export function getOxaPayConfig(): OxaPayConfig {
  const merchantApiKey = process.env.OXAPAY_MERCHANT_API_KEY || process.env.OXAPAY_API_KEY;
  const payoutApiKey = process.env.OXAPAY_PAYOUT_API_KEY;
  const baseUrl = process.env.OXAPAY_BASE_URL || "https://api.oxapay.com";

  if (!merchantApiKey) {
    console.warn("OXAPAY_MERCHANT_API_KEY is not set. OxaPay deposit functionality will not work.");
  }

  return {
    merchantApiKey: merchantApiKey || "",
    payoutApiKey: payoutApiKey,
    baseUrl,
    enabled: !!merchantApiKey,
  };
}

/**
 * Get OxaPay configuration for payouts (Payout API)
 */
export function getOxaPayPayoutConfig(): OxaPayPayoutConfig {
  const payoutApiKey = process.env.OXAPAY_PAYOUT_API_KEY;
  const baseUrl = process.env.OXAPAY_BASE_URL || "https://api.oxapay.com";

  if (!payoutApiKey) {
    console.warn("OXAPAY_PAYOUT_API_KEY is not set. OxaPay payout functionality will not work.");
  }

  return {
    payoutApiKey: payoutApiKey || "",
    baseUrl,
    enabled: !!payoutApiKey,
  };
}

export function isOxaPayEnabled(): boolean {
  const config = getOxaPayConfig();
  return config.enabled;
}

export function isOxaPayPayoutEnabled(): boolean {
  const config = getOxaPayPayoutConfig();
  return config.enabled;
}

