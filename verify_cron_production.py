#!/usr/bin/env python3
"""Production cron verification for Axon (runtime evidence only)."""
import json
import sys
import time
import paramiko
from datetime import datetime

HOST = "172.86.94.223"
USER = "root"
PASSWORD = "j2fY4qHA7pD8MW"
CRON_SECRET = "9026594a63118259655ce9eca52b313a481d5a13fb065b587c28444f32cacb98"
BASE = "https://ax.fund"
LOG_DIR = "/var/log/axon-cron"

CRONS = [
    ("run-daily-strategy-profit", f"{BASE}/api/cron/run-daily-strategy-profit"),
    ("referral-payouts", f"{BASE}/api/cron/referral-payouts"),
    ("sync-withdrawals", f"{BASE}/api/cron/sync-withdrawals"),
    ("reconcile-balances", f"{BASE}/api/cron/reconcile-balances"),
    ("sync-deposits", f"{BASE}/api/cron/sync-deposits"),
]


def safe_print(text: str):
    sys.stdout.buffer.write((text + "\n").encode("utf-8", errors="replace"))


def run(ssh, cmd, timeout=120):
    _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    stdout.channel.settimeout(timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    return out, err


def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=20)

    results = {}

    # 1. crontab
    safe_print("=" * 60)
    safe_print("1. PRODUCTION CRONTAB")
    safe_print("=" * 60)
    out, _ = run(ssh, "crontab -l")
    safe_print(out)
    results["crontab"] = out

    # 2. Log files status
    safe_print("\n" + "=" * 60)
    safe_print("2. LOG FILES STATUS")
    safe_print("=" * 60)
    out, _ = run(ssh, f"ls -la {LOG_DIR} 2>/dev/null; for f in {LOG_DIR}/*.log; do echo '---'; echo \"FILE: $f\"; tail -n 15 \"$f\" 2>/dev/null; done")
    safe_print(out)
    results["logs"] = out

    # 3. Manual runtime tests
    safe_print("\n" + "=" * 60)
    safe_print("3. MANUAL RUNTIME TESTS")
    safe_print("=" * 60)
    manual = {}
    for name, url in CRONS:
        safe_print(f"\n--- {name} ---")
        cmd = (
            f"curl -sS -w '\\nHTTP_CODE:%{{http_code}}\\n' -m 90 "
            f"-X POST -H 'Authorization: Bearer {CRON_SECRET}' '{url}'"
        )
        out, err = run(ssh, cmd, timeout=120)
        safe_print("REQUEST: POST " + url)
        safe_print("RESPONSE:\n" + out)
        if err:
            safe_print("STDERR:\n" + err)
        log_tail, _ = run(ssh, f"tail -n 8 {LOG_DIR}/{name}.log 2>/dev/null || echo 'no log'")
        safe_print("LOG TAIL:\n" + log_tail)
        manual[name] = {"response": out, "log_tail": log_tail}
    results["manual"] = manual

    # DB impact snapshot
    safe_print("\n" + "=" * 60)
    safe_print("DB IMPACT SNAPSHOT")
    safe_print("=" * 60)
    db_cmd = (
        "cd /var/www/axon && set -a && source .env.local && set +a && "
        "node -e \"const {PrismaClient}=require('@prisma/client');"
        "const db=new PrismaClient();"
        "(async()=>{"
        "const [users,strategies,withdrawals,deposits,referralPayouts,webhookLogs]=await Promise.all(["
        "db.user.count(),"
        "db.strategy.count({where:{status:'ACTIVE'}}),"
        "db.withdrawal.count({where:{status:{in:['PENDING','APPROVED','PROCESSING']}}}),"
        "db.deposit.count({where:{status:'paying'}}),"
        "db.referralPayout.count(),"
        "db.webhookLog.count({where:{processed:true}}),"
        "]);"
        "console.log(JSON.stringify({users,strategies,activeWithdrawals:withdrawals,payingDeposits:deposits,referralPayouts,processedWebhooks:webhookLogs},null,2));"
        "await db.$disconnect();"
        "})().catch(e=>{console.error(e);process.exit(1);});\""
    )
    out, err = run(ssh, db_cmd, timeout=60)
    safe_print(out or err)
    results["db"] = out or err

    # 4. Double execution test
    safe_print("\n" + "=" * 60)
    safe_print("4. DOUBLE EXECUTION TEST (run-daily-strategy-profit x2 parallel)")
    safe_print("=" * 60)
    double_cmd = (
        f"bash -c '"
        f"curl -sS -w \"\\nHTTP:%{{http_code}}\\n\" -m 90 -X POST "
        f"-H \"Authorization: Bearer {CRON_SECRET}\" "
        f"\"{BASE}/api/cron/run-daily-strategy-profit\" > /tmp/cron-a.out 2>&1 & "
        f"curl -sS -w \"\\nHTTP:%{{http_code}}\\n\" -m 90 -X POST "
        f"-H \"Authorization: Bearer {CRON_SECRET}\" "
        f"\"{BASE}/api/cron/run-daily-strategy-profit\" > /tmp/cron-b.out 2>&1 & "
        f"wait; echo \"=== A ===\"; cat /tmp/cron-a.out; echo \"=== B ===\"; cat /tmp/cron-b.out'"
    )
    out, err = run(ssh, double_cmd, timeout=120)
    safe_print(out)
    if err:
        safe_print(err)
    results["double"] = out

    # 5. Failover test - unauthorized request
    safe_print("\n" + "=" * 60)
    safe_print("5. FAILOVER / AUTH TEST")
    safe_print("=" * 60)
    out, _ = run(ssh, f"curl -sS -w '\\nHTTP:%{{http_code}}\\n' -m 30 -X POST '{BASE}/api/cron/sync-deposits'")
    safe_print("Unauthorized request (expect 401):\n" + out)
    out2, _ = run(ssh, f"curl -sS -w '\\nHTTP:%{{http_code}}\\n' -m 30 -X POST -H 'Authorization: Bearer wrong-secret' '{BASE}/api/cron/sync-deposits'")
    safe_print("Wrong secret (expect 401):\n" + out2)
    results["failover"] = {"no_auth": out, "wrong_auth": out2}

    # 6. Runner script test
    safe_print("\n" + "=" * 60)
    safe_print("6. CRON RUNNER SCRIPT TEST")
    safe_print("=" * 60)
    out, _ = run(
        ssh,
        f"/var/www/axon/scripts/cron-job-runner.sh sync-deposits \"{BASE}/api/cron/sync-deposits\" \"{CRON_SECRET}\" {LOG_DIR}/sync-deposits-manual-test.log && tail -n 10 {LOG_DIR}/sync-deposits-manual-test.log",
        timeout=120,
    )
    safe_print(out)
    results["runner"] = out

    # tmux / app status
    safe_print("\n" + "=" * 60)
    safe_print("APP STATUS")
    safe_print("=" * 60)
    out, _ = run(ssh, "tmux ls 2>/dev/null; ss -tlnp | grep 3001; curl -sI --max-time 10 https://ax.fund/api/cron/sync-deposits | head -5")
    safe_print(out)

    ssh.close()

    # Write report file
    with open("cron_verification_report.json", "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    safe_print("\nSaved: cron_verification_report.json")


if __name__ == "__main__":
    main()
