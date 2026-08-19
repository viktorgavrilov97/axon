"use server";

import { getOxaPayConfig } from "../lib/oxapay-config";

/**
 * Get exchange rate from OxaPay API
 * This is a simplified version - in production, you might want to use OxaPay's rate API
 * or cache rates to avoid excessive API calls
 */
export async function getExchangeRateAction(
  fromCurrency: string,
  toCurrency: string = "USDT"
): Promise<{
  success: boolean;
  rate?: number;
  error?: string;
}> {
  try {
    const config = getOxaPayConfig();
    
    if (!config.merchantApiKey) {
      return {
        success: false,
        error: "OXAPAY_MERCHANT_API_KEY is not configured",
      };
    }

    // For now, we'll use a mock rate or fetch from OxaPay if they have a rate API
    // In production, you should use OxaPay's actual rate API endpoint
    // Example: GET /v1/currencies/rate?from=BTC&to=USDT
    
    // For development, we'll create a test invoice to get the rate
    // This is not ideal but works until OxaPay provides a dedicated rate API
    
    // Alternative: Use a third-party exchange rate API like CoinGecko or Binance
    // For now, return a placeholder that will be updated from the actual invoice response
    
    return {
      success: true,
      // Rate will be fetched from the actual invoice creation response
      // This is a placeholder - the real rate comes from OxaPay when creating the invoice
      rate: undefined,
    };
  } catch (error) {
    console.error("Get exchange rate error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get exchange rate",
    };
  }
}

/**
 * Get exchange rate from external API (CoinGecko as fallback)
 * This is used when OxaPay doesn't provide a direct rate API
 * Can be called from both client and server
 * 
 * NOTE: This function is marked as "use server" but can be called from client
 * because it uses fetch which works in both environments
 */
export async function getExchangeRateFromExternal(
  fromCurrency: string,
  toCurrency: string = "USDT"
): Promise<number | null> {
  try {
    // Map currency codes to CoinGecko IDs
    // Based on official OxaPay supported currencies
    const coinGeckoIds: Record<string, string> = {
      BTC: "bitcoin",
      ETH: "ethereum",
      USDT: "tether",
      USDC: "usd-coin",
      BNB: "binancecoin",
      SOL: "solana",
      TRX: "tron",
      MATIC: "matic-network",
      TON: "the-open-network",
      LTC: "litecoin",
      DOGE: "dogecoin",
      XRP: "ripple",
      BCH: "bitcoin-cash",
      SHIB: "shiba-inu",
      DAI: "dai",
      XMR: "monero",
      DOGS: "dogs", // May need to check CoinGecko ID
    };

    const fromId = coinGeckoIds[fromCurrency.toUpperCase()];
    const toId = coinGeckoIds[toCurrency.toUpperCase()];

    if (!fromId || !toId) {
      console.warn(`Currency not supported by CoinGecko: ${fromCurrency} or ${toCurrency}`);
      return null;
    }

    // CoinGecko returns rates in USD, so we need to:
    // 1. Get both currencies' rates in USD
    // 2. Calculate the ratio
    const ids = [fromId, toId].filter((id, index, self) => self.indexOf(id) === index).join(',');
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
    
    console.log("[ExchangeRate] Fetching rate:", { fromCurrency, toCurrency, fromId, toId, url });

    const response = await fetch(url, {
      next: { revalidate: 60 }, // Cache for 60 seconds
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error("CoinGecko API error:", response.status, response.statusText);
      const errorText = await response.text();
      console.error("CoinGecko error response:", errorText);
      return null;
    }

    const data = await response.json();
    console.log("[ExchangeRate] CoinGecko response:", data);
    
    const fromRate = data[fromId]?.usd;
    const toRate = data[toId]?.usd;

    if (!fromRate || !toRate) {
      console.error("CoinGecko rate not found:", { fromRate, toRate, data });
      return null;
    }

    // Calculate rate: fromCurrency / toCurrency
    // Example: BTC to USDT = BTC_USD / USDT_USD
    const rate = fromRate / toRate;

    console.log("[ExchangeRate] Rate calculated:", { 
      fromCurrency, 
      toCurrency, 
      fromRate, 
      toRate, 
      rate 
    });
    
    return rate;
  } catch (error) {
    console.error("Get exchange rate from external error:", error);
    return null;
  }
}

