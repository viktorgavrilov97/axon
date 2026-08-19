#!/usr/bin/env python3
import paramiko
import sys

AUDIO = r"c:\Users\azdi\Desktop\audio_2026-06-10_16-26-46.ogg"
HOST = "172.86.94.223"
USER = "root"
PASSWORD = "j2fY4qHA7pD8MW"


def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USER, password=PASSWORD, timeout=20)
    sftp = ssh.open_sftp()
    sftp.put(AUDIO, "/tmp/voice.ogg")
    sftp.close()

    remote_script = r'''
import subprocess, sys
subprocess.run(["apt-get", "install", "-y", "-qq", "ffmpeg", "python3-pip"], capture_output=True)
subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", "openai-whisper", "--break-system-packages"])
import whisper
m = whisper.load_model("tiny")
r = m.transcribe("/tmp/voice.ogg", language="ru")
print("TRANSCRIPT:", r["text"].strip())
'''
    sftp = ssh.open_sftp()
    with sftp.file("/tmp/transcribe.py", "w") as f:
        f.write(remote_script)
    sftp.close()

    _, o, e = ssh.exec_command("python3 /tmp/transcribe.py", timeout=600)
    o.channel.settimeout(600)
    out = o.read().decode("utf-8", errors="replace")
    err = e.read().decode("utf-8", errors="replace")
    sys.stdout.buffer.write(out.encode("utf-8", errors="replace"))
    if err:
        sys.stdout.buffer.write(err.encode("utf-8", errors="replace"))
    ssh.close()


if __name__ == "__main__":
    main()
