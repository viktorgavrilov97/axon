import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const email = process.argv[2] || "deploy_test_d87ccc84@example.com";
const password = process.argv[3] || "TestPass123!Aa";

const db = new PrismaClient();

async function testDirect() {
  const user = await db.user.findUnique({ where: { email } });
  console.log("direct user:", user ? { id: user.id, emailVerified: user.emailVerified, hasHash: !!user.passwordHash } : null);
  if (user?.passwordHash) {
    const ok = await bcrypt.compare(password, user.passwordHash);
    console.log("direct bcrypt:", ok);
  }
  await db.$disconnect();
}

async function testAppDb() {
  // Dynamic import of compiled db - use tsx on source
  const { db: appDb } = await import("../src/shared/lib/db.ts");
  const user = await appDb.user.findUnique({ where: { email } });
  console.log("app db user:", user ? { id: user.id, emailVerified: user.emailVerified, hasHash: !!user.passwordHash } : null);
  if (user?.passwordHash) {
    const ok = await bcrypt.compare(password, user.passwordHash);
    console.log("app db bcrypt:", ok);
  }
  await appDb.$disconnect();
}

console.log("=== DIRECT PRISMA ===");
await testDirect().catch((e) => console.error("direct error:", e.message));

console.log("=== APP DB MODULE ===");
await testAppDb().catch((e) => console.error("app db error:", e.message));
