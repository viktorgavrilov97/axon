/**
 * Address validation utilities for different networks
 */

import type { NetworkType } from "./network-types";
import { NETWORKS } from "./network-types";

/**
 * Check if address is a valid EVM address (ETH, Polygon, BSC, etc.)
 * Format: 0x followed by 40 hex characters
 */
export function isEvmAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
}

/**
 * Check if address looks like a TRON address
 * Format: 34 characters, starts with T, base58 character set
 */
export function isTronAddress(address: string): boolean {
  const trimmed = address.trim();
  // Typical format: 34 characters, starts with T, base58 set
  return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(trimmed);
}

/**
 * Check if address looks like a Solana address
 * Format: Base58 encoded, 32-44 characters
 */
export function isSolanaAddress(address: string): boolean {
  const trimmed = address.trim();
  // Solana addresses are base58 encoded, typically 32-44 characters
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed);
}

/**
 * Check if address looks like a TON address
 * Format: Base64 or hex encoded, various formats
 */
export function isTonAddress(address: string): boolean {
  const trimmed = address.trim();
  // TON addresses can be in different formats (EQ, UQ, etc.)
  // Basic validation - may need refinement
  return /^(EQ|UQ|kQ)[A-Za-z0-9_-]{46}$/.test(trimmed) || /^[A-Za-z0-9_-]{48}$/.test(trimmed);
}

/**
 * Validate withdrawal address for specific network
 * Returns validation result with error message if invalid
 */
export function validateWithdrawalAddress(
  address: string,
  network: NetworkType = "TRC20"
): { ok: boolean; error?: string } {
  const trimmed = address.trim();

  if (!trimmed) {
    return {
      ok: false,
      error: "Enter wallet address",
    };
  }

  const networkInfo = NETWORKS[network];

  // Validate based on network type
  if (networkInfo.isTron) {
    // TRC20 requires TRON address format
    if (!isTronAddress(trimmed)) {
      return {
        ok: false,
        error: "Invalid TRC20 address. Expected TRON address format (starts with T, 34 characters).",
      };
    }
    return { ok: true };
  } else if (networkInfo.isEvm) {
    // ERC20, BEP20, MATIC require EVM address format
    if (isTronAddress(trimmed)) {
      return {
        ok: false,
        error: `This address looks like TRON (TRC20). ${networkInfo.label} network requires EVM address format (0x...).`,
      };
    }

    if (!isEvmAddress(trimmed)) {
      return {
        ok: false,
        error: `Invalid ${networkInfo.label} address. Expected EVM address format (0x...).`,
      };
    }

    return { ok: true };
  } else if (networkInfo.isSolana) {
    // Solana address validation
    if (!isSolanaAddress(trimmed)) {
      return {
        ok: false,
        error: "Invalid Solana address. Expected Solana address format (base58, 32-44 characters).",
      };
    }
    return { ok: true };
  } else if (networkInfo.isTon) {
    // TON address validation
    if (!isTonAddress(trimmed)) {
      return {
        ok: false,
        error: "Invalid TON address. Expected TON address format.",
      };
    }
    return { ok: true };
  }

  // Fallback: default to EVM validation
  if (!isEvmAddress(trimmed)) {
    return {
      ok: false,
      error: "Invalid address format.",
    };
  }

  return { ok: true };
}

