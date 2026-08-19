// Load environment variables from .env.local BEFORE importing db
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
if (!existsSync(envPath)) {
  console.error(`❌ .env.local file not found at: ${envPath}`);
  process.exit(1);
}

try {
  const envFile = readFileSync(envPath, "utf-8");
  let loadedCount = 0;
  envFile.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const match = trimmed.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        const cleanValue = value.trim().replace(/^["']|["']$/g, ""); // Remove quotes
        // Always set, not just if not exists, to ensure we use .env.local values
        process.env[key] = cleanValue;
        loadedCount++;
      }
    }
  });
  console.log(`✅ Loaded ${loadedCount} environment variables from .env.local`);
} catch (e) {
  console.error("❌ Failed to load .env.local:", e);
  process.exit(1);
}

const migrationSQL = `
-- Add STRATEGY_PRINCIPAL_LOCK to TransactionType enum (only if not exists)
DO $$ BEGIN
  ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'STRATEGY_PRINCIPAL_LOCK';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
`;

async function main() {
  // Dynamically import db AFTER env vars are loaded
  const { db } = await import("../src/shared/lib/db");
  
  try {
    console.log("Adding STRATEGY_PRINCIPAL_LOCK to TransactionType enum...");
    
    // Execute the migration SQL
    await db.$executeRawUnsafe(migrationSQL);
    
    console.log("✅ Successfully added STRATEGY_PRINCIPAL_LOCK to TransactionType enum");
  } catch (error) {
    console.error("❌ Error applying migration:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();

