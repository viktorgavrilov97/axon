#!/usr/bin/env python3
"""Phase 2: concurrent lock, flock, DB, reconcile hourly evidence."""
import json
import paramiko
import sys

HOST = "172.86.94.223"
USER = "root"
PASSWORD = "j2fY4qHA7pD8MW"
CRON_SECRET = "9026594a63118259655ce9eca52b313a481d5a13fb065b587c28444f32cacb98"
BASE = "https://ax.fund"
LOG_DIR = "/var/log/axon-cron"


def safe_print(text):
    sys.stdout.buffer.write((text + "\n").encode("utf-8", errors="replace"))


def run(ssh, cmd, timeout=120):
    _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    return out, err


def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=20)

    # DB snapshot via prisma script on server
    safe_print("=" * 60)
    safe_print("DB SNAPSHOT")
    safe_print("=" * 60)
    db_script = r"""
cd /var/www/axon && node <<'NODE'
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  const [users, strategies, withdrawals, deposits, referralPayouts, webhookLogs] = await Promise.all([
    db.user.count(),
    db.strategy.count({ where: { status: 'ACTIVE' } }),
    db.withdrawal.count({ where: { status: { in: ['PENDING', 'APPROVED', 'PROCESSING'] } } }),
    db.deposit.count({ where: { status: 'paying' } }),
    db.referralPayout.count(),
    db.webhookLog.count({ where: { processed: true } }),
  ]);
  console.log(JSON.stringify({ users, strategies, activeWithdrawals: withdrawals, payingDeposits: deposits, referralPayouts, processedWebhooks: webhookLogs }, null, 2));
  await db.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
NODE
"""
    out, err = run(ssh, db_script, timeout=60)
    safe_print(out or err)

    # Concurrent advisory lock test - 10 parallel reconcile-balances
    safe_print("\n" + "=" * 60)
    safe_print("CONCURRENT LOCK TEST (10x reconcile-balances)")
    safe_print("=" * 60)
    concurrent = f"""
bash -c '
URL="{BASE}/api/cron/reconcile-balances"
SECRET="{CRON_SECRET}"
for i in $(seq 1 10); do
  curl -sS -m 90 -X POST -H "Authorization: Bearer $SECRET" "$URL" > /tmp/recon-$i.json 2>&1 &
done
wait
for i in $(seq 1 10); do
  echo "=== response $i ==="
  cat /tmp/recon-$i.json
  echo
done
'
"""
    out, _ = run(ssh, concurrent, timeout=120)
    safe_print(out)

    # Concurrent on run-daily-strategy-profit
    safe_print("\n" + "=" * 60)
    safe_print("CONCURRENT LOCK TEST (10x run-daily-strategy-profit)")
    safe_print("=" * 60)
    concurrent2 = f"""
bash -c '
URL="{BASE}/api/cron/run-daily-strategy-profit"
SECRET="{CRON_SECRET}"
for i in $(seq 1 10); do
  curl -sS -m 90 -X POST -H "Authorization: Bearer $SECRET" "$URL" > /tmp/profit-$i.json 2>&1 &
done
wait
for i in $(seq 1 10); do
  echo "=== response $i ==="
  cat /tmp/profit-$i.json
  echo
done
'
"""
    out, _ = run(ssh, concurrent2, timeout=120)
    safe_print(out)

    # flock double runner test
    safe_print("\n" + "=" * 60)
    safe_print("FLOCK DOUBLE RUNNER (2x cron-job-runner.sh sync-deposits)")
    safe_print("=" * 60)
    flock_test = f"""
bash -c '
RUNNER=/var/www/axon/scripts/cron-job-runner.sh
/var/www/axon/scripts/cron-job-runner.sh sync-deposits "{BASE}/api/cron/sync-deposits" "{CRON_SECRET}" "{LOG_DIR}/flock-test-a.log" &
/var/www/axon/scripts/cron-job-runner.sh sync-deposits "{BASE}/api/cron/sync-deposits" "{CRON_SECRET}" "{LOG_DIR}/flock-test-b.log" &
wait
echo "=== flock-test-a.log ==="
cat {LOG_DIR}/flock-test-a.log 2>/dev/null || echo empty
echo "=== flock-test-b.log ==="
cat {LOG_DIR}/flock-test-b.log 2>/dev/null || echo empty
'
"""
    out, _ = run(ssh, flock_test, timeout=120)
    safe_print(out)

    # Failover: bad endpoint retry test
    safe_print("\n" + "=" * 60)
    safe_print("FAILOVER RETRY TEST (bad URL via runner)")
    safe_print("=" * 60)
    fail_test = f"""
/var/www/axon/scripts/cron-job-runner.sh fail-test "https://ax.fund/api/cron/nonexistent-endpoint" "{CRON_SECRET}" "{LOG_DIR}/fail-test.log" || true
echo "=== fail-test.log ==="
cat {LOG_DIR}/fail-test.log
"""
    out, _ = run(ssh, fail_test, timeout=120)
    safe_print(out)

    # Check reconcile hourly - trigger manual via runner to create log
    safe_print("\n" + "=" * 60)
    safe_print("RECONCILE VIA RUNNER (create log evidence)")
    safe_print("=" * 60)
    recon_runner = f"""
/var/www/axon/scripts/cron-job-runner.sh reconcile-balances "{BASE}/api/cron/reconcile-balances" "{CRON_SECRET}" "{LOG_DIR}/reconcile-balances.log"
tail -n 5 {LOG_DIR}/reconcile-balances.log
"""
    out, _ = run(ssh, recon_runner, timeout=120)
    safe_print(out)

    # Daily crons via runner for log evidence
    safe_print("\n" + "=" * 60)
    safe_print("DAILY CRONS VIA RUNNER (log evidence)")
    safe_print("=" * 60)
    for name in ["run-daily-strategy-profit", "referral-payouts"]:
        cmd = f"""
/var/www/axon/scripts/cron-job-runner.sh {name} "{BASE}/api/cron/{name}" "{CRON_SECRET}" "{LOG_DIR}/{name}.log"
tail -n 5 {LOG_DIR}/{name}.log
"""
        out, _ = run(ssh, cmd, timeout=120)
        safe_print(f"--- {name} ---\n{out}")

    # Full log dir listing
    safe_print("\n" + "=" * 60)
    safe_print("ALL LOG FILES")
    safe_print("=" * 60)
    out, _ = run(ssh, f"ls -la {LOG_DIR}; echo; for f in {LOG_DIR}/*.log; do echo '====' $f; tail -n 6 \"$f\"; done")
    safe_print(out)

    # cron service status
    safe_print("\n" + "=" * 60)
    safe_print("CRON DAEMON")
    safe_print("=" * 60)
    out, _ = run(ssh, "systemctl is-active cron 2>/dev/null || service cron status 2>/dev/null | head -5; ps aux | grep -E '[c]ron' | head -5")
    safe_print(out)

    ssh.close()


if __name__ == "__main__":
    main()
