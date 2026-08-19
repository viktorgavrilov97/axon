import { db } from "@/shared/lib/db";

/**
 * Check if Telegram integration is globally enabled
 */
export async function isTelegramIntegrationGloballyEnabled(): Promise<boolean> {
  try {
    // Check if FeatureFlag model exists in Prisma Client
    if (!db.featureFlag) {
      console.warn("[Telegram] FeatureFlag model not found in Prisma Client. Run 'npx prisma generate'.");
      return false;
    }

    const flag = await db.featureFlag.findUnique({
      where: { key: "telegram_integration" },
    });

    return flag?.enabled ?? false;
  } catch (error) {
    console.error("[Telegram] Error checking feature flag:", error);
    // If it's a Prisma error about missing model, return false
    if (error instanceof Error && error.message.includes("featureFlag")) {
      console.warn("[Telegram] FeatureFlag model not available. Run 'npx prisma generate'.");
      return false;
    }
    return false;
  }
}

/**
 * Ensure Telegram feature flag exists in database
 * Called once at startup or from admin panel
 */
export async function ensureTelegramFeatureFlagExists(): Promise<void> {
  try {
    // Check TELEGRAM_MODULE_ENABLED first, fallback to TELEGRAM_INTEGRATION_ENABLED_DEFAULT
    const defaultEnabled = 
      process.env.TELEGRAM_MODULE_ENABLED === "true" ||
      process.env.TELEGRAM_INTEGRATION_ENABLED_DEFAULT === "true";

    await db.featureFlag.upsert({
      where: { key: "telegram_integration" },
      create: {
        key: "telegram_integration",
        enabled: defaultEnabled,
      },
      update: {
        // Don't update if already exists - let admin control it
      },
    });
  } catch (error) {
    console.error("[Telegram] Error ensuring feature flag:", error);
  }
}

/**
 * Get Telegram bot token from environment
 */
export function getTelegramBotToken(): string | null {
  return process.env.TELEGRAM_BOT_TOKEN || null;
}

/**
 * Get Telegram bot username from environment
 */
export function getTelegramBotUsername(): string | null {
  return process.env.TELEGRAM_LOGIN_BOT_USERNAME || process.env.TELEGRAM_BOT_USERNAME || null;
}

/**
 * Get Telegram webhook secret from environment
 */
export function getTelegramWebhookSecret(): string | null {
  return process.env.TELEGRAM_WEBHOOK_SECRET || null;
}

/**
 * Get Telegram login secret for HMAC verification
 */
export function getTelegramLoginSecret(): string | null {
  return process.env.TELEGRAM_LOGIN_SECRET || null;
}

