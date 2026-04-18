#!/usr/bin/env bash
# End-to-end smoke test — requires docker-compose services and two server instances running.
# Usage: ./scripts/smoke.sh
# Prerequisites: websocat installed for WS tests (apt install websocat / brew install websocat)

set -euo pipefail

BASE1="http://localhost:3000"
BASE2="http://localhost:3001"
WS1="ws://localhost:3000/ws"
WS2="ws://localhost:3001/ws"

ok()   { echo "  ✓ $1"; }
fail() { echo "  ✗ $1" >&2; exit 1; }

check_status() {
  local expected=$1 actual=$2 label=$3
  [ "$actual" -eq "$expected" ] && ok "$label" || fail "$label (expected $expected, got $actual)"
}

echo "=== Smoke test ==="

# ── Step 1: health checks ─────────────────────────────────────────────────────
echo
echo "── 1. Health checks ──"
s=$(curl -s -o /dev/null -w "%{http_code}" "$BASE1/health")
check_status 200 "$s" "GET /health inst1"
s=$(curl -s -o /dev/null -w "%{http_code}" "$BASE1/ready")
check_status 200 "$s" "GET /ready inst1"

# ── Step 2: register users A and B ───────────────────────────────────────────
echo
echo "── 2. Register users ──"
BODY_A=$(curl -s -X POST "$BASE1/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@smoke.test","password":"password123","displayName":"Alice"}')
ACC_A=$(echo "$BODY_A" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
REF_A=$(echo "$BODY_A" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)
[ -n "$ACC_A" ] && ok "Register Alice" || fail "Register Alice"

BODY_B=$(curl -s -X POST "$BASE1/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"bob@smoke.test","password":"password123","displayName":"Bob"}')
ACC_B=$(echo "$BODY_B" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
[ -n "$ACC_B" ] && ok "Register Bob" || fail "Register Bob"

# ── Step 3: create DM room (idempotent) ──────────────────────────────────────
echo
echo "── 3. Create DM room (idempotency) ──"
USER_B_ID=$(curl -s "$BASE1/api/v1/auth/me" -H "Authorization: Bearer $ACC_B" \
  | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

create_dm() {
  curl -s -X POST "$BASE1/api/v1/rooms" \
    -H "Authorization: Bearer $ACC_A" \
    -H "Content-Type: application/json" \
    -d "{\"kind\":\"dm\",\"targetUserId\":\"$USER_B_ID\"}"
}

ROOM1=$(create_dm | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
ROOM2=$(create_dm | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
[ "$ROOM1" = "$ROOM2" ] && ok "DM idempotency (same roomId: $ROOM1)" || fail "DM idempotency"
ROOM_ID="$ROOM1"

# ── Step 4: send message via REST (idempotency) ───────────────────────────────
echo
echo "── 4. Send message via REST (idempotency) ──"
send_msg() {
  curl -s -X POST "$BASE1/api/v1/rooms/$ROOM_ID/messages" \
    -H "Authorization: Bearer $ACC_A" \
    -H "Content-Type: application/json" \
    -d '{"body":"hello","clientMessageId":"cli-smoke-1"}'
}

MSG1=$(send_msg | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
MSG2=$(send_msg | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
[ -n "$MSG1" ] && ok "Send message" || fail "Send message"
[ "$MSG1" = "$MSG2" ] && ok "Message idempotency (clientMessageId)" || fail "Message idempotency"
MSG_ID="$MSG1"

# ── Step 5: list messages ─────────────────────────────────────────────────────
echo
echo "── 5. List messages ──"
COUNT=$(curl -s "$BASE1/api/v1/rooms/$ROOM_ID/messages" \
  -H "Authorization: Bearer $ACC_A" \
  | grep -o '"id"' | wc -l | tr -d ' ')
[ "$COUNT" -ge 1 ] && ok "List messages (found $COUNT)" || fail "List messages"

# ── Step 6: edit + delete message ────────────────────────────────────────────
echo
echo "── 6. Edit and delete ──"
s=$(curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE1/api/v1/messages/$MSG_ID" \
  -H "Authorization: Bearer $ACC_A" \
  -H "Content-Type: application/json" \
  -d '{"body":"edited"}')
check_status 200 "$s" "Edit message"

s=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE1/api/v1/messages/$MSG_ID" \
  -H "Authorization: Bearer $ACC_A")
check_status 204 "$s" "Delete message"

# ── Step 7: refresh token rotation ───────────────────────────────────────────
echo
echo "── 7. Token rotation ──"
NEW_TOKENS=$(curl -s -X POST "$BASE1/api/v1/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REF_A\"}")
NEW_REF_A=$(echo "$NEW_TOKENS" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)
[ -n "$NEW_REF_A" ] && ok "Token rotation" || fail "Token rotation"

# Old token must be revoked
s=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE1/api/v1/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$REF_A\"}")
check_status 401 "$s" "Old refresh token rejected after rotation"

# ── Step 8: logout ────────────────────────────────────────────────────────────
echo
echo "── 8. Logout ──"
s=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE1/api/v1/auth/logout" \
  -H "Authorization: Bearer $ACC_A" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$NEW_REF_A\"}")
check_status 204 "$s" "Logout"

s=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE1/api/v1/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\":\"$NEW_REF_A\"}")
check_status 401 "$s" "Refresh after logout rejected"

# ── Step 9: WebSocket fan-out (requires websocat) ────────────────────────────
echo
echo "── 9. WebSocket fan-out ──"
if ! command -v websocat &>/dev/null; then
  echo "  ⚠ websocat not found — skipping WS tests (run: bun test tests/ws/fan-out.test.ts)"
else
  # Re-login to get fresh tokens after logout
  ACC_A=$(curl -s -X POST "$BASE1/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"alice@smoke.test","password":"password123"}' \
    | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

  # Subscribe both clients in background, collect output
  TMP_A=$(mktemp) TMP_B=$(mktemp)
  echo '{"type":"chat.subscribe","payload":{"roomIds":["'"$ROOM_ID"'"]}}' \
    | timeout 4 websocat "$WS1?token=$ACC_A" > "$TMP_A" 2>/dev/null &
  PID_A=$!
  echo '{"type":"chat.subscribe","payload":{"roomIds":["'"$ROOM_ID"'"]}}' \
    | timeout 4 websocat "$WS2?token=$ACC_B" > "$TMP_B" 2>/dev/null &
  PID_B=$!

  sleep 1

  # Send a message from Alice (inst1) → Bob on inst2 should receive it
  curl -s -X POST "$BASE1/api/v1/rooms/$ROOM_ID/messages" \
    -H "Authorization: Bearer $ACC_A" \
    -H "Content-Type: application/json" \
    -d '{"body":"fan-out test"}' > /dev/null

  sleep 1
  kill $PID_A $PID_B 2>/dev/null || true

  grep -q "message.created" "$TMP_B" \
    && ok "Cross-instance WS fan-out (Bob received message from Alice on inst2)" \
    || fail "Cross-instance WS fan-out"

  rm -f "$TMP_A" "$TMP_B"
fi

# ── Step 10: run unit + integration tests ─────────────────────────────────────
echo
echo "── 10. Automated test suite ──"
if bun test 2>&1 | tail -5 | grep -q "pass"; then
  ok "bun test passed"
else
  fail "bun test failed"
fi

echo
echo "=== Smoke test complete ==="
