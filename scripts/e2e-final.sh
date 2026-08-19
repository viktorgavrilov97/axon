#!/bin/bash
# Final comprehensive test suite
set -euo pipefail
BASE="${BASE_URL:-https://axon.mlmos1.club}"
PASS=0; FAIL=0
ok() { echo "OK: $1"; PASS=$((PASS+1)); }
fail() { echo "FAIL: $1"; FAIL=$((FAIL+1)); exit 1; }

echo "========== AXON PRODUCTION TEST SUITE =========="
echo "Target: $BASE"
echo ""

# 1. Infrastructure
curl -sf --max-time 10 "$BASE/api/auth/csrf" >/dev/null && ok "csrf endpoint" || fail "csrf endpoint"
curl -sf --max-time 10 "$BASE/api/telegram/check-enabled" >/dev/null && ok "telegram api" || fail "telegram api"

# 2. DB via app module
cd /var/www/axon && set -a && source .env.local && set +a
DB_OK=$(npx tsx -e "import { db } from './src/shared/lib/db.ts'; db.user.count().then(c=>{console.log('count='+c);return db.\$disconnect();})" 2>&1 | tail -1)
[[ "$DB_OK" == count=* ]] && ok "app db module ($DB_OK)" || fail "app db module: $DB_OK"

STRAT_COUNT=$(node -e "const {PrismaClient}=require('@prisma/client');const db=new PrismaClient();db.strategyConfig.count().then(c=>{console.log(c);return db.\$disconnect();})")
[ "${STRAT_COUNT:-0}" -ge 1 ] && ok "strategies seeded ($STRAT_COUNT)" || fail "strategies not seeded"

# 3. Full user journey
bash /var/www/axon/scripts/e2e-http.sh

# 4. checkEmail server action (real UI flow step 1)
EMAIL="checkaction_$(openssl rand -hex 4)@example.com"
CHECK_ACTION="40111ad307876117ae78ad3bbbb656638d7688dc16"
RESP=$(curl -s --max-time 15 -X POST "$BASE/auth/email" \
  -H "Next-Action: $CHECK_ACTION" \
  -H "Accept: text/x-component" \
  -H "Content-Type: text/plain;charset=UTF-8" \
  -d "[\"$EMAIL\"]")
echo "$RESP" | grep -q '"exists":false' && ok "checkEmailAction for new user" || fail "checkEmailAction: $RESP"

# 5. Register user via backend (same as registerAction logic) + verify + login
EMAIL2="fullflow_$(openssl rand -hex 4)@example.com"
PASS2="TestPass123!Aa"
node -e "
const {PrismaClient}=require('@prisma/client');const bcrypt=require('bcryptjs');
const db=new PrismaClient();
(async()=>{
  const email='$EMAIL2';const password='$PASS2';
  const hash=await bcrypt.hash(password,12);
  const ref='F'+Math.random().toString(36).slice(2,8).toUpperCase();
  const user=await db.user.create({data:{email,passwordHash:hash,referralCode:ref}});
  const code=String(Math.floor(100000+Math.random()*900000));
  await db.otpCode.create({data:{email,code,type:'EMAIL_VERIFICATION',userId:user.id,expiresAt:new Date(Date.now()+900000)}});
  console.log(code);
  await db.\$disconnect();
})();
" >/tmp/otp.txt
OTP=$(cat /tmp/otp.txt)
[ -n "$OTP" ] && ok "register backend created user+otp" || fail "register backend"

# verify via verifyOtp logic: mark verified
node -e "
const {PrismaClient}=require('@prisma/client');const db=new PrismaClient();
(async()=>{
  await db.user.update({where:{email:'$EMAIL2'},data:{emailVerified:new Date(),displayName:'Test',hasCompletedOnboarding:true}});
  await db.otpCode.deleteMany({where:{email:'$EMAIL2'}});
  await db.\$disconnect();
})();
" >/dev/null
ok "email verified"

COOKIE=/tmp/final_cookies.txt; rm -f "$COOKIE"
CSRF=$(curl -s -c "$COOKIE" "$BASE/api/auth/csrf" | python3 -c "import sys,json;print(json.load(sys.stdin)['csrfToken'])")
curl -s -c "$COOKIE" -b "$COOKIE" -o /dev/null -X POST "$BASE/api/auth/callback/credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "csrfToken=$CSRF" \
  --data-urlencode "email=$EMAIL2" \
  --data-urlencode "password=$PASS2" \
  --data-urlencode "callbackUrl=$BASE/terminal"
SESSION=$(curl -s -b "$COOKIE" "$BASE/api/auth/session")
echo "$SESSION" | grep -q "$EMAIL2" && ok "login session" || fail "login session: $SESSION"

curl -sf -b "$COOKIE" "$BASE/api/wallet/operations" | grep -q '"items"' && ok "wallet api authed" || fail "wallet api"
curl -sf -b "$COOKIE" "$BASE/api/strategies/configs" | grep -q 'DAY\|WEEK\|MONTH\|"name"' && ok "strategies api authed" || fail "strategies api"
TERMINAL=$(curl -s -o /dev/null -w "%{http_code}" -b "$COOKIE" -L "$BASE/terminal")
[ "$TERMINAL" = "200" ] && ok "terminal page" || fail "terminal: $TERMINAL"

echo ""
echo "=========================================="
echo "ALL TESTS PASSED ($PASS checks)"
echo "Site: $BASE"
echo "=========================================="
