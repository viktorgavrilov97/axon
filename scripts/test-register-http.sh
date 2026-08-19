#!/bin/bash
set -euo pipefail
BASE="${BASE_URL:-https://axon.mlmos1.club}"
EMAIL="regflow_$(openssl rand -hex 4)@example.com"
PASSWORD="TestPass123!Aa"
COOKIE="/tmp/axon_reg_cookies.txt"
rm -f "$COOKIE"

REGISTER_ACTION="40ff2ea4f146b046f786f91883b364477d6cd941ae"
VERIFY_ACTION="708a4db2b2d684dc8a251f68b154165dade127934c"
CHECK_EMAIL_ACTION="40111ad307876117ae78ad3bbbb656638d7688dc16"

echo "=== Register flow test: $EMAIL ==="

curl -s -c "$COOKIE" -b "$COOKIE" "$BASE/auth/password" >/dev/null

# 1. checkEmailAction
CHECK_RESP=$(curl -s --max-time 20 -c "$COOKIE" -b "$COOKIE" \
  -X POST "$BASE/auth/email" \
  -H "Next-Action: $CHECK_EMAIL_ACTION" \
  -H "Accept: text/x-component" \
  -H "Content-Type: text/plain;charset=UTF-8" \
  -d "[\"$EMAIL\"]")
echo "checkEmail: $(echo "$CHECK_RESP" | head -c 200)"

# 2. registerAction (FormData via curl -F)
REG_RESP=$(curl -s --max-time 30 -c "$COOKIE" -b "$COOKIE" \
  -X POST "$BASE/auth/password" \
  -H "Next-Action: $REGISTER_ACTION" \
  -H "Accept: text/x-component" \
  -F "email=$EMAIL" \
  -F "password=$PASSWORD" \
  -F "confirmPassword=$PASSWORD")
echo "register: $(echo "$REG_RESP" | head -c 400)"

OTP=$(cd /var/www/axon && set -a && source .env.local && set +a && node -e "
const {PrismaClient}=require('@prisma/client');
const db=new PrismaClient();
db.otpCode.findFirst({where:{email:'$EMAIL',type:'EMAIL_VERIFICATION'},orderBy:{createdAt:'desc'}})
  .then(r=>{console.log(r?.code||'');return db.\$disconnect();});
")
echo "OTP: $OTP"
[ -n "$OTP" ] || { echo "FAIL: register did not create OTP"; exit 1; }

# 3. verifyOtpAction
VERIFY_RESP=$(curl -s --max-time 30 -c "$COOKIE" -b "$COOKIE" \
  -X POST "$BASE/verify-otp?type=email_verification&email=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$EMAIL'))")" \
  -H "Next-Action: $VERIFY_ACTION" \
  -H "Accept: text/x-component" \
  -H "Content-Type: text/plain;charset=UTF-8" \
  -d "[\"$EMAIL\",\"$OTP\",\"EMAIL_VERIFICATION\"]")
echo "verify: $(echo "$VERIFY_RESP" | head -c 400)"

SESSION=$(curl -s -b "$COOKIE" "$BASE/api/auth/session")
echo "session: $SESSION"

if echo "$SESSION" | grep -q "$EMAIL"; then
  echo "=== REGISTER+VERIFY FLOW OK (auto session) ==="
  exit 0
fi

# fallback login
CSRF=$(curl -s -c "$COOKIE" -b "$COOKIE" "$BASE/api/auth/csrf" | python3 -c "import sys,json;print(json.load(sys.stdin)['csrfToken'])")
curl -s -c "$COOKIE" -b "$COOKIE" -o /dev/null -X POST "$BASE/api/auth/callback/credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "csrfToken=$CSRF" \
  --data-urlencode "email=$EMAIL" \
  --data-urlencode "password=$PASSWORD" \
  --data-urlencode "callbackUrl=$BASE/terminal"
SESSION=$(curl -s -b "$COOKIE" "$BASE/api/auth/session")
echo "session after login: $SESSION"
echo "$SESSION" | grep -q "$EMAIL" && echo "=== REGISTER+VERIFY+LOGIN OK ===" || { echo "FAIL"; exit 1; }
