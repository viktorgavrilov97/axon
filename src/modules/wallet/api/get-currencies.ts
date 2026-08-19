"use server";

import { getOxaPayConfig } from "../lib/oxapay-config";

/**
 * Currency information from OxaPay
 */
export interface OxaPayCurrency {
  code: string;
  name: string;
  networks?: string[];
  minAmount?: number;
}

/**
 * Get list of available currencies from OxaPay
 * Falls back to default list if API is not available
 */
export async function getCurrenciesAction(): Promise<{
  success: boolean;
  currencies?: OxaPayCurrency[];
  error?: string;
}> {
  try {
    const config = getOxaPayConfig();
    
    if (!config.merchantApiKey) {
      // Return default currencies if API key is not configured
      return {
        success: true,
        currencies: getDefaultCurrencies(),
      };
    }

    // Try to fetch currencies from OxaPay API
    // Note: OxaPay might not have a dedicated currencies endpoint
    // In that case, we'll use the default list
    try {
      const response = await fetch(`${config.baseUrl}/v1/currencies`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "merchant_api_key": config.merchantApiKey,
        },
        cache: "no-store",
      });

      if (response.ok) {
        const data = await response.json();
        
        // Parse OxaPay response format
        if (data.data && Array.isArray(data.data)) {
          const currencies: OxaPayCurrency[] = data.data.map((item: any) => ({
            code: item.code || item.currency || item.symbol,
            name: item.name || item.code || item.currency || item.symbol,
            networks: item.networks || [],
            minAmount: item.min_amount || item.minAmount,
          }));

          return {
            success: true,
            currencies: currencies.length > 0 ? currencies : getDefaultCurrencies(),
          };
        }
      }
    } catch (apiError) {
      console.warn("[OxaPay] Failed to fetch currencies from API, using default list:", apiError);
    }

    // Fallback to default currencies
    return {
      success: true,
      currencies: getDefaultCurrencies(),
    };
  } catch (error) {
    console.error("Get currencies error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get currencies",
      currencies: getDefaultCurrencies(), // Return default list even on error
    };
  }
}

/**
 * Default currencies list (fallback)
 * Based on official OxaPay supported currencies from https://oxapay.com/ru/pricing
 * Last updated: 2024
 */
function getDefaultCurrencies(): OxaPayCurrency[] {
  return [
    // Major cryptocurrencies
    { code: "BTC", name: "Bitcoin", networks: ["BITCOIN"], minAmount: 0.0001 },
    { code: "ETH", name: "Ethereum", networks: ["ERC20"], minAmount: 0.001 },
    { code: "USDT", name: "Tether", networks: ["TRC20", "ERC20", "BEP20", "POLYGON", "SOLANA", "TON"], minAmount: 1 },
    { code: "USDC", name: "USD Coin", networks: ["ERC20", "BEP20", "SOLANA"], minAmount: 1 },
    { code: "BNB", name: "BNB", networks: ["BEP20"], minAmount: 0.01 },
    
    // Layer 1 blockchains
    { code: "SOL", name: "Solana", networks: ["SOLANA"], minAmount: 0.1 },
    { code: "TRX", name: "Tron", networks: ["TRC20"], minAmount: 10 },
    { code: "MATIC", name: "Polygon", networks: ["POLYGON"], minAmount: 1 },
    { code: "TON", name: "Toncoin", networks: ["TON"], minAmount: 1 },
    { code: "XRP", name: "Ripple", networks: ["XRP"], minAmount: 1 },
    
    // Bitcoin forks and alternatives
    { code: "LTC", name: "Litecoin", networks: ["LITECOIN"], minAmount: 0.01 },
    { code: "BCH", name: "Bitcoin Cash", networks: ["BITCOIN_CASH"], minAmount: 0.001 },
    
    // Meme coins
    { code: "DOGE", name: "Dogecoin", networks: ["DOGECOIN"], minAmount: 10 },
    { code: "SHIB", name: "Shiba Inu", networks: ["ERC20", "BEP20"], minAmount: 1000000 },
    
    // Stablecoins
    { code: "DAI", name: "DAI", networks: ["ERC20", "POLYGON"], minAmount: 1 },
    
    // Privacy coins
    { code: "XMR", name: "Monero", networks: ["MONERO"], minAmount: 0.01 },
    
    // TON ecosystem tokens
    { code: "DOGS", name: "Dogs", networks: ["TON"], minAmount: 1 },
  ];
}

