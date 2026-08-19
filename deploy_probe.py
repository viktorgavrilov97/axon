import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("172.86.94.223", username="root", password="j2fY4qHA7pD8MW", timeout=15)

cmds = [
    "ls -la /var/www/ 2>/dev/null; ls -la /opt/ 2>/dev/null",
    "ls /etc/nginx/sites-enabled/ 2>/dev/null",
    "grep -r mlmos1 /etc/nginx/ 2>/dev/null | head -20 || true",
    "tmux ls 2>/dev/null || echo no_tmux",
    "systemctl is-active postgresql 2>/dev/null || echo no_postgres",
    "ss -tlnp | head -30",
    "df -h /",
    "free -h",
    "curl -sI http://axon.mlmos1.club 2>/dev/null | head -10 || true",
]

for cmd in cmds:
    _, stdout, stderr = ssh.exec_command(cmd)
    print("===", cmd)
    print(stdout.read().decode())
    err = stderr.read().decode()
    if err:
        print("ERR:", err)

ssh.close()
