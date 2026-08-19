/**
 * OxaPay Provider Client
 * Implements DepositProviderClient and WithdrawalProviderClient interfaces
 * Wraps OxaPay integration logic
 */

import type {
  DepositProviderClient,
  WithdrawalProviderClient,
  ProviderInvoiceStatus,
  ProviderPayoutStatus,
} from '../payment-providers';
import {
  createDepositInvoice as oxapayCreateDepositInvoice,
  getPaymentStatus,
  type OxaPayStatus,
} from '../oxapay';

/**
 * Map OxaPay payment status to provider invoice status (return OxaPay status directly)
 */
function mapOxaPayToInvoiceStatus(status: string): ProviderInvoiceStatus {
  const normalizedStatus = status.toLowerCase();
  
  // Return OxaPay status directly, mapping to our ProviderInvoiceStatus format
  if (normalizedStatus === "paid" || normalizedStatus === "completed" || normalizedStatus === "finished") {
    return 'CONFIRMED'; // For internal use, but we'll store OxaPay status in DB
  } else if (normalizedStatus === "expired") {
    return 'EXPIRED';
  } else if (normalizedStatus === "failed" || normalizedStatus === "cancelled" || normalizedStatus === "canceled") {
    return 'FAILED';
  } else if (normalizedStatus === "processing" || normalizedStatus === "confirming") {
    return 'PROCESSING';
  } else {
    return 'PENDING'; // paying, etc.
  }
}

/**
 * Map OxaPay payout status to provider payout status
 * TODO: Update based on actual OxaPay payout API response
 */
function mapOxaPayToPayoutStatus(
  status: string
): ProviderPayoutStatus {
  const normalizedStatus = status.toLowerCase().trim();
  
  switch (normalizedStatus) {
    case 'pending':
    case 'creating':
      return 'PENDING';
    case 'processing':
    case 'confirming':
      return 'PROCESSING';
    case 'completed':
    case 'finished':
    case 'paid':
    case 'confirmed':
      return 'CONFIRMED';
    case 'failed':
    case 'expired':
    case 'rejected':
      return 'FAILED';
    default:
      console.warn(`[OxaPay] Unknown payout status: ${status}, defaulting to PENDING`);
      return 'PENDING';
  }
}

/**
 * OxaPay Deposit Provider Client
 */
export const oxapayDepositClient: DepositProviderClient = {
  async createInvoice(params) {
    // Get callback URL
    const callbackUrl =
      process.env.OXAPAY_CALLBACK_URL ||
      `${process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/oxapay/webhook`;

    // Call OxaPay createDepositInvoice with White Label API
    // White Label returns address, QR code, and other details for embedded UI
    const invoice = await oxapayCreateDepositInvoice({
      amountUsdt: parseFloat(params.amountUsdt),
      orderId: params.orderId,
      callbackUrl,
      currency: params.currency,
      network: params.network,
      fromAmount: params.fromAmount,
      useWhiteLabel: true, // Use White Label API for embedded payment UI
    });

    return {
      providerInvoiceId: invoice.invoiceId,
      payAddress: invoice.payAddress,
      payCurrency: invoice.payCurrency,
      expiresAt: invoice.expiresAt,
      qrCode: invoice.qrCode,
      network: invoice.network,
      rate: invoice.rate,
    };
  },

  async syncInvoiceStatus(providerInvoiceId) {
    // Call OxaPay getPaymentStatus
    const paymentData = await getPaymentStatus(providerInvoiceId);

    // Extract status from response structure: { data: { status, txs: [...] }, ... }
    let paymentStatus = paymentData.data?.status || 'paying';
    let txHash = paymentData.data?.txs?.[0]?.tx_hash || undefined;

    // Check transactions array for more detailed status
    // If there are confirmed transactions, the payment should be considered paid
    const txs = paymentData.data?.txs || [];
    const hasConfirmedTx = txs.some((tx: any) => 
      tx.status?.toLowerCase() === 'confirmed' || 
      tx.status?.toLowerCase() === 'paid'
    );
    
    // If main status is "paid" or there are confirmed transactions, consider it paid
    if (paymentStatus.toLowerCase() === 'paid' || hasConfirmedTx) {
      paymentStatus = 'paid';
      // Use the first confirmed transaction hash if available
      if (!txHash && txs.length > 0) {
        const confirmedTx = txs.find((tx: any) => 
          tx.status?.toLowerCase() === 'confirmed' || 
          tx.status?.toLowerCase() === 'paid'
        );
        if (confirmedTx?.tx_hash) {
          txHash = confirmedTx.tx_hash;
        }
      }
    }

    // Normalize OxaPay status to one of: paying, paid, expired, failed, cancelled
    const normalizedStatus = paymentStatus.toLowerCase();
    let oxaPayStatus: string;
    if (normalizedStatus === "paid" || normalizedStatus === "completed" || normalizedStatus === "finished") {
      oxaPayStatus = "paid";
    } else if (normalizedStatus === "expired") {
      oxaPayStatus = "expired";
    } else if (normalizedStatus === "cancelled" || normalizedStatus === "canceled") {
      oxaPayStatus = "cancelled";
    } else if (normalizedStatus === "failed") {
      oxaPayStatus = "failed";
    } else {
      oxaPayStatus = "paying"; // paying, processing, confirming, etc.
    }

    // Map to ProviderInvoiceStatus for internal use (but we store OxaPay status in DB)
    const status = mapOxaPayToInvoiceStatus(oxaPayStatus);

    return {
      status,
      txHash,
      rawStatus: oxaPayStatus, // Return normalized OxaPay status
      rawPaymentData: paymentData, // Return full payment data for confirmations extraction
    };
  },
};

/**
 * OxaPay Withdrawal Provider Client
 */
export const oxapayWithdrawalClient: WithdrawalProviderClient = {
  async createPayout(params) {
    // Import payout functions
    const { createOxaPayPayout } = await import('../oxapay-payout');
    
    // Map currency and network to OxaPay currency format
    // OxaPay uses currency symbol (e.g., "USDT") and network separately
    // For USDT: currency="USDT", network="TRC20" or "ERC20" or "POLYGON"
    let currency = "USDT";
    
    // Map network to OxaPay payout format
    const { mapNetworkToOxaPay } = await import("../network-types");
    const network = mapNetworkToOxaPay(params.network as any);

    // Get callback URL for payout status updates
    const callbackUrl =
      process.env.OXAPAY_PAYOUT_CALLBACK_URL ||
      process.env.OXAPAY_CALLBACK_URL ||
      `${process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/oxapay/webhook`;

    // Call OxaPay createPayout
    const payoutResponse = await createOxaPayPayout({
      amount: params.amountUsdt,
      currency,
      network,
      address: params.toAddress,
      orderId: params.withdrawalId,
      callbackUrl,
    });

    return {
      providerPayoutId: payoutResponse.payoutId,
      status: mapOxaPayToPayoutStatus(payoutResponse.status),
      rawStatus: payoutResponse.status,
    };
  },

  async syncPayoutStatus(providerPayoutId) {
    // Import payout functions
    const { getOxaPayPayoutStatus } = await import('../oxapay-payout');
    
    // Call OxaPay getPayoutStatus
    const payoutStatus = await getOxaPayPayoutStatus(providerPayoutId);

    return {
      status: mapOxaPayToPayoutStatus(payoutStatus.status),
      txHash: payoutStatus.txHash,
      errorMessage: payoutStatus.errorMessage,
      rawStatus: payoutStatus.status,
    };
  },
};

