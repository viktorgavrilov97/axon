import { PrismaClient } from "@prisma/client";
import { Pool } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Try POSTGRES_PRISMA_URL first (from Neon integration), then DATABASE_URL, then POSTGRES_URL
function getConnectionString(): string {
  const connectionString =
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL;

  if (!connectionString) {
    console.error("[DB] Environment variables:", {
      POSTGRES_PRISMA_URL: !!process.env.POSTGRES_PRISMA_URL,
      DATABASE_URL: !!process.env.DATABASE_URL,
      POSTGRES_URL: !!process.env.POSTGRES_URL,
    });
    throw new Error(
      "Database connection string is not set. Please set DATABASE_URL, POSTGRES_PRISMA_URL, or POSTGRES_URL in your .env.local file."
    );
  }

  if (process.env.NODE_ENV === "development") {
    const masked = connectionString.replace(/:([^:@]+)@/, ":****@");
    console.log("[DB] Using connection string:", masked.substring(0, 50) + "...");
  }

  return connectionString;
}

function isNeonConnection(connectionString: string): boolean {
  return /neon\.tech/i.test(connectionString);
}

function createPrismaClient(): PrismaClient {
  const connectionString = getConnectionString();
  const log =
    process.env.NODE_ENV === "development" ? (["error", "warn"] as const) : (["error"] as const);

  // Neon serverless WebSocket driver only works with Neon-hosted Postgres.
  // Self-hosted / local Postgres must use the standard Prisma TCP client.
  if (isNeonConnection(connectionString)) {
    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool);
    return new PrismaClient({ adapter, log: [...log] });
  }

  return new PrismaClient({ log: [...log] });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
