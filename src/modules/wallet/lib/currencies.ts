/**
 * Supported currencies for deposits
 */
export type CurrencyCode = "BTC" | "ETH" | "USDT" | "BNB" | "SOL" | "TRX" | "MATIC" | "TON";

/**
 * Currency information
 */
export interface CurrencyInfo {
  code: CurrencyCode;
  name: string;
  icon?: string;
  defaultNetwork: string; // Default network for this currency
  supportedNetworks: string[]; // All supported networks for this currency
  minAmount: number; // Minimum deposit amount in this currency
}

/**
 * Currency configuration
 */
export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  BTC: {
    code: "BTC",
    name: "Bitcoin",
    icon: "/networks/binance.svg", // Placeholder, should be BTC icon
    defaultNetwork: "BITCOIN",
    supportedNetworks: ["BITCOIN"],
    minAmount: 0.0001,
  },
  ETH: {
    code: "ETH",
    name: "Ethereum",
    icon: "/networks/erc20.svg",
    defaultNetwork: "ERC20",
    supportedNetworks: ["ERC20"],
    minAmount: 0.001,
  },
  USDT: {
    code: "USDT",
    name: "Tether",
    icon: "/networks/tether.svg",
    defaultNetwork: "TRC20",
    supportedNetworks: ["TRC20", "ERC20", "BEP20", "POLYGON"],
    minAmount: 1,
  },
  BNB: {
    code: "BNB",
    name: "BNB",
    icon: "/networks/bnb.svg",
    defaultNetwork: "BEP20",
    supportedNetworks: ["BEP20"],
    minAmount: 0.01,
  },
  SOL: {
    code: "SOL",
    name: "Solana",
    icon: "/networks/solana.svg",
    defaultNetwork: "SOLANA",
    supportedNetworks: ["SOLANA"],
    minAmount: 0.1,
  },
  TRX: {
    code: "TRX",
    name: "Tron",
    icon: "/networks/trx.svg",
    defaultNetwork: "TRC20",
    supportedNetworks: ["TRC20"],
    minAmount: 10,
  },
  MATIC: {
    code: "MATIC",
    name: "Polygon",
    icon: "/networks/polygon.svg",
    defaultNetwork: "POLYGON",
    supportedNetworks: ["POLYGON"],
    minAmount: 1,
  },
  TON: {
    code: "TON",
    name: "TON",
    icon: "/networks/ton_symbol.svg",
    defaultNetwork: "TON",
    supportedNetworks: ["TON"],
    minAmount: 1,
  },
};

/**
 * Map currency to OxaPay currency format
 */
export function mapCurrencyToOxaPay(currency: CurrencyCode): string {
  switch (currency) {
    case "BTC":
      return "BTC";
    case "ETH":
      return "ETH";
    case "USDT":
      return "USDT";
    case "BNB":
      return "BNB";
    case "SOL":
      return "SOL";
    case "TRX":
      return "TRX";
    case "MATIC":
      return "MATIC";
    case "TON":
      return "TON";
    default:
      return "USDT";
  }
}

/**
 * Get default network for currency
 */
export function getDefaultNetworkForCurrency(currency: string): string {
  const currencyUpper = currency.toUpperCase();
  const currencyInfo = CURRENCIES[currencyUpper as CurrencyCode];
  if (currencyInfo) {
    return currencyInfo.defaultNetwork;
  }
  // Default network mapping for currencies not in CURRENCIES
  // Based on official OxaPay supported currencies
  const defaultNetworkMap: Record<string, string> = {
    BTC: "BITCOIN",
    ETH: "ERC20",
    USDT: "TRC20",
    USDC: "ERC20",
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
  };
  return defaultNetworkMap[currencyUpper] || "TRC20";
}

/**
 * Get supported networks for currency
 */
export function getSupportedNetworksForCurrency(currency: string): string[] {
  const currencyUpper = currency.toUpperCase();
  const currencyInfo = CURRENCIES[currencyUpper as CurrencyCode];
  if (currencyInfo) {
    return currencyInfo.supportedNetworks;
  }
  // Default networks for currencies not in CURRENCIES
  // Based on official OxaPay supported currencies
  const defaultNetworksMap: Record<string, string[]> = {
    BTC: ["BITCOIN"],
    ETH: ["ERC20"],
    USDT: ["TRC20", "ERC20", "BEP20", "POLYGON", "SOLANA", "TON"],
    USDC: ["ERC20", "BEP20", "SOLANA"],
    BNB: ["BEP20"],
    SOL: ["SOLANA"],
    TRX: ["TRC20"],
    MATIC: ["POLYGON"],
    TON: ["TON"],
    LTC: ["LITECOIN"],
    DOGE: ["DOGECOIN"],
    XRP: ["XRP"],
    BCH: ["BITCOIN_CASH"],
    SHIB: ["ERC20", "BEP20"],
    DAI: ["ERC20", "POLYGON"],
    XMR: ["MONERO"],
    DOGS: ["TON"],
  };
  return defaultNetworksMap[currencyUpper] || ["TRC20"];
}

/**
 * Get minimum amount for currency
 */
export function getMinAmountForCurrency(currency: string): number {
  const currencyUpper = currency.toUpperCase();
  const currencyInfo = CURRENCIES[currencyUpper as CurrencyCode];
  if (currencyInfo) {
    return currencyInfo.minAmount;
  }
  // Default min amounts for currencies not in CURRENCIES
  // Based on official OxaPay supported currencies
  const defaultMinAmounts: Record<string, number> = {
    BTC: 0.0001,
    ETH: 0.001,
    USDT: 1,
    USDC: 1,
    BNB: 0.01,
    SOL: 0.1,
    TRX: 10,
    MATIC: 1,
    TON: 1,
    LTC: 0.01,
    DOGE: 10,
    XRP: 1,
    BCH: 0.001,
    SHIB: 1000000, // 1M SHIB
    DAI: 1,
    XMR: 0.01,
    DOGS: 1,
  };
  return defaultMinAmounts[currencyUpper] || 1;
}

