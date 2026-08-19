#!/usr/bin/env python3
import os
import sys
import paramiko

HOST = "172.86.94.223"
USER = "root"
PASSWORD = "j2fY4qHA7pD8MW"
LOCAL_ROOT = os.path.dirname(__file__)
REMOTE_ROOT = "/var/www/axon"

FILES = [
    "src/shared/lib/cron-lock.ts",
    "src/modules/wallet/lib/oxapay.ts",
    "src/modules/wallet/lib/withdrawal-payout-service.ts",
    "src/app/api/oxapay/webhook/route.ts",
    "src/app/api/cron/run-daily-strategy-profit/route.ts",
    "src/app/api/cron/referral-payouts/route.ts",
    "src/app/api/cron/recalc-referral-levels/route.ts",
    "src/app/api/cron/sync-withdrawals/route.ts",
    "src/app/api/cron/reconcile-balances/route.ts",
    "src/app/api/cron/sync-deposits/route.ts",
    "vercel.json",
    "scripts/cron-job-runner.sh",
    "scripts/setup-production-cron.sh",
]


def safe_print(text: str):
    sys.stdout.buffer.write((text + "\n").encode("utf-8", errors="replace"))


def run(ssh: paramiko.SSHClient, cmd: str, timeout: int = 600):
    safe_print(f">>> {cmd}")
    _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    stdout.channel.settimeout(timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    if out:
        safe_print(out)
    if err:
        safe_print(err)


def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=20)
    sftp = ssh.open_sftp()

    for rel in FILES:
        local_path = os.path.join(LOCAL_ROOT, rel.replace("/", os.sep))
        remote_path = f"{REMOTE_ROOT}/{rel}"
        remote_dir = remote_path.rsplit("/", 1)[0]
        run(ssh, f"mkdir -p '{remote_dir}'", timeout=30)
        sftp.put(local_path, remote_path)
        safe_print(f"Uploaded: {rel}")

    sftp.close()

    run(ssh, "chmod +x /var/www/axon/scripts/cron-job-runner.sh /var/www/axon/scripts/setup-production-cron.sh")
    run(ssh, "cd /var/www/axon && set -a && source .env.local && set +a && NODE_ENV=production npm run build")
    run(ssh, "cd /var/www/axon && set -a && source .env.local && set +a && ./scripts/setup-production-cron.sh https://ax.fund \"$CRON_SECRET\" /var/log/axon-cron")
    run(ssh, "tmux kill-session -t axon 2>/dev/null || true; tmux new-session -d -s axon 'cd /var/www/axon && set -a && source .env.local && set +a && NODE_ENV=production npm run start -- -p 3001'")
    run(ssh, "sleep 5 && curl -sI --max-time 15 https://ax.fund | head -5")
    run(ssh, "crontab -l | grep axon/scripts/cron-job-runner.sh")

    ssh.close()
    safe_print("Done.")


if __name__ == "__main__":
    main()

