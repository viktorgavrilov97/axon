#!/usr/bin/env python3
import paramiko
import sys

HOST = "172.86.94.223"
USER = "root"
PASSWORD = "j2fY4qHA7pD8MW"
SECRET = "9026594a63118259655ce9eca52b313a481d5a13fb065b587c28444f32cacb98"
BASE = "https://ax.fund"


def safe_print(text):
    sys.stdout.buffer.write((text + "\n").encode("utf-8", errors="replace"))


def run(ssh, cmd, timeout=60):
    _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    return stdout.read().decode("utf-8", errors="replace") + stderr.read().decode("utf-8", errors="replace")


def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=20)

    safe_print("=== DB SNAPSHOT ===")
    db_cmd = """cd /var/www/axon && set -a && . ./.env.local && set +a && node <<'NODE'
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  const users = await db.user.count();
  const strategies = await db.strategy.count({ where: { status: 'ACTIVE' } });
  const withdrawals = await db.withdrawal.count({ where: { status: { in: ['PENDING', 'APPROVED', 'PROCESSING'] } } });
  const deposits = await db.deposit.count({ where: { status: 'paying' } });
  const referralPayouts = await db.referralPayout.count();
  console.log(JSON.stringify({ users, activeStrategies: strategies, pendingWithdrawals: withdrawals, payingDeposits: deposits, referralPayouts }, null, 2));
  await db.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
NODE"""
    safe_print(run(ssh, db_cmd, 60))

    for name in ["run-daily-strategy-profit", "reconcile-balances"]:
        safe_print(f"\n=== SINGLE {name} ===")
        safe_print(run(ssh, f"curl -sS -m 90 -X POST -H 'Authorization: Bearer {SECRET}' {BASE}/api/cron/{name}"))

    safe_print("\n=== LATEST SCHEDULED CRON LOGS ===")
    safe_print(run(ssh, "tail -n 6 /var/log/axon-cron/sync-deposits.log; echo '---'; tail -n 6 /var/log/axon-cron/sync-withdrawals.log"))

    ssh.close()


if __name__ == "__main__":
    main()
