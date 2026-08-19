#!/bin/bash
# Test Google OAuth initiation - shows redirect_uri Google will receive
set -euo pipefail
BASE="https://ax.fund"
COOKIE="/tmp/google_oauth_test.txt"
rm -f "$COOKIE"

CSRF=$(curl -s -c "$COOKIE" "$BASE/api/auth/csrf" | python3 -c "import sys,json;print(json.load(sys.stdin)['csrfToken'])")

echo "=== POST signin/google ==="
HEADERS=$(curl -sI -c "$COOKIE" -b "$COOKIE" --max-time 20 \
  -X POST "$BASE/api/auth/signin/google" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "csrfToken=$CSRF" \
  --data-urlencode "callbackUrl=$BASE/terminal")

echo "$HEADERS" | head -20
LOCATION=$(echo "$HEADERS" | grep -i '^location:' | head -1)
echo ""
echo "Location: $LOCATION"

if echo "$LOCATION" | grep -q 'redirect_uri='; then
  REDIRECT_URI=$(python3 -c "import sys,urllib.parse; u=sys.argv[1]; q=urllib.parse.urlparse(u).query; print(urllib.parse.parse_qs(q).get('redirect_uri',[''])[0])" "$LOCATION")
  echo "redirect_uri sent to Google: $REDIRECT_URI"
fi
