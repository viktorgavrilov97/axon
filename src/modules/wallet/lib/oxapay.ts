import crypto from "crypto";
import { mapNetworkToOxaPay, mapNetworkToOxaPayCurrency } from "./network-types";

export type OxaPayStatus =
  | "paying"
  | "paid"
  | "expired"
  | "failed"
  | string;

import { getOxaPayConfig } from "./oxapay-config";

const CALLBACK_URL = process.env.OXAPAY_CALLBACK_URL || 
  `${process.env.AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/oxapay/webhook`;

// Cache for payment status (10 seconds) to avoid hammering OxaPay API
const paymentStatusCache = new Map<string, {
  status: OxaPayPayment;
  timestamp: number;
}>();

const PAYMENT_STATUS_CACHE_DURATION = 10 * 1000; // 10 seconds

/**
 * Parameters for creating a deposit invoice
 */
export interface CreateDepositInvoiceParams {
  amountUsdt: number; // Amount in USDT (target currency)
  orderId: string;
  callbackUrl: string;
  currency?: string; // Payment currency code (e.g., "BTC", "ETH", "USDT")
  network?: string;  // e.g., "TRC20", "ERC20", "BEP20", "SOLANA", "MATIC", "TON", "BITCOIN"
  useWhiteLabel?: boolean; // Use White Label API instead of Invoice
  fromAmount?: number; // Amount in source currency (for conversion)
}

/**
 * Create a White Label deposit via OxaPay
 * Returns payment address, QR code, and other details for embedded UI
 */
export async function createWhiteLabelDeposit(
  params: CreateDepositInvoiceParams
): Promise<{
  invoiceId: string;
  payAddress: string;
  payAmount: number;
  payCurrency: string;
  expiresAt: Date;
  qrCode?: string;
  network?: string;
  rate?: number;
}> {
  const config = getOxaPayConfig();
  
  if (!config.merchantApiKey) {
    throw new Error("OXAPAY_MERCHANT_API_KEY is not configured. Please set OXAPAY_MERCHANT_API_KEY in your .env.local file.");
  }

  // Validate: only whole numbers for USDT, allow decimals for other currencies
  // For non-USDT currencies, amountUsdt is the converted amount which can be fractional
  const paymentCurrency = params.currency || "USDT";
  const isUsdt = paymentCurrency.toUpperCase() === "USDT";
  if (isUsdt && !Number.isInteger(params.amountUsdt)) {
    throw new Error("Amount must be a whole number");
  }
  
  // For non-USDT currencies, round to 2 decimal places to avoid precision issues
  if (!isUsdt && params.amountUsdt) {
    params.amountUsdt = Math.round(params.amountUsdt * 100) / 100;
  }
  let network = params.network || "TRC20";
  
  // If currency is not USDT, we need to use conversion
  // OxaPay White Label API supports pay_currency for different cryptocurrencies
  const payCurrency = paymentCurrency.toUpperCase();
  
  // Map network to OxaPay format for White Label API
  // For non-USDT currencies, network might be different (e.g., BTC -> BITCOIN)
  let networkValue: string;
  const currencyUpper = paymentCurrency.toUpperCase();
  
  // Map currency to default network
  // Based on official OxaPay supported currencies
  const currencyNetworkMap: Record<string, string> = {
    BTC: "BITCOIN",
    ETH: "ERC20",
    BNB: "BEP20",
    SOL: "SOLANA",
    TRX: "TRC20",
    MATIC: "POLYGON",
    TON: "TON",
    LTC: "LITECOIN",
    DOGE: "DOGECOIN",
    XRP: "XRP",
    BCH: "BITCOIN_CASH",
    SHIB: "ERC20",
    DAI: "ERC20",
    XMR: "MONERO",
    DOGS: "TON",
    USDC: "ERC20", // Default for USDC
  };
  
  if (currencyNetworkMap[currencyUpper]) {
    networkValue = currencyNetworkMap[currencyUpper];
  } else if (currencyUpper === "USDT") {
    // For USDT, use the specified network
    networkValue = mapNetworkToOxaPay(network as any);
  } else {
    // Default fallback
    networkValue = mapNetworkToOxaPay(network as any);
  }

  // Request body for OxaPay White Label API
  // White Label API uses pay_currency and network directly
  // For conversion: currency is target (USDT), pay_currency is source (BTC, ETH, etc.)
  const body: Record<string, any> = {
    amount: params.amountUsdt, // Target amount in USDT
    currency: "USD", // Base currency (always USD for conversion)
    pay_currency: payCurrency, // Payment currency (BTC, ETH, USDT, etc.)
    network: networkValue,
    callback_url: params.callbackUrl,
    order_id: params.orderId,
    description: `Deposit ${params.amountUsdt} USDT (${params.fromAmount || params.amountUsdt} ${payCurrency})`,
    lifetime: 1440, // 24 hours in minutes
  };

  console.log("[OxaPay] Creating White Label deposit:", {
    amount: params.amountUsdt,
    currency: "USD",
    pay_currency: payCurrency,
    network: networkValue,
    networkParam: params.network, // Original network parameter
    fromAmount: params.fromAmount,
    orderId: params.orderId,
  });

  const response = await fetch(`${config.baseUrl}/v1/payment/white-label`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "merchant_api_key": config.merchantApiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Failed to create white label deposit: ${response.status}`;
    
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.message || errorMessage;
      
      if (response.status === 401) {
        errorMessage = "Invalid OxaPay Merchant API Key. Please check your OXAPAY_MERCHANT_API_KEY in .env.local file.";
      } else if (response.status === 400) {
        errorMessage = errorData.message || `Invalid request: ${errorText}`;
      }
    } catch (parseError) {
      errorMessage = `${errorMessage} ${errorText}`;
    }
    
    console.error("[OxaPay] createWhiteLabelDeposit error:", {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
    });
    
    throw new Error(errorMessage);
  }

  const data = await response.json();

  if (!data.data) {
    console.error("[OxaPay] createWhiteLabelDeposit response (missing data):", JSON.stringify(data, null, 2));
    throw new Error(`OxaPay did not return data object. Response: ${JSON.stringify(data)}`);
  }

  if (!data.data.track_id) {
    console.error("[OxaPay] createWhiteLabelDeposit response (missing track_id):", JSON.stringify(data, null, 2));
    throw new Error(`OxaPay did not return track_id. Response: ${JSON.stringify(data)}`);
  }

  const invoiceId = String(data.data.track_id);
  const payAddress = data.data.address || "";
  // pay_amount from OxaPay is in source currency (DOGE, BTC, etc.), not USDT
  // For non-USDT currencies, use pay_amount if available, otherwise use fromAmount
  const payAmount = data.data.pay_amount 
    ? parseFloat(String(data.data.pay_amount))
    : (params.fromAmount || params.amountUsdt);
  const qrCode = data.data.qr_code || data.data.qrCode; // Try both field names
  const networkName = data.data.network;
  const rate = data.data.rate;
  
  console.log("[OxaPay] White Label response data:", {
    track_id: invoiceId,
    address: payAddress,
    pay_amount: payAmount,
    qr_code: qrCode,
    qr_code_exists: !!qrCode,
    network: networkName,
    allFields: Object.keys(data.data),
  });

  // Calculate expiration from expired_at (Unix timestamp)
  let expiresAt: Date;
  if (data.data.expired_at) {
    expiresAt = new Date(data.data.expired_at * 1000);
  } else {
    expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
  }

  // For non-USDT currencies, payCurrency should be the original currency (DOGE, BTC, etc.)
  // For USDT, use the formatted currency with network
  let payCurrencyFormatted: string;
  if (paymentCurrency.toUpperCase() === "USDT") {
    payCurrencyFormatted = mapNetworkToOxaPayCurrency(network as any);
  } else {
    // For non-USDT currencies, return the currency code as-is (DOGE, BTC, etc.)
    payCurrencyFormatted = paymentCurrency.toUpperCase();
  }

  console.log("[OxaPay] ✅ White Label deposit created:", {
    invoiceId,
    payAddress,
    payAmount,
    payCurrency: payCurrencyFormatted,
    network: networkName,
    qrCode: qrCode ? "provided" : "not provided",
    expiresAt,
  });

  return {
    invoiceId,
    payAddress,
    payAmount,
    payCurrency: payCurrencyFormatted,
    expiresAt,
    qrCode,
    network: networkName,
    rate,
  };
}

/**
 * Create a deposit invoice via OxaPay
 * Uses OxaPay Merchant API to generate invoice
 */
export async function createDepositInvoice(
  params: CreateDepositInvoiceParams
): Promise<{
  invoiceId: string;
  payAddress: string;
  payAmount: number;
  payCurrency: string;
  expiresAt: Date;
  invoiceUrl?: string;
  qrCode?: string;
  network?: string;
  rate?: number;
}> {
  const config = getOxaPayConfig();
  
  if (!config.merchantApiKey) {
    throw new Error("OXAPAY_MERCHANT_API_KEY is not configured. Please set OXAPAY_MERCHANT_API_KEY in your .env.local file.");
  }

  // Log API key status (without exposing the actual key)
  console.log("[OxaPay] Config check:", {
    hasApiKey: !!config.merchantApiKey,
    apiKeyLength: config.merchantApiKey.length,
    apiKeyPrefix: config.merchantApiKey.substring(0, 8) + "...",
    baseUrl: config.baseUrl,
  });

  // Validate: only whole numbers for USDT, allow decimals for other currencies
  // For non-USDT currencies, amountUsdt is the converted amount which can be fractional
  let currency = params.currency || "USDT";
  const isUsdt = currency.toUpperCase() === "USDT";
  if (isUsdt && !Number.isInteger(params.amountUsdt)) {
    throw new Error("Amount must be a whole number");
  }
  
  // For non-USDT currencies, round to 2 decimal places to avoid precision issues
  if (!isUsdt && params.amountUsdt) {
    params.amountUsdt = Math.round(params.amountUsdt * 100) / 100;
  }

  // Use White Label API if requested (for embedded payment UI)
  // White Label returns address and QR code for manual payment
  if (params.useWhiteLabel) {
    return await createWhiteLabelDeposit(params);
  }

  // According to OxaPay docs, currency field should be just the currency symbol
  // Based on error "currency field format is invalid", the issue might be with to_currency format
  // Let's check: according to docs, to_currency is for conversion, format should be currency symbol
  let network = params.network || "POLYGON";
  
  // According to OxaPay documentation:
  // - currency: base currency symbol (USD, USDT, etc.)
  // - to_currency: target currency for conversion (currency symbol only, not network-specific)
  // 
  // The error suggests that to_currency format might be wrong
  // Let's try: use "USD" as base, and "USDT" as to_currency (without network specification)
  // The network might be selected by user on payment page, not in API request
  
  const currencyValue = "USD";
  const toCurrencyValue = "USDT"; // Just "USDT", network will be selected by user
  
  // Request body for OxaPay Merchant API
  const body: Record<string, any> = {
    amount: params.amountUsdt,
    currency: currencyValue, // "USD" as base
    to_currency: toCurrencyValue, // "USDT" as target (user selects network on payment page)
    callback_url: params.callbackUrl,
    order_id: params.orderId,
    description: `Deposit ${params.amountUsdt} USDT`,
    lifetime: 1440, // 24 hours in minutes (default 60, max 2880)
  };
  
  // Note: Network selection might be handled on OxaPay payment page
  // User can choose which USDT network to pay with (TRC20, ERC20, Polygon, etc.)

  console.log("[OxaPay] Creating invoice:", {
    amount: params.amountUsdt,
    currency: currencyValue,
    to_currency: toCurrencyValue,
    network,
    orderId: params.orderId,
  });

  const response = await fetch(`${config.baseUrl}/v1/payment/invoice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "merchant_api_key": config.merchantApiKey,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Failed to create invoice: ${response.status}`;
    
    try {
      const errorData = JSON.parse(errorText);
      errorMessage = errorData.message || errorMessage;
      
      // Provide helpful error messages
      if (response.status === 401) {
        errorMessage = "Invalid OxaPay Merchant API Key. Please check your OXAPAY_MERCHANT_API_KEY in .env.local file. Make sure the key is correct and has no extra spaces.";
      } else if (response.status === 400) {
        errorMessage = errorData.message || `Invalid request: ${errorText}`;
      } else if (errorData.code === "AMOUNT_MINIMAL_ERROR" || errorData.error === "min_amount") {
        errorMessage = `AMOUNT_MINIMAL_ERROR: ${errorData.message || "Amount is less than minimum"}`;
      }
    } catch (parseError) {
      // If not JSON, use raw text
      errorMessage = `${errorMessage} ${errorText}`;
    }
    
    console.error("[OxaPay] createInvoice error:", {
      status: response.status,
      statusText: response.statusText,
      error: errorText,
      apiKeyPrefix: config.merchantApiKey.substring(0, 8) + "...",
      apiKeyLength: config.merchantApiKey.length,
    });
    
    throw new Error(errorMessage);
  }

  const data = await response.json();

  // Validate response structure: { data: { track_id, payment_url, expired_at }, message, status, error }
  if (!data.data) {
    console.error("[OxaPay] createInvoice response (missing data):", JSON.stringify(data, null, 2));
    throw new Error(`OxaPay did not return data object. Response: ${JSON.stringify(data)}`);
  }

  if (!data.data.track_id) {
    console.error("[OxaPay] createInvoice response (missing track_id):", JSON.stringify(data, null, 2));
    throw new Error(`OxaPay did not return track_id. Response: ${JSON.stringify(data)}`);
  }

  const invoiceId = String(data.data.track_id);
  const invoiceUrl = data.data.payment_url;
  const payAmount = parseFloat(String(params.amountUsdt)); // Amount is what we requested
  const payAddress = ""; // OxaPay doesn't return address in invoice response, it's in payment_url

  // Calculate expiration from expired_at (Unix timestamp)
  let expiresAt: Date;
  if (data.data.expired_at) {
    expiresAt = new Date(data.data.expired_at * 1000); // Convert Unix timestamp to Date
  } else {
    expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
  }

  // For non-USDT currencies, payCurrency should be the original currency (DOGE, BTC, etc.)
  // For USDT, use the formatted currency with network
  // Use existing 'currency' variable defined above (line 299)
  let payCurrencyFormatted: string;
  if (currency.toUpperCase() === "USDT") {
    payCurrencyFormatted = mapNetworkToOxaPayCurrency(network as any);
  } else {
    // For non-USDT currencies, return the currency code as-is (DOGE, BTC, etc.)
    payCurrencyFormatted = currency.toUpperCase();
  }

  console.log("[OxaPay] ✅ Invoice created:", {
    invoiceId,
    payAddress,
    payAmount,
    payCurrency: payCurrencyFormatted,
    expiresAt,
  });

  // Note: OxaPay doesn't return a payment address directly in the invoice response
  // The payment_url is provided where users can pay. The actual address is shown on the payment page.
  // For tracking, we use track_id as the invoice identifier.

  return {
    invoiceId,
    payAddress: invoiceUrl || "", // Use payment_url as address reference
    payAmount,
    payCurrency: payCurrencyFormatted,
    expiresAt,
    invoiceUrl,
  };
}

/**
 * Type for OxaPay payment/invoice response
 * Based on Payment Information API: GET /v1/payment/{track_id}
 */
export type OxaPayPayment = {
  data?: {
    track_id?: string | number;
    type?: string; // "invoice", "white_label", "static_address", etc.
    amount?: number | string;
    currency?: string;
    status?: string; // "paying", "paid", "expired", "failed"
    order_id?: string;
    expired_at?: number; // Unix timestamp
    date?: number; // Unix timestamp
    txs?: Array<{
      tx_hash?: string;
      status?: string; // "confirming", "confirmed"
      amount?: number | string;
      currency?: string;
      network?: string;
      address?: string;
      confirmations?: number;
      date?: number;
    }>;
    [key: string]: any;
  };
  message?: string;
  status?: number;
  error?: any;
  [key: string]: any;
};

/**
 * Fetch payment/invoice status from OxaPay
 * Returns raw response with fields as OxaPay provides
 * Cached for 10 seconds to avoid excessive API calls
 */
export async function getPaymentStatus(
  invoiceId: string | number
): Promise<OxaPayPayment> {
  const config = getOxaPayConfig();
  
  if (!config.merchantApiKey) {
    throw new Error("OXAPAY_MERCHANT_API_KEY is not configured");
  }

  const invoiceIdStr = String(invoiceId);

  // Check cache first
  const cached = paymentStatusCache.get(invoiceIdStr);
  if (cached && Date.now() - cached.timestamp < PAYMENT_STATUS_CACHE_DURATION) {
    return cached.status;
  }

  const response = await fetch(`${config.baseUrl}/v1/payment/${invoiceId}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "merchant_api_key": config.merchantApiKey,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OxaPay status error: ${response.status} ${text}`);
  }

  const responseData = (await response.json()) as OxaPayPayment;

  // Update cache
  paymentStatusCache.set(invoiceIdStr, {
    status: responseData,
    timestamp: Date.now(),
  });

  return responseData;

  // Cleanup old cache entries
  if (paymentStatusCache.size > 100) {
    const now = Date.now();
    for (const [key, value] of paymentStatusCache.entries()) {
      if (now - value.timestamp > PAYMENT_STATUS_CACHE_DURATION) {
        paymentStatusCache.delete(key);
      }
    }
  }
}

/**
 * Verify webhook signature (HMAC)
 * OxaPay signs webhooks with HMAC-SHA512 using Merchant API key (for payments) or Payout API key (for payouts)
 * Header name is "HMAC" (not "x-signature")
 */
export function verifyWebhookSignature(
  payload: string, 
  signature: string, 
  isPayout: boolean = false
): boolean {
  const config = getOxaPayConfig();
  const payoutConfig = isPayout ? require('./oxapay-config').getOxaPayPayoutConfig() : null;
  
  // Use Payout API key for payout webhooks, Merchant API key for payment webhooks
  const apiKey = isPayout 
    ? (payoutConfig?.payoutApiKey || '')
    : config.merchantApiKey;
  
  if (!apiKey) {
    console.warn(
      isPayout 
        ? "OXAPAY_PAYOUT_API_KEY is not configured, rejecting payout webhook"
        : "OXAPAY_MERCHANT_API_KEY is not configured, rejecting deposit webhook"
    );
    return false;
  }

  // OxaPay uses HMAC-SHA512 (not SHA256!) with API key
  const expectedSignature = crypto
    .createHmac("sha512", apiKey)
    .update(payload)
    .digest("hex");

  // Compare signatures in constant time
  const actual = Buffer.from(signature.trim().toLowerCase());
  const expected = Buffer.from(expectedSignature);
  if (actual.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(actual, expected);
}

