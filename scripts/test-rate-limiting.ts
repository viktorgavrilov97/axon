/**
 * Test rate limiting for auth endpoints
 * 
 * Usage: npx tsx scripts/test-rate-limiting.ts
 * 
 * This script attempts to login 6 times in a row to test rate limiting
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
  } catch (e) {
    // Ignore errors
  }
}

const API_URL = process.env.API_URL || "http://localhost:3000";

async function testRateLimiting() {
  const email = "test@example.com"; // Replace with test email

  console.log("🧪 Testing rate limiting for auth endpoints...\n");
  console.log(`Email: ${email}`);
  console.log(`Attempts: 6 (limit is 5 per minute)\n`);
  console.log("ℹ️  NOTE: This test uses the test rate-limit endpoint.\n");
  console.log("   Rate limiting is applied per email address.\n");

  const results: Array<{ attempt: number; status: number; message: string; rateLimited?: boolean }> = [];

  for (let i = 1; i <= 6; i++) {
    console.log(`📤 Attempt ${i}/6...`);

    try {
      const response = await fetch(`${API_URL}/api/test/rate-limit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();
      const status = response.status;

      results.push({
        attempt: i,
        status,
        message: result.error || result.message || "Success",
        rateLimited: result.rateLimited || false,
      });

      console.log(`  Status: ${status}`);
      console.log(`  Response: ${JSON.stringify(result)}`);

      if (status === 429 || result.rateLimited) {
        console.log(`  ✅ Rate limit triggered on attempt ${i}!`);
        console.log(`  Remaining: ${result.remaining || 0}`);
      } else if (result.remaining !== undefined) {
        console.log(`  Remaining attempts: ${result.remaining}`);
      }
    } catch (error) {
      console.error(`  ❌ Error:`, error);
      results.push({
        attempt: i,
        status: 0,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }

    // Small delay between attempts
    if (i < 6) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  console.log("\n📊 Summary:");
  console.log("─".repeat(50));
  results.forEach((r) => {
    const icon = r.message.includes("Слишком много попыток") ? "🚫" : "✓";
    console.log(`${icon} Attempt ${r.attempt}: Status ${r.status} - ${r.message}`);
  });

  const rateLimited = results.filter((r) => r.rateLimited || r.status === 429);

  if (rateLimited.length > 0) {
    console.log(`\n✅ SUCCESS: Rate limiting works! Blocked ${rateLimited.length} attempt(s).`);
    console.log(`   First blocked at attempt: ${rateLimited[0].attempt}`);
  } else {
    console.log(`\n⚠️  WARNING: Rate limiting may not be working.`);
    console.log(`   Expected: Attempt 6 should be blocked (limit is 5 per minute)`);
    console.log(`   Check: rate-limit.ts logic and test endpoint`);
  }
}

testRateLimiting().catch(console.error);

