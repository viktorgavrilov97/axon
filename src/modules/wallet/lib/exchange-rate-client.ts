/**
 * Client-side exchange rate fetcher
 * This calls the server action to avoid CORS issues
 */

import { getExchangeRateFromExternal as getExchangeRateFromServer } from "../api/get-exchange-rate";

/**
 * Get exchange rate from CoinGecko API (client-side wrapper)
 * Calls server action to avoid CORS issues
 */
export async function getExchangeRateFromExternal(
  fromCurrency: string,
  toCurrency: string = "USDT"
): Promise<number | null> {
  try {
    console.log("[ExchangeRate] Client: Fetching rate via server action:", { fromCurrency, toCurrency });
    const rate = await getExchangeRateFromServer(fromCurrency, toCurrency);
    console.log("[ExchangeRate] Client: Rate received:", rate);
    return rate;
  } catch (error) {
    console.error("Get exchange rate from external error:", error);
    return null;
  }
}
