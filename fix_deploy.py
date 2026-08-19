#!/usr/bin/env python3
import paramiko
import sys

HOST = "172.86.94.223"
USER = "root"
PASSWORD = "j2fY4qHA7pD8MW"
REMOTE_DIR = "/var/www/axon"
APP_PORT = 3001
TMUX_SESSION = "axon"


def safe_print(text: str):
    sys.stdout.buffer.write(text.encode("utf-8", errors="replace") + b"\n")


def run(ssh, cmd):
    safe_print(f"\n>>> {cmd}")
    _, stdout, stderr = ssh.exec_command(cmd, get_pty=True)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    safe_print(out)
    if err:
        safe_print(err)
    return out


def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)

    run(ssh, f"cat {REMOTE_DIR}/.env.local | head -5")
    run(ssh, f"tmux capture-pane -t {TMUX_SESSION} -p | tail -40")
    run(ssh, f"ls -la {REMOTE_DIR}/.next 2>/dev/null | head -5 || echo NO_BUILD")

    fix_cmd = f"""
    cd {REMOTE_DIR} && \
    set -a && source .env.local && set +a && \
    npx prisma db push --accept-data-loss && \
    NODE_ENV=production npm run build && \
    tmux kill-session -t {TMUX_SESSION} 2>/dev/null || true && \
    tmux new-session -d -s {TMUX_SESSION} "cd {REMOTE_DIR} && set -a && source .env.local && set +a && NODE_ENV=production npm run start -- -p {APP_PORT}" && \
    sleep 5 && \
    curl -sI http://127.0.0.1:{APP_PORT} | head -8 && \
    curl -s https://axon.mlmos1.club/login | head -c 500
    """
    run(ssh, fix_cmd)
    ssh.close()


if __name__ == "__main__":
    main()
