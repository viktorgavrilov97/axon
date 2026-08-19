/**
 * Test webhook idempotency
 * 
 * Usage:
 * 1. Get a real webhook payload from OxaPay (or use the example below)
 * 2. Run: npx tsx scripts/test-webhook-idempotency.ts
 * 
 * This script sends the same webhook twice to verify idempotency
 */

// Load environment variables from .env.local
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  try {
    const envFile = readFileSync(envPath, "utf-8");
    envFile.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const match = trimmed.match(/^([^=:#]+)=(.*)$/);
        if (match) {
          const [, key, value] = match;
          const cleanValue = value.trim().replace(/^["']|["']$/g, "");
          if (!process.env[key]) {
            process.env[key] = cleanValue;
          }
        }
      }
    });
    console.log("✅ Loaded environment variables from .env.local\n");
  } catch (e) {
    console.warn("⚠️  Failed to load .env.local:", e);
  }
} else {
  console.warn("⚠️  .env.local not found. Make sure DATABASE_URL is set.\n");
}

const WEBHOOK_URL = process.env.WEBHOOK_URL || "http://localhost:3000/api/oxapay/webhook";

// Example webhook payload (replace with real data from OxaPay)
// IMPORTANT: For proper testing, you need a real deposit ID from your database
// Option 1: Use a real deposit's providerPaymentId as track_id
// Option 2: Create a test deposit first, then use its providerPaymentId
const exampleWebhookPayload = {
  type: "white_label", // Can be: "invoice", "white_label", "static_address", "payment_link", "donation" (for deposits) or "payout" (for withdrawals)
  track_id: "123456789", // This is the externalId (providerPaymentId) we check for idempotency - MUST match a real deposit's providerPaymentId
  order_id: "deposit_userId_timestamp",
  status: "paid",
  txs: [
    {
      tx_hash: "0x...",
      confirmations: 50,
      status: "confirmed",
      network: "polygon",
    },
  ],
};

async function testWebhookIdempotency() {
  const payload = exampleWebhookPayload;
  
  console.log("🧪 Testing webhook idempotency...\n");
  console.log("⚠️  NOTE: This test uses example data. For proper testing:");
  console.log("   1. Create a real deposit in your database");
  console.log("   2. Use the deposit's providerPaymentId as track_id");
  console.log("   3. Update the payload below with real data\n");
  console.log("Payload:", JSON.stringify(payload, null, 2));
  console.log("\n");

  // First request
  console.log("📤 Sending first webhook request...");
  const response1 = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Add HMAC signature if needed (for production)
      // "HMAC": "your-signature-here",
    },
    body: JSON.stringify(payload),
  });

  const result1 = await response1.json();
  console.log("Response 1:", result1);
  console.log("Status:", response1.status);
  console.log("\n");

  // Wait a bit
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Second request (same payload)
  console.log("📤 Sending second webhook request (same payload)...");
  const response2 = await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // Add HMAC signature if needed
      // "HMAC": "your-signature-here",
    },
    body: JSON.stringify(payload),
  });

  const result2 = await response2.json();
  console.log("Response 2:", result2);
  console.log("Status:", response2.status);
  console.log("\n");

  // Check database for idempotency
  console.log("\n📊 Checking WebhookLog table...");
  
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL not found. Cannot check WebhookLog table.");
    console.log("\n💡 Tip: Make sure .env.local exists and contains DATABASE_URL");
    return;
  }

  try {
    const { PrismaClient } = await import("@prisma/client");
    const prisma = new PrismaClient();
    
    // Determine webhookType based on payload type (same logic as webhook handler)
    const isPayout = payload.type === "payout";
    const isDeposit = payload.type === "invoice" || payload.type === "white_label" || payload.type === "static_address" || payload.type === "payment_link" || payload.type === "donation";
    const webhookType = isPayout ? "payout" : "deposit";
    
    const logs = await prisma.webhookLog.findMany({
      where: {
        externalId: payload.track_id,
        webhookType: webhookType,
        provider: "OXAPAY",
      },
      orderBy: { createdAt: "desc" },
    });

    console.log(`Found ${logs.length} webhook log entries:`);
    logs.forEach((log, i) => {
      console.log(`  ${i + 1}. ID: ${log.id}`);
      console.log(`     Processed: ${log.processed}`);
      console.log(`     Created: ${log.createdAt.toISOString()}`);
      if (log.error) {
        console.log(`     Error: ${log.error}`);
      }
      console.log("");
    });

    // Check idempotency
    const processedLogs = logs.filter(log => log.processed);
    const unprocessedLogs = logs.filter(log => !log.processed);
    const duplicateLogs = logs.length > 1;

    console.log("\n📈 Idempotency Analysis:");
    console.log(`   Total logs: ${logs.length}`);
    console.log(`   Processed: ${processedLogs.length}`);
    console.log(`   Unprocessed: ${unprocessedLogs.length}`);

    if (logs.length === 0) {
      console.log("\n⚠️  WARNING: No webhook logs found!");
      console.log("   - This might mean the webhook was rejected before logging");
      console.log("   - Or the track_id doesn't match any logs");
    } else if (logs.length === 1) {
      // Only one log entry - this is GOOD for idempotency
      if (processedLogs.length === 1) {
        console.log("\n✅ SUCCESS: Idempotency works!");
        console.log("   - First webhook was processed successfully");
        console.log("   - Second webhook was rejected (no duplicate log created)");
      } else if (unprocessedLogs.length === 1) {
        console.log("\n✅ SUCCESS: Idempotency works!");
        console.log("   - Both webhooks created only ONE log entry (upsert worked)");
        console.log("   - Webhook was logged but not processed (deposit not found)");
        console.log("   - Second webhook updated the same log entry, didn't create a new one");
      }
    } else if (duplicateLogs) {
      // Multiple log entries - this is BAD for idempotency
      console.log("\n❌ FAILURE: Idempotency is NOT working!");
      console.log("   - Multiple log entries found for the same track_id");
      console.log("   - This means the second webhook created a new log instead of updating");
      console.log("   - Check the unique constraint on (externalId, webhookType, provider)");
      
      if (processedLogs.length > 1) {
        console.log("   - ⚠️  Multiple webhooks were processed!");
      }
    }

    await prisma.$disconnect();
  } catch (error) {
    console.error("❌ Error checking WebhookLog:", error);
    if (error instanceof Error && error.message.includes("DATABASE_URL")) {
      console.log("\n💡 Tip: Make sure DATABASE_URL is set in .env.local");
    }
  }
}

testWebhookIdempotency().catch(console.error);

