#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -lt 4 ]; then
  echo "Usage: cron-job-runner.sh <name> <url> <cron_secret> <log_file>"
  exit 1
fi

NAME="$1"
URL="$2"
CRON_SECRET="$3"
LOG_FILE="$4"
LOCK_FILE="/tmp/axon-${NAME}.lock"

mkdir -p "$(dirname "$LOG_FILE")"
START_TS=$(date +%s)

{
  echo "[$(date -Is)] START ${NAME}"
  /usr/bin/flock -n "$LOCK_FILE" bash -c "
    for attempt in 1 2 3; do
      code=\$(curl -sS -m 60 -o /tmp/axon-${NAME}.out -w '%{http_code}' \
        -H 'Authorization: Bearer ${CRON_SECRET}' \
        -X POST '${URL}')
      if [ \"\$code\" = \"200\" ]; then
        echo \"[$(date -Is)] SUCCESS ${NAME} attempt=\$attempt code=\$code\"
        cat /tmp/axon-${NAME}.out
        exit 0
      fi
      echo \"[$(date -Is)] RETRY ${NAME} attempt=\$attempt code=\$code\"
      cat /tmp/axon-${NAME}.out
      sleep \$((attempt * 5))
    done
    echo \"[$(date -Is)] FAIL ${NAME} after retries\"
    exit 1
  "
  END_TS=$(date +%s)
  echo "[$(date -Is)] END ${NAME} duration=$((END_TS - START_TS))s"
} >> "$LOG_FILE" 2>&1

