#!/usr/bin/env python3
"""Migrate axon to ax.fund domain with SSL."""
import re
import sys
import paramiko

HOST = "172.86.94.223"
USER = "root"
PASSWORD = "j2fY4qHA7pD8MW"
OLD_DOMAIN = "axon.mlmos1.club"
NEW_DOMAIN = "ax.fund"
REMOTE_DIR = "/var/www/axon"
APP_PORT = 3001
TMUX_SESSION = "axon"


def safe_print(t):
    sys.stdout.buffer.write((t + "\n").encode("utf-8", errors="replace"))


def run(ssh, cmd, timeout=180):
    safe_print(f">>> {cmd[:160]}")
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

    run(ssh, f"dig +short {NEW_DOMAIN} A || host {NEW_DOMAIN}")
    run(ssh, f"cat {REMOTE_DIR}/.env.local")

    # Update env
    _, o, _ = ssh.exec_command(f"cat {REMOTE_DIR}/.env.local")
    env = o.read().decode()
    env = re.sub(rf"https?://{re.escape(OLD_DOMAIN)}", f"https://{NEW_DOMAIN}", env)
    env = re.sub(rf"AUTH_URL=.*", f"AUTH_URL=https://{NEW_DOMAIN}", env)
    env = re.sub(rf"NEXT_PUBLIC_APP_URL=.*", f"NEXT_PUBLIC_APP_URL=https://{NEW_DOMAIN}", env)
    env = re.sub(rf"OXAPAY_CALLBACK_URL=.*", f"OXAPAY_CALLBACK_URL=https://{NEW_DOMAIN}/api/oxapay/webhook", env)

    sftp = ssh.open_sftp()
    with sftp.file(f"{REMOTE_DIR}/.env.local", "w") as f:
        f.write(env)
    sftp.close()
    safe_print("Updated .env.local")

    nginx = f"""server {{
    listen 80;
    listen [::]:80;
    server_name {NEW_DOMAIN} www.{NEW_DOMAIN};
    client_max_body_size 20M;

    location /.well-known/acme-challenge/ {{
        root /var/www/html;
    }}

    location / {{
        proxy_pass http://127.0.0.1:{APP_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
    }}
}}
"""
    with ssh.open_sftp().file("/etc/nginx/sites-available/ax-fund", "w") as f:
        f.write(nginx)

    run(ssh, "ln -sf /etc/nginx/sites-available/ax-fund /etc/nginx/sites-enabled/ax-fund")
    run(ssh, "nginx -t && systemctl reload nginx")

    run(
        ssh,
        f"certbot --nginx -d {NEW_DOMAIN} -d www.{NEW_DOMAIN} "
        f"--non-interactive --agree-tos --register-unsafely-without-email --redirect",
        timeout=120,
    )

    run(
        ssh,
        f"tmux kill-session -t {TMUX_SESSION} 2>/dev/null || true; "
        f"tmux new-session -d -s {TMUX_SESSION} "
        f"'cd {REMOTE_DIR} && set -a && source .env.local && set +a && NODE_ENV=production npm run start -- -p {APP_PORT}'",
    )

    run(ssh, "sleep 4")
    run(ssh, f"curl -sI --max-time 15 https://{NEW_DOMAIN} | head -8")
    run(ssh, f"curl -s --max-time 10 https://{NEW_DOMAIN}/api/auth/csrf")
    run(ssh, f"grep -E 'AUTH_URL|NEXT_PUBLIC_APP_URL|OXAPAY_CALLBACK|GOOGLE_CLIENT' {REMOTE_DIR}/.env.local")

    ssh.close()
    safe_print(f"\nDone: https://{NEW_DOMAIN}")


if __name__ == "__main__":
    main()
