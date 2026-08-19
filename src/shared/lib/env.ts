/**
 * Environment detection utilities
 * 
 * Uses NEXT_PUBLIC_VERCEL_ENV to determine the environment:
 * - "development" → local development (test mode)
 * - "preview" → Vercel preview deployments (test mode)
 * - "production" → Vercel production (production mode)
 * - undefined/null → defaults to test mode for safety
 */

/**
 * Check if the system is running in test mode
 * 
 * Test mode means:
 * - Profits are calculated every minute instead of daily
 * - Referral payouts are grouped by minute instead of day
 * - Useful for testing realtime updates quickly
 * 
 * @returns true if in test mode (development or preview), false if in production
 */
export function isTestMode(): boolean {
  const env = process.env.NEXT_PUBLIC_VERCEL_ENV;

  // Local development
  if (env === "development") return true;

  // Vercel preview → dev.axon-capital.space
  if (env === "preview") return true;

  // Production → axon-capital.space
  // Also default to test mode if env is not set (safety)
  return env !== "production";
}

/**
 * Get the current environment label for logging
 * 
 * @returns Environment label: "development" | "preview" | "production" | "unknown"
 */
export function getEnvLabel(): string {
  const env = process.env.NEXT_PUBLIC_VERCEL_ENV;
  return env ?? "unknown";
}

