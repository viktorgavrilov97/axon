/**
 * Check audit logs from database
 * 
 * Usage: npx tsx scripts/check-audit-logs.ts [options]
 * 
 * Options:
 *   --user-id <id>     Filter by user ID
 *   --action <action>  Filter by action type
 *   --entity <type>    Filter by entity type
 *   --limit <number>   Limit results (default: 50)
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

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface FilterOptions {
  userId?: string;
  action?: string;
  entityType?: string;
  limit?: number;
}

async function checkAuditLogs(options: FilterOptions = {}) {
  const { userId, action, entityType, limit = 50 } = options;

  console.log("📊 Checking AuditLog table...\n");

  const where: any = {};
  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (entityType) where.entityType = entityType;

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    // Note: User relation doesn't exist, but we can show userId
  });

  console.log(`Found ${logs.length} audit log entries:\n`);
  console.log("─".repeat(100));

  if (logs.length === 0) {
    console.log("No audit logs found. Try performing some actions (deposit, withdrawal, etc.)");
    return;
  }

  logs.forEach((log, i) => {
    console.log(`\n${i + 1}. ${log.action}`);
    console.log(`   Entity: ${log.entityType}${log.entityId ? ` (${log.entityId})` : ""}`);
    console.log(`   User: ${log.userId || "System"}`);
    console.log(`   Date: ${log.createdAt.toISOString()}`);
    if (log.metadata) {
      console.log(`   Metadata: ${JSON.stringify(log.metadata, null, 2).split("\n").join("\n      ")}`);
    }
    if (log.ipAddress) {
      console.log(`   IP: ${log.ipAddress}`);
    }
  });

  console.log("\n" + "─".repeat(100));
  console.log(`\nTotal: ${logs.length} entries`);

  // Group by action
  const byAction = logs.reduce((acc, log) => {
    acc[log.action] = (acc[log.action] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log("\n📈 By action type:");
  Object.entries(byAction)
    .sort(([, a], [, b]) => b - a)
    .forEach(([action, count]) => {
      console.log(`   ${action}: ${count}`);
    });
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: FilterOptions = {};

for (let i = 0; i < args.length; i += 2) {
  const key = args[i]?.replace("--", "");
  const value = args[i + 1];

  if (key === "user-id") options.userId = value;
  if (key === "action") options.action = value;
  if (key === "entity") options.entityType = value;
  if (key === "limit") options.limit = parseInt(value, 10);
}

checkAuditLogs(options)
  .catch(console.error)
  .finally(() => {
    prisma.$disconnect();
  });

