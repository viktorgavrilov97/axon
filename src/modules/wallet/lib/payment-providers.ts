/**
 * Payment Provider Abstraction Layer
 * 
 * Defines interfaces for deposit and withdrawal providers (OxaPay)
 * Allows switching between providers via configuration without changing business logic.
 */

export type DepositProviderName = 'OXAPAY';
export type WithdrawalProviderName = 'OXAPAY' | 'INTERNAL';

/**
 * Provider status mapping
 * Internal statuses used across all providers
 */
export type ProviderInvoiceStatus = 'PENDING' | 'PROCESSING' | 'CONFIRMED' | 'FAILED' | 'EXPIRED';
export type ProviderPayoutStatus = 'PENDING' | 'PROCESSING' | 'CONFIRMED' | 'FAILED';

/**
 * Deposit Provider Interface
 * All deposit providers must implement this interface
 */
export interface DepositProviderClient {
  /**
   * Create a deposit invoice
   * @param params - Invoice creation parameters
   * @returns Invoice details including provider invoice ID and payment address
   */
  createInvoice(params: {
    userId: string;
    amountUsdt: string;
    currency: string; // e.g. "USDT", "BTC", "ETH"
    network: string;  // e.g. "TRC20" | "ERC20" | "POLYGON" | etc.
    orderId: string;  // internal Axon order id / deposit id reference
    fromAmount?: number; // Amount in source currency (for conversion)
  }): Promise<{
    providerInvoiceId: string;
    payAddress: string;
    payCurrency: string;
    expiresAt?: Date;
    qrCode?: string; // QR code URL for embedded payment UI
    network?: string; // Network name
    rate?: number; // Exchange rate
  }>;

  /**
   * Sync invoice status from provider
   * @param providerInvoiceId - Provider's invoice/payment ID
   * @returns Current status and transaction hash if available
   */
  syncInvoiceStatus(providerInvoiceId: string): Promise<{
    status: ProviderInvoiceStatus;
    txHash?: string;
    rawStatus?: string;
    rawPaymentData?: any;
  }>;
}

/**
 * Withdrawal Provider Interface
 * All withdrawal providers must implement this interface
 */
export interface WithdrawalProviderClient {
  /**
   * Create a payout request
   * @param params - Payout creation parameters
   * @returns Payout details including provider payout ID and initial status
   */
  createPayout(params: {
    withdrawalId: string;
    walletId: string;
    amountUsdt: string;
    currency: string; // "USDT"
    network: string;  // chain/network info
    toAddress: string;
  }): Promise<{
    providerPayoutId: string;
    status: ProviderPayoutStatus;
    rawStatus?: string;
  }>;

  /**
   * Sync payout status from provider
   * @param providerPayoutId - Provider's payout ID
   * @returns Current status, transaction hash, and error message if failed
   */
  syncPayoutStatus(providerPayoutId: string): Promise<{
    status: ProviderPayoutStatus;
    txHash?: string;
    errorMessage?: string;
    rawStatus?: string;
  }>;
}

/**
 * Provider Factory Functions
 * Returns the appropriate provider client based on provider name
 */

// Lazy imports to avoid circular dependencies
let oxapayDepositClient: DepositProviderClient | null = null;
let oxapayWithdrawalClient: WithdrawalProviderClient | null = null;

/**
 * Get deposit provider client
 * @param provider - Provider name
 * @returns Deposit provider client instance
 */
export function getDepositProviderClient(provider: DepositProviderName): DepositProviderClient {
  // Only OXAPAY is supported
  if (!oxapayDepositClient) {
    const { oxapayDepositClient: client } = require('./providers/oxapay-client');
    oxapayDepositClient = client;
  }
  if (!oxapayDepositClient) {
    throw new Error('Failed to load OxaPay deposit client');
  }
  return oxapayDepositClient;
}

/**
 * Get withdrawal provider client
 * @param provider - Provider name
 * @returns Withdrawal provider client instance
 */
export function getWithdrawalProviderClient(provider: WithdrawalProviderName): WithdrawalProviderClient {
  // For INTERNAL, we don't use external providers (should not be called)
  // For OXAPAY, return OxaPay client
  if (provider === 'INTERNAL') {
    // This should not be called for INTERNAL withdrawals
    throw new Error('INTERNAL withdrawals do not use external providers');
  }

  if (!oxapayWithdrawalClient) {
    const { oxapayWithdrawalClient: client } = require('./providers/oxapay-client');
    oxapayWithdrawalClient = client;
  }
  if (!oxapayWithdrawalClient) {
    throw new Error('Failed to load OxaPay withdrawal client');
  }
  return oxapayWithdrawalClient;
}

