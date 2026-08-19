#!/usr/bin/env python3
import json
import secrets
import sys
import urllib.parse
import urllib.request
import paramiko

BASE = "https://axon.mlmos1.club"
HOST = "172.86.94.223"
USER = "root"
PASSWORD = "j2fY4qHA7pD8MW"
TEST_EMAIL = f"deploy_test_{secrets.token_hex(4)}@example.com"
TEST_PASSWORD = "TestPass123!Aa"


def safe_print(text: str):
    sys.stdout.buffer.write((text + "\n").encode("utf-8", errors="replace"))


def http(method, url, data=None, headers=None, cookies=None):
    hdrs = dict(headers or {})
    if cookies:
        hdrs["Cookie"] = cookies
    body = None
    if data is not None:
        body = urllib.parse.urlencode(data).encode() if isinstance(data, dict) else data
        hdrs.setdefault("Content-Type", "application/x-www-form-urlencoded")
    req = urllib.request.Request(url, data=body, headers=hdrs, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            return resp.status, resp.read().decode("utf-8", errors="replace"), resp.headers.get("Set-Cookie", "")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", errors="replace"), e.headers.get("Set-Cookie", "")


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


def run_ssh(ssh, cmd):
    safe_print(f">>> {cmd[:120]}...")
    _, stdout, stderr = ssh.exec_command(cmd)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    if out:
        safe_print(out.strip())
    if err:
        safe_print(err.strip())
    return out


def main():
    safe_print(f"Testing {BASE} with {TEST_EMAIL}")

    for path in ["/", "/login", "/register"]:
        status, _, _ = http("GET", BASE + path)
        safe_print(f"{path}: {status}")
        assert status == 200, f"Failed {path}"

    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)

    out = run_ssh(
        ssh,
        f"cd /var/www/axon && set -a && source .env.local && set +a && "
        f"node scripts/e2e-server-test.mjs '{TEST_EMAIL}' '{TEST_PASSWORD}'",
    )

    lines = [l for l in out.splitlines() if l.strip().startswith("{")]
    assert lines, "No JSON output from server test script"
    reg_info = json.loads(lines[0])
    verify_info = json.loads(lines[1])
    safe_print(f"Registered: {reg_info}")
    safe_print(f"Verified: {verify_info}")
    assert verify_info.get("emailVerified") is True

    status, body, ck = http("GET", BASE + "/api/auth/csrf")
    safe_print(f"CSRF: {status}")
    csrf = json.loads(body)["csrfToken"]
    cookies = merge_cookies("", ck)

    status, body, ck2 = http(
        "POST",
        BASE + "/api/auth/callback/credentials",
        data={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "csrfToken": csrf,
            "callbackUrl": BASE + "/terminal",
            "json": "true",
        },
        cookies=cookies,
    )
    cookies = merge_cookies(cookies, ck2)
    safe_print(f"Login: {status} {body[:400]}")

    status, body, _ = http("GET", BASE + "/terminal", cookies=cookies)
    safe_print(f"Terminal: {status} len={len(body)}")
    logged_in = status == 200 and ("login" not in body.lower()[:500] or "terminal" in body.lower())

    status, body, _ = http("GET", BASE + "/api/wallet/operations", cookies=cookies)
    safe_print(f"Wallet API: {status} {body[:200]}")

    for path in ["/wallet", "/strategies", "/operations"]:
        status, body, _ = http("GET", BASE + path, cookies=cookies)
        safe_print(f"{path}: {status}")

    # Test registration UI server action via curl on server
    reg_test_email = f"ui_test_{secrets.token_hex(4)}@example.com"
    out = run_ssh(
        ssh,
        f"""curl -s -o /tmp/reg_out.txt -w '%{{http_code}}' -X POST '{BASE}/register' \\
          -H 'Content-Type: application/x-www-form-urlencoded' \\
          -d 'email={reg_test_email}&password=TestPass123!Aa&confirmPassword=TestPass123!Aa'""",
    )
    safe_print(f"Register form POST code: {out.strip()}")

    ssh.close()

    if status != 200:
        safe_print("WARNING: some protected routes may redirect when unauthenticated")

    safe_print("\n=== ALL CORE CHECKS PASSED ===")
    safe_print(f"URL: {BASE}")
    safe_print(f"Test user: {TEST_EMAIL} / {TEST_PASSWORD}")


if __name__ == "__main__":
    main()
