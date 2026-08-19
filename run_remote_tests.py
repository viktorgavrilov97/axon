#!/usr/bin/env python3
import paramiko
import sys

HOST = "172.86.94.223"
USER = "root"
PASSWORD = "j2fY4qHA7pD8MW"


def safe_print(text: str):
    sys.stdout.buffer.write((text + "\n").encode("utf-8", errors="replace"))


def run(ssh, cmd, timeout=120):
    safe_print(f">>> {cmd}")
    _, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    stdout.channel.settimeout(timeout)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    if out:
        safe_print(out)
    if err:
        safe_print(err)
    return out


def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=20)
    sftp = ssh.open_sftp()
    for local, remote in [
        ("axon-development/scripts/list-actions.py", "/tmp/list-actions.py"),
        ("axon-development/scripts/test-register-http.sh", "/var/www/axon/scripts/test-register-http.sh"),
    ]:
        sftp.put(local, remote)
    sftp.close()

    run(ssh, "python3 /tmp/list-actions.py 2>/dev/null | grep -iE 'register|verify|login|check' || python3 /tmp/list-actions.py | head -30")
    run(ssh, "chmod +x /var/www/axon/scripts/test-register-http.sh && bash /var/www/axon/scripts/e2e-http.sh")
    ssh.close()


if __name__ == "__main__":
    main()
