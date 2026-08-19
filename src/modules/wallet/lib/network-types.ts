/**
 * Supported network types for deposits and withdrawals
 */
export type NetworkType = "TRC20" | "ERC20" | "BEP20" | "SOLANA" | "MATIC" | "TON";

/**
 * Withdrawal-supported network types (only USDT networks that can be paid out automatically)
 */
export type WithdrawalNetworkType = "TRC20" | "ERC20" | "BEP20" | "MATIC";

/**
 * Network display information
 */
export interface NetworkInfo {
  value: NetworkType;
  label: string;
  icon: string;
  currency: string;
  addressPrefix: string;
  addressPlaceholder: string;
  isEvm: boolean;
  isTron: boolean;
  isSolana: boolean;
  isTon: boolean;
}

/**
 * Network configuration
 */
export const NETWORKS: Record<NetworkType, NetworkInfo> = {
  TRC20: {
    value: "TRC20",
    label: "TRC-20 (Tron)",
    icon: "/networks/tether.svg",
    currency: "USDT_TRC20",
    addressPrefix: "T",
    addressPlaceholder: "T...",
    isEvm: false,
    isTron: true,
    isSolana: false,
    isTon: false,
  },
  ERC20: {
    value: "ERC20",
    label: "ERC-20 (Ethereum)",
    icon: "/networks/erc20.svg",
    currency: "USDT_ERC20",
    addressPrefix: "0x",
    addressPlaceholder: "0x...",
    isEvm: true,
    isTron: false,
    isSolana: false,
    isTon: false,
  },
  BEP20: {
    value: "BEP20",
    label: "BEP-20 (BNB Chain)",
    icon: "/networks/erc20.svg", // Placeholder
    currency: "USDT_BEP20",
    addressPrefix: "0x",
    addressPlaceholder: "0x...",
    isEvm: true,
    isTron: false,
    isSolana: false,
    isTon: false,
  },
  SOLANA: {
    value: "SOLANA",
    label: "Solana (SOL)",
    icon: "/networks/erc20.svg", // Placeholder
    currency: "SOL",
    addressPrefix: "",
    addressPlaceholder: "...",
    isEvm: false,
    isTron: false,
    isSolana: true,
    isTon: false,
  },
  MATIC: {
    value: "MATIC",
    label: "MATIC (Polygon)",
    icon: "/networks/polygon.svg",
    currency: "USDT_POLYGON",
    addressPrefix: "0x",
    addressPlaceholder: "0x...",
    isEvm: true,
    isTron: false,
    isSolana: false,
    isTon: false,
  },
  TON: {
    value: "TON",
    label: "TON",
    icon: "/networks/erc20.svg", // Placeholder
    currency: "TON",
    addressPrefix: "",
    addressPlaceholder: "...",
    isEvm: false,
    isTron: false,
    isSolana: false,
    isTon: true,
  },
};

/**
 * Map network to OxaPay network format
 */
export function mapNetworkToOxaPay(network: NetworkType): string {
  switch (network) {
    case "TRC20":
      return "TRC20";
    case "ERC20":
      return "ERC20";
    case "BEP20":
      return "BEP20"; // May need to check OxaPay docs
    case "SOLANA":
      return "SOLANA"; // May need to check OxaPay docs
    case "MATIC":
      return "POLYGON"; // MATIC maps to POLYGON in OxaPay
    case "TON":
      return "TON"; // May need to check OxaPay docs
    default:
      return "POLYGON";
  }
}

/**
 * Map network to OxaPay currency format
 */
export function mapNetworkToOxaPayCurrency(network: NetworkType): string {
  switch (network) {
    case "TRC20":
      return "usdttrc20";
    case "ERC20":
      return "usdterc20";
    case "BEP20":
      return "usdtbep20"; // May need to check OxaPay docs
    case "SOLANA":
      return "sol"; // May need to check OxaPay docs
    case "MATIC":
      return "usdtmatic";
    case "TON":
      return "ton"; // May need to check OxaPay docs
    default:
      return "usdtmatic";
  }
}

