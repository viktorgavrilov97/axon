// Load environment variables from .env.local BEFORE importing
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  const envFile = readFileSync(envPath, "utf-8");
  let loadedCount = 0;
  envFile.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const match = trimmed.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        const cleanValue = value.trim().replace(/^["']|["']$/g, ""); // Remove quotes
        process.env[key] = cleanValue;
        loadedCount++;
      }
    }
  });
  console.log(`✅ Loaded ${loadedCount} environment variables from .env.local`);
} else {
  console.warn(`⚠️  .env.local file not found at: ${envPath}`);
  console.warn("   Using environment variables from system/environment");
}

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL || "https://axon-capital.space/api/telegram/webhook";
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

async function setupWebhook() {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("❌ TELEGRAM_BOT_TOKEN is not set");
    process.exit(1);
  }

  if (!TELEGRAM_WEBHOOK_URL) {
    console.error("❌ TELEGRAM_WEBHOOK_URL is not set");
    process.exit(1);
  }

  console.log(`🔧 Setting up Telegram webhook...`);
  console.log(`   URL: ${TELEGRAM_WEBHOOK_URL}`);
  console.log(`   Secret: ${TELEGRAM_WEBHOOK_SECRET ? "***" : "not set"}`);

  try {
    const payload: any = {
      url: TELEGRAM_WEBHOOK_URL,
    };

    if (TELEGRAM_WEBHOOK_SECRET) {
      payload.secret_token = TELEGRAM_WEBHOOK_SECRET;
    }

    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (data.ok) {
      console.log("✅ Webhook set successfully!");
      console.log(`   Description: ${data.description || "N/A"}`);
      
      // Get webhook info
      const infoResponse = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo`
      );
      const infoData = await infoResponse.json();
      
      if (infoData.ok) {
        console.log("\n📊 Webhook Info:");
        console.log(`   URL: ${infoData.result.url || "N/A"}`);
        console.log(`   Pending updates: ${infoData.result.pending_update_count || 0}`);
        if (infoData.result.last_error_date) {
          console.log(`   ⚠️  Last error: ${infoData.result.last_error_message}`);
          console.log(`   Error date: ${new Date(infoData.result.last_error_date * 1000).toISOString()}`);
        }
      }
    } else {
      console.error("❌ Failed to set webhook:", data);
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error setting webhook:", error);
    process.exit(1);
  }
}

setupWebhook();

