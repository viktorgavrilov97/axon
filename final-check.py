#!/usr/bin/env python3
import paramiko
import sys

HOST = "172.86.94.223"
USER = "root"
PASSWORD = "j2fY4qHA7pD8MW"


def safe_print(t):
    sys.stdout.buffer.write((t + "\n").encode("utf-8", errors="replace"))


def run(ssh, cmd, timeout=120):
    safe_print(f">>> {cmd[:180]}")
    _, o, e = ssh.exec_command(cmd, timeout=timeout)
    o.channel.settimeout(timeout)
    out = o.read().decode("utf-8", errors="replace")
    err = e.read().decode("utf-8", errors="replace")
    if out:
        safe_print(out)
    if err:
        safe_print(err)
    return out


def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=20)

    sftp = ssh.open_sftp()
    with sftp.open("/var/www/axon/scripts/e2e-final.sh", "r") as f:
        content = f.read().decode()
    content = content.replace("axon.mlmos1.club", "ax.fund")
    with sftp.open("/var/www/axon/scripts/e2e-final.sh", "w") as f:
        f.write(content)
    sftp.close()

    run(ssh, "BASE_URL=https://ax.fund bash /var/www/axon/scripts/e2e-final.sh", timeout=120)

    # Google OAuth redirect check
    run(
        ssh,
        'curl -sI --max-time 20 "https://ax.fund/api/auth/signin/google?callbackUrl=https%3A%2F%2Fax.fund%2Fterminal" | head -20',
    )

    # Key pages
    for path in [
        "/auth/email",
        "/wallet",
        "/strategies",
        "/api/strategies/configs",
        "/api/oxapay/webhook",
    ]:
        run(ssh, f"curl -s -o /dev/null -w '%{{http_code}}' --max-time 15 https://ax.fund{path}")

    run(ssh, "grep -E 'GOOGLE|AUTH_URL|OXAPAY_CALLBACK' /var/www/axon/.env.local")
    run(ssh, "tmux ls; ss -tlnp | grep 3001")

    ssh.close()


if __name__ == "__main__":
    main()
