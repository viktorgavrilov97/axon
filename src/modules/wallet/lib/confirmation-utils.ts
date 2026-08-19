/**
 * Required blockchain confirmations per network.
 * Values align with OxaPay settlement rules (e.g. Tron = 10, not 20).
 */
export function getRequiredConfirmations(network: string): number {
  const networkLower = network.toLowerCase();

  if (networkLower.includes("polygon") || networkLower.includes("matic")) {
    return 50;
  }
  if (networkLower.includes("trc20") || networkLower.includes("tron")) {
    return 10;
  }
  if (
    networkLower.includes("erc20") ||
    networkLower.includes("ethereum") ||
    networkLower.includes("eth")
  ) {
    return 12;
  }
  if (
    networkLower.includes("bep20") ||
    networkLower.includes("bsc") ||
    networkLower.includes("bnb")
  ) {
    return 12;
  }
  if (networkLower.includes("solana") || networkLower.includes("sol")) {
    return 32;
  }
  if (networkLower.includes("ton")) {
    return 1;
  }

  return 50;
}
