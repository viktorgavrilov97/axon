#!/usr/bin/env python3
import paramiko, sys
HOST, USER, PASSWORD = "172.86.94.223", "root", "j2fY4qHA7pD8MW"
SECRET = "9026594a63118259655ce9eca52b313a481d5a13fb065b587c28444f32cacb98"

def p(t): sys.stdout.buffer.write((t+"\n").encode("utf-8","replace"))
def run(ssh,cmd,t=60):
    _,o,e=ssh.exec_command(cmd,timeout=t)
    return o.read().decode("utf-8","replace")+e.read().decode("utf-8","replace")

ssh=paramiko.SSHClient(); ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy()); ssh.connect(HOST,username=USER,password=PASSWORD,timeout=20)

p("=== PG ADVISORY LOCKS ===")
p(run(ssh, """cd /var/www/axon && set -a && . ./.env.local && set +a && psql "$DATABASE_URL" -At -c "SELECT l.pid, l.granted, l.objid::text, a.state, a.query_start::text FROM pg_locks l JOIN pg_stat_activity a ON a.pid = l.pid WHERE l.locktype = 'advisory' ORDER BY l.granted DESC;" 2>&1 || echo 'psql not available'"""))

p("\n=== PROFIT + RECONCILE (lock-sensitive) ===")
p(run(ssh, f"curl -sS -m 90 -X POST -H 'Authorization: Bearer {SECRET}' https://ax.fund/api/cron/run-daily-strategy-profit"))
p(run(ssh, f"curl -sS -m 90 -X POST -H 'Authorization: Bearer {SECRET}' https://ax.fund/api/cron/reconcile-balances"))

p("\n=== KILL STUCK LOCK SESSIONS (diagnostic) ===")
p(run(ssh, """cd /var/www/axon && set -a && . ./.env.local && set +a && psql "$DATABASE_URL" -c "SELECT pg_terminate_backend(274248); SELECT pg_terminate_backend(274291);" && sleep 1 && psql "$DATABASE_URL" -At -c "SELECT count(*) FROM pg_locks WHERE locktype='advisory';" """))

p("\n=== PROFIT + RECONCILE AFTER LOCK CLEAR ===")
p(run(ssh, f"curl -sS -m 90 -X POST -H 'Authorization: Bearer {SECRET}' https://ax.fund/api/cron/run-daily-strategy-profit"))
p(run(ssh, f"curl -sS -m 90 -X POST -H 'Authorization: Bearer {SECRET}' https://ax.fund/api/cron/reconcile-balances"))

ssh.close()
