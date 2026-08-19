import paramiko, sys
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('172.86.94.223', username='root', password='j2fY4qHA7pD8MW', timeout=15)
_, o, _ = ssh.exec_command('cat /var/www/axon/.env.local')
sys.stdout.buffer.write(o.read())
ssh.close()
