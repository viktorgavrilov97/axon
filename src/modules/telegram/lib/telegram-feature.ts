import { isTelegramIntegrationGloballyEnabled } from "./telegram-config";

/**
 * Check if Telegram integration is enabled (cached for server components)
 * Use this in Server Components to conditionally render UI
 */
export async function isTelegramEnabled(): Promise<boolean> {
  return await isTelegramIntegrationGloballyEnabled();
}

