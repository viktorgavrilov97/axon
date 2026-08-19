#!/usr/bin/env python3
"""Update Google OAuth creds, restart axon, run full tests."""
import re
import sys
import paramiko

HOST = "172.86.94.223"
USER = "root"
PASSWORD = "j2fY4qHA7pD8MW"
REMOTE_DIR = "/var/www/axon"
APP_PORT = 3001
TMUX_SESSION = "axon"
BASE = "https://ax.fund"

GOOGLE_CLIENT_ID = "919342237082-1n84uidl41dblbfduhgju64i1e385gd7.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET = "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"


def safe_print(t):
    sys.stdout.buffer.write((t + "\n").encode("utf-8", errors="replace"))


def run(ssh, cmd, timeout=180):
    safe_print(f">>> {cmd[:200]}")
    _, o, e = ssh.exec_command(cmd, timeout=timeout)
    o.channel.settimeout(timeout)
    out = o.read().decode("utf-8", errors="replace")
    err = e.read().decode("utf-8", errors="replace")
    if out:
        safe_print(out)
    if err:
        safe_print(err)
    return out


def update_env(env: str) -> str:
    def set_var(text, key, value):
        pattern = rf"^{re.escape(key)}=.*$"
        line = f'{key}="{value}"'
        if re.search(pattern, text, re.M):
            return re.sub(pattern, line, text, flags=re.M)
        return text.rstrip() + "\n" + line + "\n"

    env = set_var(env, "GOOGLE_CLIENT_ID", GOOGLE_CLIENT_ID)
    env = set_var(env, "GOOGLE_CLIENT_SECRET", GOOGLE_CLIENT_SECRET)
    env = set_var(env, "AUTH_URL", "https://ax.fund")
    env = set_var(env, "NEXT_PUBLIC_APP_URL", "https://ax.fund")
    env = set_var(env, "OXAPAY_CALLBACK_URL", "https://ax.fund/api/oxapay/webhook")
    return env


def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=20)

    _, o, _ = ssh.exec_command(f"cat {REMOTE_DIR}/.env.local")
    env = update_env(o.read().decode())

    sftp = ssh.open_sftp()
    with sftp.file(f"{REMOTE_DIR}/.env.local", "w") as f:
        f.write(env)
    sftp.close()
    safe_print("Updated .env.local with new Google credentials")

    run(
        ssh,
        f"tmux kill-session -t {TMUX_SESSION} 2>/dev/null || true; "
        f"tmux new-session -d -s {TMUX_SESSION} "
        f"'cd {REMOTE_DIR} && set -a && source .env.local && set +a && NODE_ENV=production npm run start -- -p {APP_PORT}'",
    )

    run(ssh, "sleep 5")
    run(ssh, f"curl -sI --max-time 15 {BASE} | head -6")
    run(ssh, f"curl -s --max-time 10 {BASE}/api/auth/csrf")
    run(ssh, f"curl -s --max-time 10 {BASE}/api/oxapay/webhook")
    run(ssh, f"curl -sI --max-time 15 '{BASE}/api/auth/signin/google' | head -15")
    run(ssh, f"grep GOOGLE_CLIENT_ID {REMOTE_DIR}/.env.local")
    run(ssh, f"bash {REMOTE_DIR}/scripts/e2e-final.sh", timeout=120)

    ssh.close()
    safe_print("\n=== UPDATE AND TEST COMPLETE ===")


if __name__ == "__main__":
    main()
