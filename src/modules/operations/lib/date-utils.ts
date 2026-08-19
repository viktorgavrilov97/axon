/**
 * Client-safe date utilities (no database imports)
 */

/**
 * Get deposit expiration time
 * Uses expiresAt if provided, otherwise falls back to 24 hours from creation
 */
export function getDepositExpirationTime(createdAt: Date, expiresAt?: Date): Date {
  if (expiresAt) {
    return new Date(expiresAt);
  }
  // Fallback: 24 hours from creation (default for OxaPay)
  const expiration = new Date(createdAt);
  expiration.setHours(expiration.getHours() + 24);
  return expiration;
}

