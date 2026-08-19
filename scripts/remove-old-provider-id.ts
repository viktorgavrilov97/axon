// Load environment variables from .env.local
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
try {
  const envFile = readFileSync(envPath, "utf-8");
  envFile.split("\n").forEach((line) => {
    const match = line.match(/^([^=:#]+)=(.*)$/);
    if (match) {
      const [, key, value] = match;
      if (!process.env[key]) {
        process.env[key] = value.trim();
      }
    }
  });
} catch (e) {
  // .env.local might not exist
}

import { db } from "../src/shared/lib/db";

async function main() {
  try {
    console.log("Removing old providerId column from Deposit table...");
    
    // Execute SQL directly
    await db.$executeRawUnsafe(`
      ALTER TABLE "Deposit" DROP CONSTRAINT IF EXISTS "Deposit_providerId_key";
      DROP INDEX IF EXISTS "Deposit_providerId_idx";
      ALTER TABLE "Deposit" DROP COLUMN IF EXISTS "providerId";
    `);
    
    console.log("✅ Successfully removed old providerId column");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();

