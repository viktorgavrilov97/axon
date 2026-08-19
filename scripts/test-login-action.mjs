const BASE = "https://axon.mlmos1.club";
const LOGIN_ACTION = "40297de2bfa345dc7efb76c482c441fe85e262042a";
const email = "httpe2e_acdb57c0@example.com";
const password = "TestPass123!Aa";

const jar = new Map();
function storeCookies(r) {
  for (const c of r.headers.getSetCookie?.() || []) {
    const [pair] = c.split(";");
    const [k, v] = pair.split("=");
    if (k && v) jar.set(k.trim(), v.trim());
  }
}
const cookieHeader = () => [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");

await fetch(`${BASE}/auth/password`).then(storeCookies);

const form = new FormData();
form.append("email", email);
form.append("password", password);

const res = await fetch(`${BASE}/auth/password`, {
  method: "POST",
  headers: { Accept: "text/x-component", "Next-Action": LOGIN_ACTION, Cookie: cookieHeader() },
  body: form,
});
storeCookies(res);
console.log("login action:", (await res.text()).slice(0, 500));
const session = await (await fetch(`${BASE}/api/auth/session`, { headers: { Cookie: cookieHeader() } })).json();
console.log("session:", session);
