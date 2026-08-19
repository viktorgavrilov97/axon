/**
 * OxaPay Payout API Client
 * Handles automatic withdrawal payouts through OxaPay Payout API
 * 
 * Requires separate Payout API Key (different from Merchant API Key)
 */

import { getOxaPayPayoutConfig } from "./oxapay-config";

export interface OxaPayPayoutRequest {
  amount: string;      // Amount as string in decimal format
  currency: string;    // Currency code, e.g., "USDT", "BTC", "ETH"
  network?: string;    // Network, e.g., "TRC20", "ERC20", "POLYGON"
  address: string;     // Recipient address
  orderId?: string;    // Optional: internal order ID for tracking
  callbackUrl?: string; // Optional: callback URL for status updates
}

export interface OxaPayPayoutResponse {
  payoutId: string;    // Internal payout ID from OxaPay
  status: "pending" | "processing" | "completed" | "failed" | string;
  txHash?: string;     // Transaction hash if available
  // TODO: Add additional fields based on actual API response
}

export interface OxaPayPayoutStatus {
  payoutId: string;
  status: "pending" | "processing" | "completed" | "failed" | string;
  errorMessage?: string;
  txHash?: string;
  // TODO: Add additional fields based on actual API response
}

export class OxaPayPayoutError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public responseBody?: unknown
  ) {
    super(message);
    this.name = "OxaPayPayoutError";
  }
}

/**
 * Create payout request to OxaPay
 * @throws {OxaPayPayoutError} if request fails
 */
export async function createOxaPayPayout(
  request: OxaPayPayoutRequest
): Promise<OxaPayPayoutResponse> {
  const config = getOxaPayPayoutConfig();
  
  if (!config.payoutApiKey) {
    throw new OxaPayPayoutError(
      "OXAPAY_PAYOUT_API_KEY is required for Payout API. " +
      "Set OXAPAY_PAYOUT_API_KEY in .env.local with your Payout API key from OxaPay dashboard.",
      400,
      { code: "PAYOUT_API_KEY_REQUIRED" }
    );
  }

  // OxaPay Payout API endpoint: POST /v1/payout
  const payoutEndpoint = `${config.baseUrl}/v1/payout`;
  
  console.log(`[OxaPay Payout] Creating payout:`, {
    amount: request.amount,
    currency: request.currency,
    network: request.network,
    address: request.address,
  });

  try {
    const requestBody: Record<string, any> = {
      amount: request.amount,
      currency: request.currency,
      address: request.address,
    };
    
    // Add network if provided (required for currencies with multiple networks)
    if (request.network) {
      requestBody.network = request.network;
    }
    
    // Add optional fields
    if (request.callbackUrl) {
      requestBody.callback_url = request.callbackUrl;
    }
    
    if (request.orderId) {
      requestBody.description = `Withdrawal ${request.orderId}`;
    }
    
    const response = await fetch(payoutEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "payout_api_key": config.payoutApiKey, // Payout API key in header
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { raw: errorText };
      }
      
      console.error(`[OxaPay Payout] Failed to create payout (${response.status}):`, errorData);
      
      // Extract specific error message from error object if available
      let errorMessage = `Failed to create payout: ${response.status} ${response.statusText}`;
      if (errorData.error?.message) {
        errorMessage = errorData.error.message;
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
      
      throw new OxaPayPayoutError(
        errorMessage,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    
    // Validate response structure: { data: { track_id, status }, message, status, error }
    if (!data.data) {
      console.error("[OxaPay Payout] Response missing data:", JSON.stringify(data, null, 2));
      throw new OxaPayPayoutError(
        "OxaPay did not return data object. Response: " + JSON.stringify(data),
        500,
        data
      );
    }

    if (!data.data.track_id) {
      console.error("[OxaPay Payout] Response missing track_id:", JSON.stringify(data, null, 2));
      throw new OxaPayPayoutError(
        "OxaPay did not return track_id. Response: " + JSON.stringify(data),
        500,
        data
      );
    }

    const payoutId = String(data.data.track_id);
    const status = data.data.status || "processing";
    const txHash = undefined; // Not available in create response

    console.log(`[OxaPay Payout] ✅ Payout created:`, {
      payoutId,
      status,
      txHash,
    });

    return {
      payoutId,
      status,
      txHash,
    };
  } catch (error) {
    if (error instanceof OxaPayPayoutError) {
      throw error;
    }
    
    throw new OxaPayPayoutError(
      `Error creating payout: ${error instanceof Error ? error.message : "Unknown error"}`,
      undefined,
      error
    );
  }
}

/**
 * Get payout status from OxaPay
 * @throws {OxaPayPayoutError} if request fails
 */
export async function getOxaPayPayoutStatus(
  payoutId: string
): Promise<OxaPayPayoutStatus> {
  const config = getOxaPayPayoutConfig();
  
  if (!config.payoutApiKey) {
    throw new OxaPayPayoutError(
      "OXAPAY_PAYOUT_API_KEY is required for Payout API",
      400,
      { code: "PAYOUT_API_KEY_REQUIRED" }
    );
  }

  // OxaPay Payout API endpoint: GET /v1/payout/{track_id}
  const statusEndpoint = `${config.baseUrl}/v1/payout/${payoutId}`;

  try {
    const response = await fetch(statusEndpoint, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "payout_api_key": config.payoutApiKey,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData: any = {};
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { raw: errorText };
      }
      
      throw new OxaPayPayoutError(
        `Failed to get payout status: ${response.status} ${response.statusText}`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    
    // Response structure: { data: { track_id, status, tx_hash, ... }, message, status, error }
    if (!data.data) {
      throw new OxaPayPayoutError(
        "OxaPay did not return data object. Response: " + JSON.stringify(data),
        500,
        data
      );
    }
    
    const status = data.data.status || "processing";
    const txHash = data.data.tx_hash || data.data.txHash || "";
    const errorMessage = data.error?.message || (status === "Failed" ? "Payout failed" : undefined);

    console.log(`[OxaPay Payout] Status for ${payoutId}:`, {
      status,
      txHash,
      rawData: data.data,
    });

    return {
      payoutId: String(data.data.track_id || data.payoutId || data.id || payoutId),
      status,
      txHash,
      errorMessage,
    };
  } catch (error) {
    if (error instanceof OxaPayPayoutError) {
      throw error;
    }
    
    throw new OxaPayPayoutError(
      `Error getting payout status: ${error instanceof Error ? error.message : "Unknown error"}`,
      undefined,
      error
    );
  }
}

