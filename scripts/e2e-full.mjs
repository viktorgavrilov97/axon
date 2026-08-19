/**
 * Full server-side E2E: register -> verify OTP -> login -> wallet API
 * Run on server: set -a && source .env.local && set +a && npx tsx scripts/e2e-full.mjs
 */
import crypto from "crypto";
import { registerAction } from "../src/modules/identity/api/register.ts";
import { verifyOtpAction } from "../src/modules/identity/api/verify-otp.ts";
import { loginAction } from "../src/modules/identity/api/login.ts";
import { checkEmailAction } from "../src/modules/identity/api/check-email.ts";
import { db } from "../src/shared/lib/db.ts";

const email = `e2e_${crypto.randomBytes(4).toString("hex")}@example.com`;
const password = "TestPass123!Aa";

function form(entries) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.append(k, v);
  return fd;
}

async function step(name, fn) {
  process.stdout.write(`[${name}] `);
  const result = await fn();
  console.log(JSON.stringify(result));
  if (result?.error) throw new Error(`${name} failed: ${result.error}`);
  return result;
}

async function main() {
  // DB connectivity
  await db.$queryRaw`SELECT 1`;
  console.log("[db] connected");

  await step("check-email-new", () => checkEmailAction(email));

  const reg = await step("register", () =>
    registerAction(
      form({
        email,
        password,
        confirmPassword: password,
      })
    )
  );
  if (!reg.success) throw new Error("register did not succeed");

  const otpRow = await db.otpCode.findFirst({
    where: { email, type: "EMAIL_VERIFICATION" },
    orderBy: { createdAt: "desc" },
  });
  if (!otpRow) throw new Error("OTP not created");
  console.log(`[otp] code=${otpRow.code}`);

  const verify = await step("verify-otp", () =>
    verifyOtpAction(email, otpRow.code, "EMAIL_VERIFICATION")
  );
  if (!verify.success) throw new Error("verify failed");

  await step("check-email-existing", () => checkEmailAction(email));

  const login = await step("login", () =>
    loginAction(form({ email, password }))
  );
  if (!login.success && !login.redirectUrl) throw new Error("login failed");

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, emailVerified: true, referralCode: true },
  });
  console.log("[user]", user);

  const strategies = await db.strategyConfig.count();
  console.log(`[strategies] count=${strategies}`);

  console.log("\n=== E2E PASSED ===");
  console.log(JSON.stringify({ email, password }));
}

main()
  .catch((e) => {
    console.error("\n=== E2E FAILED ===", e.message);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
