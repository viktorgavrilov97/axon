#!/usr/bin/env python3
import paramiko
import sys

HOST = "172.86.94.223"
USER = "root"
PASSWORD = "j2fY4qHA7pD8MW"
CRON_SECRET = "9026594a63118259655ce9eca52b313a481d5a13fb065b587c28444f32cacb98"


def safe_print(t: str):
    sys.stdout.buffer.write((t + "\n").encode("utf-8", errors="replace"))


def run(ssh, cmd, timeout=120):
    safe_print(f">>> {cmd}")
    _, o, e = ssh.exec_command(cmd, timeout=timeout)
    o.channel.settimeout(timeout)
    out = o.read().decode("utf-8", errors="replace")
    err = e.read().decode("utf-8", errors="replace")
    if out:
        safe_print(out)
    if err:
        safe_print(err)


def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=20)

    run(ssh, "curl -s -o /dev/null -w '%{http_code}' -X POST https://ax.fund/api/cron/sync-deposits")
    run(
        ssh,
        f"curl -s -o /dev/null -w '%{{http_code}}' -X POST -H 'Authorization: Bearer {CRON_SECRET}' https://ax.fund/api/cron/sync-deposits",
    )
    run(
        ssh,
        "curl -s -o /dev/null -w '%{http_code}' -X POST https://ax.fund/api/oxapay/webhook -H 'Content-Type: application/json' -d '{\"type\":\"invoice\",\"track_id\":\"x\"}'",
    )
    run(
        ssh,
        f"/var/www/axon/scripts/cron-job-runner.sh sync-deposits https://ax.fund/api/cron/sync-deposits {CRON_SECRET} /var/log/axon-cron/sync-deposits.log && tail -n 8 /var/log/axon-cron/sync-deposits.log",
    )
    run(ssh, "tmux ls; ss -tlnp | grep 3001")
    ssh.close()


if __name__ == "__main__":
    main()

