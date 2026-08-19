#!/usr/bin/env python3
"""Upload and run QA money E2E on production server."""
import json
import sys
import paramiko
from pathlib import Path

HOST = "172.86.94.223"
USER = "root"
PASSWORD = "j2fY4qHA7pD8MW"
LOCAL_SCRIPT = Path(__file__).parent / "scripts" / "qa-money-e2e.mjs"
REMOTE_SCRIPT = "/var/www/axon/scripts/qa-money-e2e.mjs"
REMOTE_REPORT = "/var/www/axon/qa-money-e2e-report.json"


def safe_print(text):
    sys.stdout.buffer.write((text + "\n").encode("utf-8", errors="replace"))


def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)

    sftp = ssh.open_sftp()
    sftp.put(str(LOCAL_SCRIPT), REMOTE_SCRIPT)
    sftp.close()
    safe_print(f"Uploaded {LOCAL_SCRIPT.name}")

    cmd = (
        "cd /var/www/axon && set -a && source .env.local && set +a && "
        "npx tsx scripts/qa-money-e2e.mjs 2>&1"
    )
    safe_print("Running E2E (may take 2-3 min)...")
    _, stdout, stderr = ssh.exec_command(cmd, timeout=600)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    safe_print(out)
    if err:
        safe_print("STDERR:\n" + err)

    # Fetch report
    try:
        sftp = ssh.open_sftp()
        with sftp.open(REMOTE_REPORT, "r") as f:
            report = json.loads(f.read().decode("utf-8"))
        local_report = Path(__file__).parent / "qa-money-e2e-report.json"
        local_report.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
        safe_print(f"\nReport saved locally: {local_report}")
    except Exception as e:
        safe_print(f"Could not fetch report: {e}")

    ssh.close()


if __name__ == "__main__":
    main()
