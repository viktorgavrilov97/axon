"use server";

import { isTelegramIntegrationGloballyEnabled } from "../lib/telegram-config";

export async function checkTelegramEnabledAction(): Promise<boolean> {
  return await isTelegramIntegrationGloballyEnabled();
}

