#!/usr/bin/env python3
"""Upload changed files, rebuild and restart axon on server."""
import sys
import paramiko

HOST = "172.86.94.223"
USER = "root"
PASSWORD = "j2fY4qHA7pD8MW"
REMOTE_DIR = "/var/www/axon"
APP_PORT = 3001
TMUX_SESSION = "axon"

FILES = [
    "src/shared/lib/db.ts",
    "scripts/e2e-full.mjs",
    "scripts/e2e-auth-curl.sh",
    "scripts/server-diag.mjs",
]


def safe_print(text: str):
    sys.stdout.buffer.write((text + "\n").encode("utf-8", errors="replace"))


def run(ssh, cmd, timeout=600):
    safe_print(f">>> {cmd[:200]}")
    _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    stdout.channel.settimeout(timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
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

    for rel in FILES:
        local = f"axon-development/{rel}"
        remote = f"{REMOTE_DIR}/{rel}"
        safe_print(f"Upload {rel}")
        sftp.put(local, remote)

    sftp.close()

    run(
        ssh,
        f"cd {REMOTE_DIR} && set -a && source .env.local && set +a && "
        f"NODE_ENV=production npm run build",
        timeout=600,
    )

    run(
        ssh,
        f"tmux kill-session -t {TMUX_SESSION} 2>/dev/null || true; "
        f"tmux new-session -d -s {TMUX_SESSION} "
        f"'cd {REMOTE_DIR} && set -a && source .env.local && set +a && NODE_ENV=production npm run start -- -p {APP_PORT}'",
    )

    run(ssh, "sleep 4 && curl -sI --max-time 10 http://127.0.0.1:3001 | head -3")

    run(
        ssh,
        f"cd {REMOTE_DIR} && set -a && source .env.local && set +a && npx tsx scripts/e2e-full.mjs",
        timeout=120,
    )

    run(
        ssh,
        f"bash {REMOTE_DIR}/scripts/e2e-auth-curl.sh https://axon.mlmos1.club "
        f"$(cd {REMOTE_DIR} && set -a && source .env.local && set +a && npx tsx -e \""
        f"import crypto from 'crypto'; console.log('e2e_'+crypto.randomBytes(4).toString('hex')+'@example.com')\" 2>/dev/null | tail -1) "
        f"TestPass123!Aa 2>/dev/null || true",
        timeout=60,
    )

    ssh.close()
    safe_print("Done")


if __name__ == "__main__":
    main()
