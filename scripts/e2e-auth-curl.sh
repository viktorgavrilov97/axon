#!/bin/bash
set -euo pipefail
BASE="${1:-https://axon.mlmos1.club}"
EMAIL="$2"
PASSWORD="$3"
COOKIE="/tmp/axon_auth_test_cookies.txt"
rm -f "$COOKIE"

echo "=== CSRF ==="
CSRF_JSON=$(curl -s -c "$COOKIE" "$BASE/api/auth/csrf")
echo "$CSRF_JSON"
CSRF=$(echo "$CSRF_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin)['csrfToken'])")

echo "=== Sign in ==="
curl -s -c "$COOKIE" -b "$COOKIE" -L -o /tmp/signin_out.html -w "HTTP:%{http_code}\n" \
  -X POST "$BASE/api/auth/callback/credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "csrfToken=$CSRF" \
  --data-urlencode "email=$EMAIL" \
  --data-urlencode "password=$PASSWORD" \
  --data-urlencode "callbackUrl=$BASE/terminal" \
  -d "json=true"

echo "=== Cookies ==="
cat "$COOKIE"

echo "=== Session ==="
curl -s -b "$COOKIE" "$BASE/api/auth/session" | head -c 500
echo

echo "=== Terminal ==="
curl -s -b "$COOKIE" -o /dev/null -w "HTTP:%{http_code}\n" "$BASE/terminal"

echo "=== Wallet API ==="
curl -s -b "$COOKIE" "$BASE/api/wallet/operations" | head -c 300
echo
