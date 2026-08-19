/**
 * Test register + verify OTP via native fetch (same as browser)
 */
const BASE = process.env.BASE_URL || "https://axon.mlmos1.club";
const crypto = await import("crypto");
const email = `regfetch_${crypto.randomBytes(4).toString("hex")}@example.com`;
const password = "TestPass123!Aa";

const REGISTER_ACTION = "40ff2ea4f146b046f786f91883b364477d6cd941ae";
const VERIFY_ACTION = "708a4db2b2d684dc8a251f68b154165dade127934c";
const CHECK_EMAIL_ACTION = "40111ad307876117ae78ad3bbbb656638d7688dc16";

const jar = new Map();

function storeCookies(response) {
  const raw = response.headers.getSetCookie?.() || [];
  for (const c of raw) {
    const [pair] = c.split(";");
    const [k, v] = pair.split("=");
    if (k && v) jar.set(k.trim(), v.trim());
  }
}

function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

async function postAction(path, actionId, body, contentType) {
  const headers = {
    Accept: "text/x-component",
    "Next-Action": actionId,
    Cookie: cookieHeader(),
  };
  if (contentType) headers["Content-Type"] = contentType;

  const res = await fetch(`${BASE}${path}`, { method: "POST", headers, body });
  storeCookies(res);
  const text = await res.text();
  return { status: res.status, text };
}

console.log("Email:", email);

await fetch(`${BASE}/auth/password`, { headers: { Cookie: cookieHeader() } }).then(storeCookies);

const check = await postAction("/auth/email", CHECK_EMAIL_ACTION, JSON.stringify([email]), "text/plain;charset=UTF-8");
console.log("checkEmail:", check.text.slice(0, 200));

const form = new FormData();
form.append("email", email);
form.append("password", password);
form.append("confirmPassword", password);

const reg = await fetch(`${BASE}/auth/password`, {
  method: "POST",
  headers: {
    Accept: "text/x-component",
    "Next-Action": REGISTER_ACTION,
    Cookie: cookieHeader(),
  },
  body: form,
});
storeCookies(reg);
const regText = await reg.text();
console.log("register:", regText.slice(0, 400));

const { PrismaClient } = await import("@prisma/client");
const db = new PrismaClient();
const otpRow = await db.otpCode.findFirst({
  where: { email, type: "EMAIL_VERIFICATION" },
  orderBy: { createdAt: "desc" },
});
console.log("OTP:", otpRow?.code);
if (!otpRow) {
  await db.$disconnect();
  process.exit(1);
}

const verify = await postAction(
  `/verify-otp?type=email_verification&email=${encodeURIComponent(email)}`,
  VERIFY_ACTION,
  JSON.stringify([email, otpRow.code, "EMAIL_VERIFICATION"]),
  "text/plain;charset=UTF-8"
);
console.log("verify:", verify.text.slice(0, 400));

const sessionRes = await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: cookieHeader() } });
const session = await sessionRes.json();
console.log("session:", JSON.stringify(session));

await db.$disconnect();

if (session?.user?.email === email) {
  console.log("=== REGISTER FLOW OK ===");
} else {
  console.log("=== trying login fallback ===");
  const csrfRes = await fetch(`${BASE}/api/auth/csrf`, { headers: { Cookie: cookieHeader() } });
  storeCookies(csrfRes);
  const { csrfToken } = await csrfRes.json();
  const params = new URLSearchParams({
    csrfToken,
    email,
    password,
    callbackUrl: `${BASE}/terminal`,
  });
  const loginRes = await fetch(`${BASE}/api/auth/callback/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: cookieHeader(),
    },
    body: params,
    redirect: "manual",
  });
  storeCookies(loginRes);
  const session2 = await (await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: cookieHeader() } })).json();
  console.log("session after login:", JSON.stringify(session2));
  if (session2?.user?.email !== email) process.exit(1);
  console.log("=== REGISTER+LOGIN OK ===");
}
