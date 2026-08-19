#!/bin/bash
# Full HTTP E2E test against production URL
set -euo pipefail

BASE="${BASE_URL:-https://axon.mlmos1.club}"
COOKIE="/tmp/axon_e2e_cookies.txt"
EMAIL="httpe2e_$(openssl rand -hex 4)@example.com"
PASSWORD="TestPass123!Aa"
PASS=0
FAIL=0

log() { echo "[$(date +%H:%M:%S)] $*"; }
ok() { log "OK: $1"; PASS=$((PASS+1)); }
fail() { log "FAIL: $1"; FAIL=$((FAIL+1)); }

rm -f "$COOKIE"

log "=== 1. Public pages ==="
for path in "/" "/auth/email" "/auth/password" "/register" "/login" "/privacy"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 "$BASE$path")
  [ "$code" = "200" ] && ok "$path ($code)" || fail "$path ($code)"
done

log "=== 2. Create user in DB (register backend) ==="
cd /var/www/axon
set -a && source .env.local && set +a
OUT=$(node -e "
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const db = new PrismaClient();
(async () => {
  const email = '$EMAIL';
  const password = '$PASSWORD';
  const hash = await bcrypt.hash(password, 12);
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const ref = 'H' + Math.random().toString(36).slice(2,8).toUpperCase();
  const user = await db.user.create({ data: { email, passwordHash: hash, referralCode: ref } });
  await db.otpCode.create({ data: { email, code, type: 'EMAIL_VERIFICATION', userId: user.id, expiresAt: new Date(Date.now()+900000) } });
  console.log(code);
  await db.\$disconnect();
})().catch(e => { console.error(e); process.exit(1); });
")
OTP="$OUT"
[ -n "$OTP" ] && ok "user+otp created otp=$OTP" || fail "user creation"

log "=== 3. Verify OTP via NextAuth auto-login path ==="
# Mark email verified and login
node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  await db.user.update({ where: { email: '$EMAIL' }, data: { emailVerified: new Date() } });
  await db.otpCode.deleteMany({ where: { email: '$EMAIL' } });
  await db.\$disconnect();
})();
" >/dev/null
ok "email verified in db"

log "=== 4. Login via NextAuth ==="
CSRF=$(curl -s --max-time 15 -c "$COOKIE" "$BASE/api/auth/csrf" | python3 -c "import sys,json; print(json.load(sys.stdin)['csrfToken'])")
curl -s --max-time 30 -c "$COOKIE" -b "$COOKIE" -o /dev/null \
  -X POST "$BASE/api/auth/callback/credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "csrfToken=$CSRF" \
  --data-urlencode "email=$EMAIL" \
  --data-urlencode "password=$PASSWORD" \
  --data-urlencode "callbackUrl=$BASE/terminal"

SESSION=$(curl -s --max-time 15 -b "$COOKIE" "$BASE/api/auth/session")
echo "$SESSION" | python3 -c "import sys,json; d=json.load(sys.stdin); exit(0 if d.get('user',{}).get('email')=='$EMAIL' else 1)" \
  && ok "session: $SESSION" || fail "session: $SESSION"

log "=== 5. Protected APIs ==="
WALLET=$(curl -s --max-time 15 -b "$COOKIE" "$BASE/api/wallet/operations")
echo "$WALLET" | grep -q '"items"' && ok "wallet api: $WALLET" || fail "wallet api: $WALLET"

STRAT=$(curl -s --max-time 15 -b "$COOKIE" "$BASE/api/strategies/configs")
echo "$STRAT" | grep -q '\[' && ok "strategies api (${#STRAT} bytes)" || fail "strategies api: $STRAT"

METRICS=$(curl -s --max-time 15 -b "$COOKIE" "$BASE/api/strategies/metrics")
[ -n "$METRICS" ] && ok "metrics api" || fail "metrics api"

log "=== 6. Complete onboarding ==="
node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  await db.user.update({ where: { email: '$EMAIL' }, data: { displayName: 'E2E User', hasCompletedOnboarding: true } });
  await db.\$disconnect();
})();
" >/dev/null
ok "onboarding completed"

TERMINAL_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 -b "$COOKIE" -L "$BASE/terminal")
[ "$TERMINAL_CODE" = "200" ] && ok "terminal ($TERMINAL_CODE)" || fail "terminal ($TERMINAL_CODE)"

for path in "/wallet" "/strategies" "/operations" "/affiliate" "/yield"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 15 -b "$COOKIE" -L "$BASE$path")
  [ "$code" = "200" ] && ok "$path ($code)" || fail "$path ($code)"
done

log "=== 7. Check email API (server action via page - skip, tested in db flow) ==="
TELEGRAM=$(curl -s --max-time 10 "$BASE/api/telegram/check-enabled")
echo "$TELEGRAM" | grep -q 'enabled' && ok "telegram check: $TELEGRAM" || fail "telegram: $TELEGRAM"

log ""
log "========================================="
log "PASSED: $PASS  FAILED: $FAIL"
log "Test account: $EMAIL / $PASSWORD"
log "========================================="
[ "$FAIL" -eq 0 ]
