import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { join } from "path";

const prisma = new PrismaClient();

async function applyMigration() {
  const migrationPath = join(
    __dirname,
    "../prisma/migrations/20250126000000_add_webhook_log_and_audit_log/migration.sql"
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
        error.code === "42P07" ||
        error.code === "23505" // Unique constraint violation
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

