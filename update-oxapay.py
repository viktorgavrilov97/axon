#!/usr/bin/env python3
import re
import sys
import paramiko

HOST = "172.86.94.223"
USER = "root"
PASSWORD = "j2fY4qHA7pD8MW"
REMOTE_DIR = "/var/www/axon"
TMUX_SESSION = "axon"
APP_PORT = 3001
MERCHANT_KEY = "LLSMD8-XDTANA-PDN5H5-XLTDJV"


def safe_print(t):
    sys.stdout.buffer.write((t + "\n").encode("utf-8", errors="replace"))


def run(ssh, cmd, timeout=60):
    safe_print(f">>> {cmd[:160]}")
    _, o, e = ssh.exec_command(cmd, timeout=timeout)
    o.channel.settimeout(timeout)
    out = o.read().decode("utf-8", errors="replace")
    err = e.read().decode("utf-8", errors="replace")
    if out:
        safe_print(out)
    if err:
        safe_print(err)
    return out


def set_var(env, key, value):
    pattern = rf"^{re.escape(key)}=.*$"
    line = f'{key}="{value}"'
    if re.search(pattern, env, re.M):
        return re.sub(pattern, line, env, flags=re.M)
    return env.rstrip() + "\n" + line + "\n"


def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=20)

    _, o, _ = ssh.exec_command(f"cat {REMOTE_DIR}/.env.local")
    env = o.read().decode()
    env = set_var(env, "OXAPAY_MERCHANT_API_KEY", MERCHANT_KEY)
    # Keep existing payout key unless user provides new one

    sftp = ssh.open_sftp()
    with sftp.file(f"{REMOTE_DIR}/.env.local", "w") as f:
        f.write(env)
    sftp.close()

    run(
        ssh,
        f"tmux kill-session -t {TMUX_SESSION} 2>/dev/null || true; "
        f"tmux new-session -d -s {TMUX_SESSION} "
        f"'cd {REMOTE_DIR} && set -a && source .env.local && set +a && NODE_ENV=production npm run start -- -p {APP_PORT}'",
    )
    run(ssh, "sleep 4")
    run(ssh, "grep OXAPAY /var/www/axon/.env.local")
    run(ssh, "curl -s --max-time 10 https://ax.fund/api/oxapay/webhook")
    run(ssh, "curl -sI --max-time 10 https://ax.fund | head -3")

    ssh.close()
    safe_print("\nOxaPay merchant key updated and app restarted.")


if __name__ == "__main__":
    main()
