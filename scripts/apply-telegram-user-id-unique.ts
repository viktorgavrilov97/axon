// Load environment variables from .env.local BEFORE importing db
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
        // Always set, not just if not exists, to ensure we use .env.local values
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

import { PrismaClient } from "@prisma/client";
import { join } from "path";

const prisma = new PrismaClient();

async function applyMigration() {
  const migrationPath = join(
    __dirname,
    "../prisma/migrations/20250101000000_add_telegram_user_id_unique/migration.sql"
  );
  
  const sql = readFileSync(migrationPath, "utf-8");
  
  // Remove comments and split by semicolons
  const cleanedSql = sql
    .split("\n")
    .map((line) => {
      const commentIndex = line.indexOf("--");
      if (commentIndex >= 0) {
        return line.substring(0, commentIndex);
      }
      return line;
    })
    .join("\n");
  
  // Split by semicolons, but keep multi-line statements together
  const statements = cleanedSql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  
  console.log(`Applying ${statements.length} SQL statements...`);
  
  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    try {
      await prisma.$executeRawUnsafe(statement);
      console.log(`✓ [${i + 1}/${statements.length}] Applied statement`);
    } catch (error: any) {
      // Ignore "already exists" errors
      if (
        error.message?.includes("already exists") ||
        error.message?.includes("duplicate") ||
        error.code === "42P07" || // duplicate_table
        error.code === "23505" || // Unique constraint violation (if constraint already exists)
        error.code === "42710" || // duplicate_object
        error.meta?.code === "42P07" ||
        error.meta?.code === "23505" ||
        error.meta?.code === "42710"
      ) {
        console.log(`⊘ [${i + 1}/${statements.length}] Already exists, skipping`);
      } else {
        console.error(`✗ [${i + 1}/${statements.length}] Error:`, error.message);
        throw error;
      }
    }
  }
  
  console.log("✅ Migration applied successfully!");
}

applyMigration()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });

