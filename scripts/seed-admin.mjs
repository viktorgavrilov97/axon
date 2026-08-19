/**
 * Seed admin account (idempotent).
 * Email: admin@ax.fund / Fgtkmcby123
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const ADMIN_EMAIL = "admin@ax.fund";
const ADMIN_PASSWORD = "Fgtkmcby123";

async function main() {
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
  const existing = await db.user.findUnique({ where: { email: ADMIN_EMAIL } });

  if (existing) {
    await db.user.update({
      where: { email: ADMIN_EMAIL },
      data: { passwordHash, role: "ADMIN" },
    });
    console.log(`Admin updated: ${ADMIN_EMAIL}`);
  } else {
    await db.user.create({
      data: {
        email: ADMIN_EMAIL,
        passwordHash,
        name: "Admin",
        displayName: "Admin",
        role: "ADMIN",
        emailVerified: new Date(),
        hasCompletedOnboarding: true,
      },
    });
    console.log(`Admin created: ${ADMIN_EMAIL}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
