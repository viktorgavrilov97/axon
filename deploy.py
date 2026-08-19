#!/usr/bin/env python3
"""Deploy Axon to production server."""
import os
import secrets
import sys
import tarfile
import tempfile
import textwrap
import paramiko
from pathlib import Path

HOST = "172.86.94.223"
USER = "root"
PASSWORD = "j2fY4qHA7pD8MW"
REMOTE_DIR = "/var/www/axon"
APP_PORT = 3001
DOMAIN = "ax.fund"
TMUX_SESSION = "axon"

ROOT = Path(__file__).resolve().parent
EXCLUDE_DIRS = {"node_modules", ".next", ".git", "__pycache__"}
EXCLUDE_FILES = {".env", ".env.local", "deploy.py", "deploy_probe.py"}


def ssh_connect():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    return ssh


def safe_print(text: str):
    sys.stdout.buffer.write(text.encode("utf-8", errors="replace") + b"\n")


def run(ssh, cmd, check=True):
    safe_print(f"\n>>> {cmd}")
    _, stdout, stderr = ssh.exec_command(cmd, get_pty=True)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    if out:
        safe_print(out)
    if err:
        safe_print(err)
    if check and "COMMAND_FAILED" in out:
        raise RuntimeError(f"Command failed: {cmd}")
    return out + err


def create_tarball():
    tmp = tempfile.NamedTemporaryFile(suffix=".tar.gz", delete=False)
    tmp.close()
    with tarfile.open(tmp.name, "w:gz") as tar:
        for path in ROOT.rglob("*"):
            rel = path.relative_to(ROOT)
            parts = rel.parts
            if parts and parts[0] in EXCLUDE_DIRS:
                continue
            if any(p in EXCLUDE_DIRS for p in parts):
                continue
            if path.name in EXCLUDE_FILES:
                continue
            if path.is_file():
                tar.add(path, arcname=str(rel).replace("\\", "/"))
    return tmp.name


def build_env(db_password: str) -> str:
    # Reuse working infra from sibling deployment on same server
    return textwrap.dedent(
        f"""
        DATABASE_URL=postgresql://axon:{db_password}@127.0.0.1:5432/axon
        POSTGRES_PRISMA_URL=postgresql://axon:{db_password}@127.0.0.1:5432/axon

        GOOGLE_CLIENT_ID=789158938108-sjm3113ulu8duost8opvrd59eguc5k55.apps.googleusercontent.com
        GOOGLE_CLIENT_SECRET=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

        RESEND_API_KEY=re_4q281o1A_JpacouhgdZ8VxgYuZ1P5Ft6a
        RESEND_FROM_EMAIL=onboarding@qex-capital.space

        AUTH_SECRET={secrets.token_urlsafe(32)}
        AUTH_URL=https://{DOMAIN}
        NEXT_PUBLIC_APP_URL=https://{DOMAIN}
        NEXT_PUBLIC_VERCEL_ENV=production
        NODE_ENV=production
        PORT={APP_PORT}

        OXAPAY_MERCHANT_API_KEY=MIJ2F8-35XAQW-NEXBWR-WN63VD
        OXAPAY_PAYOUT_API_KEY=EYC6KO-LRQDGD-VLNQHE-AKCAAW
        OXAPAY_BASE_URL=https://api.oxapay.com
        OXAPAY_CALLBACK_URL=https://{DOMAIN}/api/oxapay/webhook

        UPSTASH_REDIS_REST_URL=https://prepared-emu-16075.upstash.io
        UPSTASH_REDIS_REST_TOKEN=AT7LAAIncDE0MzUyOTM1YzkwOGM0MjdiYWFlZjIwODMxNGE0NjgxZnAxMTYwNzU

        CLOUDINARY_CLOUD_NAME=dkvgsafov
        CLOUDINARY_API_KEY=716939332639219
        CLOUDINARY_API_SECRET=8RBcpM9dvehlh5KyJ4QqHwEebU0
        CLOUDINARY_AVATAR_FOLDER=axon/avatars

        CRON_SECRET={secrets.token_hex(32)}
        PROJECT_NAME=Axon
        TELEGRAM_MODULE_ENABLED=false
        """
    ).strip() + "\n"


def main():
    db_password = secrets.token_urlsafe(16)
    tarball = create_tarball()
    safe_print(f"Created tarball: {tarball} ({os.path.getsize(tarball) // 1024} KB)")

    ssh = ssh_connect()
    sftp = ssh.open_sftp()

    run(ssh, "apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql postgresql-contrib certbot python3-certbot-nginx")

    run(
        ssh,
        f"""
        sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='axon'" | grep -q 1 || \
          sudo -u postgres psql -c "CREATE USER axon WITH PASSWORD '{db_password}';"
        sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='axon'" | grep -q 1 || \
          sudo -u postgres psql -c "CREATE DATABASE axon OWNER axon;"
        sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE axon TO axon;"
        """,
    )

    run(ssh, f"mkdir -p {REMOTE_DIR}")
    remote_tar = "/tmp/axon-deploy.tar.gz"
    safe_print(f"Uploading to {remote_tar}...")
    sftp.put(tarball, remote_tar)

    env_content = build_env(db_password)
    with sftp.file(f"{REMOTE_DIR}/.env.local", "w") as f:
        f.write(env_content)

    run(
        ssh,
        f"""
        cd {REMOTE_DIR} && \
        tar -xzf {remote_tar} && \
        rm -f {remote_tar} && \
        npm ci --omit=dev 2>/dev/null || npm install && \
        npm install typescript @types/node @types/react @types/react-dom prisma --no-save && \
        npm run db:generate && \
        npx prisma db push --accept-data-loss && \
        NODE_ENV=production npm run build
        """,
        check=False,
    )

    nginx_conf = textwrap.dedent(
        f"""
        server {{
            listen 80;
            listen [::]:80;
            server_name {DOMAIN};
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
    )

    with sftp.file("/etc/nginx/sites-available/axon", "w") as f:
        f.write(nginx_conf)

    run(ssh, "ln -sf /etc/nginx/sites-available/axon /etc/nginx/sites-enabled/axon")
    run(ssh, "nginx -t && systemctl reload nginx")

    run(
        ssh,
        f"""
        tmux kill-session -t {TMUX_SESSION} 2>/dev/null || true
        tmux new-session -d -s {TMUX_SESSION} "cd {REMOTE_DIR} && set -a && source .env.local && set +a && NODE_ENV=production npm run start -- -p {APP_PORT}"
        sleep 3
        tmux ls
        ss -tlnp | grep {APP_PORT} || true
        """,
    )

    run(
        ssh,
        f"certbot --nginx -d {DOMAIN} --non-interactive --agree-tos --register-unsafely-without-email --redirect || true",
        check=False,
    )

    run(ssh, "nginx -t && systemctl reload nginx")
    run(ssh, f"curl -sI http://127.0.0.1:{APP_PORT} | head -5")
    run(ssh, f"curl -sI https://{DOMAIN} | head -10 || curl -sI http://{DOMAIN} | head -10")

    sftp.close()
    ssh.close()
    os.unlink(tarball)

    safe_print("\n=== DEPLOY DONE ===")
    safe_print(f"Directory: {REMOTE_DIR}")
    safe_print(f"Tmux session: {TMUX_SESSION}")
    safe_print(f"URL: https://{DOMAIN}")
    safe_print(f"Local port: {APP_PORT}")


if __name__ == "__main__":
    main()
