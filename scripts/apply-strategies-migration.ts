// Load environment variables from .env.local BEFORE importing db
import { readFileSync } from "fs";
import { resolve } from "path";

const envPath = resolve(process.cwd(), ".env.local");
try {
  const envFile = readFileSync(envPath, "utf-8");
  envFile.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const match = trimmed.match(/^([^=:#]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        const cleanValue = value.trim().replace(/^["']|["']$/g, ""); // Remove quotes
        if (!process.env[key]) {
          process.env[key] = cleanValue;
        }
      }
    }
  });
} catch (e) {
  console.error("Failed to load .env.local:", e);
  process.exit(1);
}

// Now import db after env vars are loaded
import { db } from "../src/shared/lib/db";

const migrationSQL = `
-- CreateEnum (only if not exists)
DO $$ BEGIN
  CREATE TYPE "StrategyType" AS ENUM ('DAY', 'WEEK', 'MONTH');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "StrategyStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ProfitType" AS ENUM ('PROFIT_DAY', 'BONUS_MULTIPLIER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- AlterEnum (only if value doesn't exist)
DO $$ BEGIN
  ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'STRATEGY_PROFIT';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'STRATEGY_BONUS';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TYPE "TransactionType" ADD VALUE IF NOT EXISTS 'STRATEGY_PRINCIPAL_RETURN';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable (only if not exists)
CREATE TABLE IF NOT EXISTS "Strategy" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "StrategyType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "StrategyStatus" NOT NULL DEFAULT 'ACTIVE',
    "minPercent" DECIMAL(5,2) NOT NULL,
    "maxPercent" DECIMAL(5,2) NOT NULL,
    "appliedMultiplier" DECIMAL(5,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Strategy_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StrategyProfit" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "percent" DECIMAL(5,2) NOT NULL,
    "amount" DECIMAL(18,8) NOT NULL,
    "type" "ProfitType" NOT NULL,
    CONSTRAINT "StrategyProfit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StrategyPrincipalReturn" (
    "id" TEXT NOT NULL,
    "strategyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(18,8) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StrategyPrincipalReturn_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "StrategyConfig" (
    "id" TEXT NOT NULL,
    "type" "StrategyType" NOT NULL,
    "name" TEXT NOT NULL,
    "minAmount" DECIMAL(18,2) NOT NULL,
    "maxAmount" DECIMAL(18,2) NOT NULL,
    "minDays" INTEGER NOT NULL,
    "maxDays" INTEGER NOT NULL,
    "baseMinPercent" DECIMAL(5,2) NOT NULL,
    "baseMaxPercent" DECIMAL(5,2) NOT NULL,
    "allowMultiplier" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StrategyConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (only if not exists)
CREATE INDEX IF NOT EXISTS "Strategy_userId_idx" ON "Strategy"("userId");
CREATE INDEX IF NOT EXISTS "Strategy_status_idx" ON "Strategy"("status");
CREATE INDEX IF NOT EXISTS "Strategy_userId_status_idx" ON "Strategy"("userId", "status");
CREATE INDEX IF NOT EXISTS "Strategy_endDate_idx" ON "Strategy"("endDate");
CREATE INDEX IF NOT EXISTS "StrategyProfit_strategyId_idx" ON "StrategyProfit"("strategyId");
CREATE INDEX IF NOT EXISTS "StrategyProfit_userId_idx" ON "StrategyProfit"("userId");
CREATE INDEX IF NOT EXISTS "StrategyProfit_date_idx" ON "StrategyProfit"("date");
CREATE INDEX IF NOT EXISTS "StrategyProfit_userId_date_idx" ON "StrategyProfit"("userId", "date");
CREATE INDEX IF NOT EXISTS "StrategyPrincipalReturn_strategyId_idx" ON "StrategyPrincipalReturn"("strategyId");
CREATE INDEX IF NOT EXISTS "StrategyPrincipalReturn_userId_idx" ON "StrategyPrincipalReturn"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "StrategyConfig_type_key" ON "StrategyConfig"("type");

-- AddForeignKey (only if not exists)
DO $$ BEGIN
  ALTER TABLE "Strategy" ADD CONSTRAINT "Strategy_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "StrategyProfit" ADD CONSTRAINT "StrategyProfit_strategyId_fkey" 
    FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "StrategyPrincipalReturn" ADD CONSTRAINT "StrategyPrincipalReturn_strategyId_fkey" 
    FOREIGN KEY ("strategyId") REFERENCES "Strategy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
`;

async function main() {
  try {
    console.log("Applying strategies module migration...");
    
    // Execute the entire migration SQL as one statement
    // Prisma will handle multiple statements in one call
    try {
      await db.$executeRawUnsafe(migrationSQL);
      console.log("✅ Successfully applied strategies module migration");
    } catch (error: any) {
      // Check if it's a "already exists" error
      if (error.message?.includes('already exists') || 
          error.message?.includes('duplicate') ||
          error.code === '42P07' || // duplicate_table
          error.code === '42710' || // duplicate_object
          error.meta?.code === '42P07' ||
          error.meta?.code === '42710') {
        console.log("⚠️  Some objects already exist, but continuing...");
        // Try to execute individual safe statements
        const safeStatements = [
          `CREATE TABLE IF NOT EXISTS "Strategy" (
            "id" TEXT NOT NULL,
            "userId" TEXT NOT NULL,
            "type" "StrategyType" NOT NULL,
            "amount" DECIMAL(18,2) NOT NULL,
            "durationDays" INTEGER NOT NULL,
            "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "endDate" TIMESTAMP(3) NOT NULL,
            "status" "StrategyStatus" NOT NULL DEFAULT 'ACTIVE',
            "minPercent" DECIMAL(5,2) NOT NULL,
            "maxPercent" DECIMAL(5,2) NOT NULL,
            "appliedMultiplier" DECIMAL(5,2),
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "Strategy_pkey" PRIMARY KEY ("id")
          )`,
          `CREATE TABLE IF NOT EXISTS "StrategyProfit" (
            "id" TEXT NOT NULL,
            "strategyId" TEXT NOT NULL,
            "userId" TEXT NOT NULL,
            "date" TIMESTAMP(3) NOT NULL,
            "percent" DECIMAL(5,2) NOT NULL,
            "amount" DECIMAL(18,8) NOT NULL,
            "type" "ProfitType" NOT NULL,
            CONSTRAINT "StrategyProfit_pkey" PRIMARY KEY ("id")
          )`,
          `CREATE TABLE IF NOT EXISTS "StrategyPrincipalReturn" (
            "id" TEXT NOT NULL,
            "strategyId" TEXT NOT NULL,
            "userId" TEXT NOT NULL,
            "amount" DECIMAL(18,8) NOT NULL,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "StrategyPrincipalReturn_pkey" PRIMARY KEY ("id")
          )`,
          `CREATE TABLE IF NOT EXISTS "StrategyConfig" (
            "id" TEXT NOT NULL,
            "type" "StrategyType" NOT NULL,
            "name" TEXT NOT NULL,
            "minAmount" DECIMAL(18,2) NOT NULL,
            "maxAmount" DECIMAL(18,2) NOT NULL,
            "minDays" INTEGER NOT NULL,
            "maxDays" INTEGER NOT NULL,
            "baseMinPercent" DECIMAL(5,2) NOT NULL,
            "baseMaxPercent" DECIMAL(5,2) NOT NULL,
            "allowMultiplier" BOOLEAN NOT NULL DEFAULT false,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "StrategyConfig_pkey" PRIMARY KEY ("id")
          )`,
        ];
        
        for (const stmt of safeStatements) {
          try {
            await db.$executeRawUnsafe(stmt);
          } catch (e: any) {
            if (!e.message?.includes('already exists') && !e.message?.includes('duplicate')) {
              console.error(`Error executing statement: ${e.message}`);
            }
          }
        }
        
        // Create indexes
        const indexes = [
          `CREATE INDEX IF NOT EXISTS "Strategy_userId_idx" ON "Strategy"("userId")`,
          `CREATE INDEX IF NOT EXISTS "Strategy_status_idx" ON "Strategy"("status")`,
          `CREATE INDEX IF NOT EXISTS "Strategy_userId_status_idx" ON "Strategy"("userId", "status")`,
          `CREATE INDEX IF NOT EXISTS "Strategy_endDate_idx" ON "Strategy"("endDate")`,
          `CREATE INDEX IF NOT EXISTS "StrategyProfit_strategyId_idx" ON "StrategyProfit"("strategyId")`,
          `CREATE INDEX IF NOT EXISTS "StrategyProfit_userId_idx" ON "StrategyProfit"("userId")`,
          `CREATE INDEX IF NOT EXISTS "StrategyProfit_date_idx" ON "StrategyProfit"("date")`,
          `CREATE INDEX IF NOT EXISTS "StrategyProfit_userId_date_idx" ON "StrategyProfit"("userId", "date")`,
          `CREATE INDEX IF NOT EXISTS "StrategyPrincipalReturn_strategyId_idx" ON "StrategyPrincipalReturn"("strategyId")`,
          `CREATE INDEX IF NOT EXISTS "StrategyPrincipalReturn_userId_idx" ON "StrategyPrincipalReturn"("userId")`,
          `CREATE UNIQUE INDEX IF NOT EXISTS "StrategyConfig_type_key" ON "StrategyConfig"("type")`,
        ];
        
        for (const idx of indexes) {
          try {
            await db.$executeRawUnsafe(idx);
          } catch (e: any) {
            if (!e.message?.includes('already exists') && !e.message?.includes('duplicate')) {
              console.error(`Error creating index: ${e.message}`);
            }
          }
        }
        
        console.log("✅ Migration completed (some objects may have already existed)");
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();

