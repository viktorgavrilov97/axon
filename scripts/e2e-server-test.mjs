import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const email = process.argv[2];
const password = process.argv[3];
if (!email || !password) {
  console.error("Usage: node e2e-server-test.mjs <email> <password>");
  process.exit(1);
}

const db = new PrismaClient();

async function main() {
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    await db.otpCode.deleteMany({ where: { email } });
    await db.user.delete({ where: { email } });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const referralCode = "T" + Math.random().toString(36).slice(2, 8).toUpperCase();

  const user = await db.user.create({
    data: { email, passwordHash, referralCode },
  });

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await db.otpCode.create({
    data: {
      email,
      code,
      type: "EMAIL_VERIFICATION",
      userId: user.id,
      expiresAt,
    },
  });

  console.log(JSON.stringify({ step: "registered", userId: user.id, code }));

  const otp = await db.otpCode.findFirst({
    where: { email, type: "EMAIL_VERIFICATION" },
    orderBy: { createdAt: "desc" },
  });

  if (!otp || otp.code !== code) {
    throw new Error("OTP not found");
  }

  await db.user.update({
    where: { id: user.id },
    data: { emailVerified: new Date() },
  });
  await db.otpCode.delete({ where: { id: otp.id } });

  const verified = await db.user.findUnique({ where: { email } });
  console.log(
    JSON.stringify({
      step: "verified",
      userId: verified.id,
      emailVerified: !!verified.emailVerified,
    })
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
