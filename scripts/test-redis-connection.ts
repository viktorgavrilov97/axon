/**
 * Test Upstash Redis connection
 * 
 * Usage: npx tsx scripts/test-redis-connection.ts
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
    console.warn("⚠️  Failed to load .env.local:", e);
  }
}

// Set credentials if provided as arguments
if (process.argv[2] && process.argv[3]) {
  process.env.UPSTASH_REDIS_REST_URL = process.argv[2];
  process.env.UPSTASH_REDIS_REST_TOKEN = process.argv[3];
}

async function testRedisConnection() {
  console.log("🧪 Testing Upstash Redis connection...\n");

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    console.error("❌ Missing Redis credentials!");
    console.log("\nPlease set:");
    console.log("  UPSTASH_REDIS_REST_URL");
    console.log("  UPSTASH_REDIS_REST_TOKEN");
    console.log("\nOr pass as arguments:");
    console.log("  npx tsx scripts/test-redis-connection.ts <url> <token>");
    process.exit(1);
  }

  console.log("📋 Configuration:");
  console.log(`  URL: ${redisUrl}`);
  console.log(`  Token: ${redisToken.substring(0, 20)}...`);
  console.log("");

  try {
    const { Redis } = await import("@upstash/redis");
    const { Ratelimit } = await import("@upstash/ratelimit");

    // Initialize Redis client
    const redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });

    console.log("📤 Testing basic Redis operations...");

    // Test 1: PING
    const pingResult = await redis.ping();
    console.log(`  ✅ PING: ${pingResult}`);

    // Test 2: SET/GET
    const testKey = "test:connection";
    const testValue = `test-${Date.now()}`;
    await redis.set(testKey, testValue);
    const getValue = await redis.get(testKey);
    console.log(`  ✅ SET/GET: ${getValue === testValue ? "OK" : "FAILED"}`);

    // Test 3: Delete test key
    await redis.del(testKey);
    console.log(`  ✅ DEL: OK`);

    // Test 4: Rate limiting
    console.log("\n📤 Testing rate limiting...");
    const ratelimit = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "60 s"),
      analytics: true,
    });

    const testIdentifier = "test-user-123";
    
    for (let i = 1; i <= 6; i++) {
      const result = await ratelimit.limit(testIdentifier);
      console.log(`  Attempt ${i}: ${result.success ? "✅ Allowed" : "🚫 Blocked"} (remaining: ${result.remaining})`);
      
      if (!result.success) {
        console.log(`    ✅ Rate limit works! Blocked on attempt ${i}`);
      }
    }

    // Clean up rate limit key
    await redis.del(`ratelimit:${testIdentifier}`);
    console.log(`  ✅ Cleanup: OK`);

    console.log("\n✅ SUCCESS: Redis connection and rate limiting work correctly!");
    console.log("\n💡 Next steps:");
    console.log("  1. Add credentials to .env.local");
    console.log("  2. Add credentials to Vercel environment variables");
    console.log("  3. Restart your dev server");
    console.log("  4. Test rate limiting: npx tsx scripts/test-rate-limiting.ts");

  } catch (error) {
    console.error("\n❌ ERROR:", error);
    if (error instanceof Error) {
      console.error("   Message:", error.message);
    }
    process.exit(1);
  }
}

testRedisConnection().catch(console.error);




