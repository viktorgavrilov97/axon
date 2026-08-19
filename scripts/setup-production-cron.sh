#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-https://ax.fund}"
CRON_SECRET="${2:-}"
LOG_DIR="${3:-/var/log/axon-cron}"

if [ -z "$CRON_SECRET" ]; then
  echo "Usage: setup-production-cron.sh <base_url> <cron_secret> [log_dir]"
  exit 1
fi

RUNNER="/var/www/axon/scripts/cron-job-runner.sh"
mkdir -p "$LOG_DIR"
chmod +x "$RUNNER"

TMP_CRON=$(mktemp)
crontab -l 2>/dev/null > "$TMP_CRON" || true

grep -v "axon/scripts/cron-job-runner.sh" "$TMP_CRON" > "${TMP_CRON}.clean" || true
mv "${TMP_CRON}.clean" "$TMP_CRON"

cat >> "$TMP_CRON" <<EOF
# Axon production cron jobs
*/5 * * * * $RUNNER sync-deposits "$BASE_URL/api/cron/sync-deposits" "$CRON_SECRET" "$LOG_DIR/sync-deposits.log"
*/5 * * * * $RUNNER sync-withdrawals "$BASE_URL/api/cron/sync-withdrawals" "$CRON_SECRET" "$LOG_DIR/sync-withdrawals.log"
5 0 * * * $RUNNER run-daily-strategy-profit "$BASE_URL/api/cron/run-daily-strategy-profit" "$CRON_SECRET" "$LOG_DIR/run-daily-strategy-profit.log"
10 0 * * * $RUNNER referral-payouts "$BASE_URL/api/cron/referral-payouts" "$CRON_SECRET" "$LOG_DIR/referral-payouts.log"
15 0 * * * $RUNNER recalc-referral-levels "$BASE_URL/api/cron/recalc-referral-levels" "$CRON_SECRET" "$LOG_DIR/recalc-referral-levels.log"
0 * * * * $RUNNER reconcile-balances "$BASE_URL/api/cron/reconcile-balances" "$CRON_SECRET" "$LOG_DIR/reconcile-balances.log"
EOF

crontab "$TMP_CRON"
rm -f "$TMP_CRON"

echo "Installed Axon cron schedule."
crontab -l | grep "axon/scripts/cron-job-runner.sh" || true

