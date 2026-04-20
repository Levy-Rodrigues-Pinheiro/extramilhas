#!/usr/bin/env bash
# Backend smoke test — roda contra prod (Fly) pra validar que as principais
# rotas respondem o que deveriam. Executado no CI pós-deploy ou manualmente.
#
# Uso:
#   bash tests/e2e/backend-smoke.sh [BASE_URL]
# Default BASE_URL = https://milhasextras-api.fly.dev/api/v1

set -euo pipefail

BASE="${1:-https://milhasextras-api.fly.dev/api/v1}"
echo "🔬 Backend smoke tests against $BASE"
echo "=================================================="

pass=0
fail=0

check() {
  local name="$1"
  local expected_status="$2"
  local url="$3"
  local method="${4:-GET}"
  local data="${5:-}"

  local actual
  if [ "$method" = "GET" ]; then
    actual=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  else
    actual=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" \
      -H 'Content-Type: application/json' \
      -d "$data")
  fi

  if [ "$actual" = "$expected_status" ]; then
    echo "✅ $name ($actual)"
    pass=$((pass+1))
  else
    echo "❌ $name (got $actual, expected $expected_status)"
    fail=$((fail+1))
  fi
}

# Health
check "Health endpoint" 200 "$BASE/health"

# Public endpoints (sem auth)
check "Public CPM" 200 "$BASE/public/cpm"
check "Public bonuses" 200 "$BASE/public/bonuses"

# Rotas que requerem auth respondem 401 sem token
check "Protected: subscription (no auth)" 401 "$BASE/subscription"
check "Protected: notifications prefs (no auth)" 401 "$BASE/notifications/preferences"
check "Protected: missions (no auth)" 401 "$BASE/missions"
check "Protected: leaderboard/me (no auth)" 401 "$BASE/leaderboard/me"
check "Protected: referral/me (no auth)" 401 "$BASE/referral/me"

# Rotas públicas que precisam de validação
check "Bonus report sem body (422/400)" 400 "$BASE/bonus-reports" POST "{}"

# Leaderboard público
check "Leaderboard all-time" 200 "$BASE/leaderboard/reporters"
check "Leaderboard mensal" 200 "$BASE/leaderboard/reporters?window=month"

# Recent bônus aprovados
check "Bonus reports recent" 200 "$BASE/bonus-reports/recent"

# Devices register rejeita token inválido
check "Device register (invalid token → 400)" 400 \
  "$BASE/devices/register" POST '{"token":"not-a-real-token","platform":"android"}'

echo "=================================================="
echo "Passed: $pass / $((pass+fail))"
if [ $fail -gt 0 ]; then
  echo "❌ $fail test(s) failed"
  exit 1
fi
echo "✅ All smoke tests passed"
