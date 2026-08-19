#!/usr/bin/env python3
import json
import re
import sys
import urllib.parse
import urllib.request
import paramiko

HOST = "172.86.94.223"
USER = "root"
PASSWORD = "j2fY4qHA7pD8MW"
BASE = "https://ax.fund"
PASS = 0
FAIL = 0
WARN = 0


def safe_print(t):
    sys.stdout.buffer.write((t + "\n").encode("utf-8", errors="replace"))


def ok(msg):
    global PASS
    PASS += 1
    safe_print(f"OK: {msg}")


def fail(msg):
    global FAIL
    FAIL += 1
    safe_print(f"FAIL: {msg}")


def warn(msg):
    global WARN
    WARN += 1
    safe_print(f"WARN: {msg}")


def http(method, url, data=None, headers=None, cookies=None, follow=False):
    hdrs = dict(headers or {})
    if cookies:
        hdrs["Cookie"] = cookies
    body = None
    if data is not None:
        body = urllib.parse.urlencode(data).encode() if isinstance(data, dict) else data
        hdrs.setdefault("Content-Type", "application/x-www-form-urlencoded")
    req = urllib.request.Request(url, data=body, headers=hdrs, method=method)
    if not follow:
        class NoRedirect(urllib.request.HTTPRedirectHandler):
            def redirect_request(self, req, fp, code, msg, headers, newurl):
                return None
        opener = urllib.request.build_opener(NoRedirect)
    else:
        opener = urllib.request.build_opener()
    try:
        resp = opener.open(req, timeout=30)
        return resp.status, dict(resp.headers), resp.read().decode("utf-8", errors="replace"), resp.headers.get("Set-Cookie", "")
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read().decode("utf-8", errors="replace"), e.headers.get("Set-Cookie", "")
    except Exception as e:
        return 0, {}, str(e), ""


def merge_cookies(existing, new):
    jar = {}
    for part in (existing or "").split(";"):
        part = part.strip()
        if "=" in part:
            k, v = part.split("=", 1)
            jar[k.strip()] = v.strip()
    for chunk in (new or "").split(","):
        chunk = chunk.strip()
        if "=" in chunk:
            kv = chunk.split(";")[0]
            k, v = kv.split("=", 1)
            jar[k.strip()] = v.strip()
    return "; ".join(f"{k}={v}" for k, v in jar.items())


def test_public_pages():
    safe_print("\n=== Public pages ===")
    for path in ["/", "/auth/email", "/auth/password", "/register", "/login", "/privacy"]:
        code, _, _, _ = http("GET", BASE + path)
        if code == 200:
            ok(f"{path} ({code})")
        else:
            fail(f"{path} ({code})")


def test_google_oauth():
    safe_print("\n=== Google OAuth ===")
    code, _, body, ck = http("GET", BASE + "/api/auth/csrf")
    if code != 200:
        fail(f"csrf ({code})")
        return
    ok("csrf endpoint")
    try:
        csrf = json.loads(body)["csrfToken"]
    except Exception:
        fail("csrf parse")
        return

    cookies = merge_cookies("", ck)
    code, hdrs, body, ck2 = http(
        "POST",
        BASE + "/api/auth/signin/google",
        data={"csrfToken": csrf, "callbackUrl": BASE + "/terminal"},
        cookies=cookies,
    )
    cookies = merge_cookies(cookies, ck2)
    location = hdrs.get("Location") or hdrs.get("location") or ""
    if not location and code in (301, 302, 303, 307, 308):
        location = hdrs.get("location", "")

    safe_print(f"  signin/google HTTP {code}")
    if location:
        safe_print(f"  Location: {location[:200]}...")

    if "accounts.google.com" in location:
        ok("redirects to Google")
        parsed = urllib.parse.urlparse(location)
        qs = urllib.parse.parse_qs(parsed.query)
        redirect_uri = qs.get("redirect_uri", [""])[0]
        client_id = qs.get("client_id", [""])[0]
        safe_print(f"  redirect_uri: {redirect_uri}")
        safe_print(f"  client_id: {client_id[:50]}...")

        expected_uri = BASE + "/api/auth/callback/google"
        expected_client = "919342237082-1n84uidl41dblbfduhgju64i1e385gd7.apps.googleusercontent.com"

        if redirect_uri == expected_uri:
            ok("redirect_uri correct")
        else:
            fail(f"redirect_uri mismatch: got {redirect_uri}")

        if client_id == expected_client:
            ok("client_id correct")
        else:
            warn(f"client_id: {client_id}")

        if "error=" in location or "redirect_uri_mismatch" in body:
            fail("Google error in redirect")
    elif "error=" in location or "error=" in body:
        fail(f"OAuth error: {location or body[:200]}")
    else:
        fail(f"no Google redirect (HTTP {code}, location={location[:100]})")


def test_auth_flow():
    safe_print("\n=== Email login flow ===")
    import secrets
    email = f"verify_{secrets.token_hex(4)}@example.com"
    password = "TestPass123!Aa"

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=20)

    script = f"""
cd /var/www/axon && set -a && source .env.local && set +a && node -e "
const {{PrismaClient}}=require('@prisma/client');
const bcrypt=require('bcryptjs');
const db=new PrismaClient();
(async()=>{{
  const email='{email}';
  const hash=await bcrypt.hash('{password}',12);
  const ref='V'+Math.random().toString(36).slice(2,8).toUpperCase();
  await db.user.create({{data:{{email,passwordHash:hash,referralCode:ref,emailVerified:new Date(),displayName:'Verify',hasCompletedOnboarding:true}}}});
  console.log('created');
  await db.\\$disconnect();
}})();
"
"""
    _, o, e = ssh.exec_command(script, timeout=30)
    out = o.read().decode()
    if "created" in out:
        ok(f"test user {email}")
    else:
        fail(f"create user: {out} {e.read().decode()}")
        ssh.close()
        return

    code, _, body, ck = http("GET", BASE + "/api/auth/csrf")
    csrf = json.loads(body)["csrfToken"]
    cookies = merge_cookies("", ck)
    code, _, body, ck2 = http(
        "POST",
        BASE + "/api/auth/callback/credentials",
        data={"csrfToken": csrf, "email": email, "password": password, "callbackUrl": BASE + "/terminal", "json": "true"},
        cookies=cookies,
    )
    cookies = merge_cookies(cookies, ck2)
    code, _, body, _ = http("GET", BASE + "/api/auth/session", cookies=cookies)
    if email in body:
        ok("login session")
    else:
        fail(f"session: {body}")

    code, _, body, _ = http("GET", BASE + "/api/wallet/operations", cookies=cookies)
    if '"items"' in body:
        ok("wallet API")
    else:
        fail(f"wallet: {body}")

    code, _, body, _ = http("GET", BASE + "/api/strategies/configs", cookies=cookies)
    if "DAY" in body or "WEEK" in body or '"name"' in body:
        ok("strategies API")
    else:
        fail(f"strategies: {body[:200]}")

    for path in ["/terminal", "/wallet", "/strategies", "/operations", "/affiliate", "/yield"]:
        code, _, _, _ = http("GET", BASE + path, cookies=cookies, follow=True)
        if code == 200:
            ok(f"{path} ({code})")
        else:
            fail(f"{path} ({code})")

    ssh.close()


def test_oxapay():
    safe_print("\n=== OxaPay ===")
    code, _, body, _ = http("GET", BASE + "/api/oxapay/webhook")
    if code == 200 and "active" in body:
        ok("webhook endpoint active")
    else:
        fail(f"webhook: {code} {body[:100]}")

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=20)
    _, o, _ = ssh.exec_command("grep OXAPAY /var/www/axon/.env.local")
    env = o.read().decode()
    if "OXAPAY_CALLBACK_URL=https://ax.fund/api/oxapay/webhook" in env.replace('"', ""):
        ok("callback URL in env")
    else:
        warn("check OXAPAY_CALLBACK_URL in env")
    if "OXAPAY_MERCHANT_API_KEY" in env and "MIJ2F8" in env:
        ok("merchant key configured")
    else:
        warn("merchant key may be missing")
    ssh.close()


def test_server():
    safe_print("\n=== Server ===")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=20)
    _, o, _ = ssh.exec_command("tmux ls 2>/dev/null; ss -tlnp | grep 3001")
    out = o.read().decode()
    if "axon" in out and "3001" in out:
        ok("tmux axon + port 3001")
    else:
        fail(f"server process: {out}")
    _, o, _ = ssh.exec_command("curl -sI --max-time 10 https://ax.fund | head -3")
    if "200" in o.read().decode():
        ok("https ax.fund")
    else:
        fail("https")
    ssh.close()


def main():
    safe_print(f"Verification: {BASE}")
    test_server()
    test_public_pages()
    test_google_oauth()
    test_auth_flow()
    test_oxapay()
    safe_print(f"\n{'='*50}")
    safe_print(f"PASSED: {PASS}  FAILED: {FAIL}  WARNINGS: {WARN}")
    safe_print(f"{'='*50}")
    if FAIL > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
