#!/bin/bash
# Smoke test pós-deploy. Roda contra prod ou local.
#
# Uso:
#   ./scripts/smoke-test.sh                  # default prod
#   API_URL=http://localhost:3001 ./scripts/smoke-test.sh

set -euo pipefail

API="${API_URL:-https://milhasextras-api.fly.dev/api/v1}"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔥 Smoke test → $API"
echo "================================"

passed=0
failed=0
warnings=0

test_endpoint() {
  local method=$1
  local path=$2
  local expected_status=$3
  local description=$4

  status=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$API$path" || echo "000")

  if [ "$status" = "$expected_status" ]; then
    echo -e "${GREEN}✓${NC} $description ($status)"
    passed=$((passed + 1))
  elif [ "$status" = "401" ] && [ "$expected_status" = "200" ]; then
    # Endpoint protegido - resposta esperada se sem auth
    echo -e "${YELLOW}⚠${NC} $description (401 — protegido, sem JWT — OK)"
    warnings=$((warnings + 1))
  else
    echo -e "${RED}✗${NC} $description (esperado $expected_status, got $status)"
    failed=$((failed + 1))
  fi
}

echo ""
echo "▸ Health"
test_endpoint GET /health 200 "GET /health"

echo ""
echo "▸ Públicos"
test_endpoint GET /programs 200 "GET /programs"
test_endpoint GET /travel-intel/alliances 200 "GET /travel-intel/alliances"
test_endpoint GET /quizzes 200 "GET /quizzes"
test_endpoint GET /podcast 200 "GET /podcast"
test_endpoint GET /podcast/rss.xml 200 "GET /podcast/rss.xml"
test_endpoint GET /guides 200 "GET /guides"
test_endpoint GET /achievements/catalog 200 "GET /achievements/catalog"
test_endpoint GET /events 200 "GET /events"
test_endpoint GET /credit-cards 200 "GET /credit-cards"
test_endpoint GET /leaderboard/reporters 200 "GET /leaderboard/reporters"
test_endpoint GET /activity/public 200 "GET /activity/public"

echo ""
echo "▸ Autenticados (devem retornar 401 sem JWT)"
test_endpoint GET /users/profile 200 "GET /users/profile (requer JWT)"
test_endpoint GET /engagement/streak 200 "GET /engagement/streak"
test_endpoint GET /portfolio/analyze 200 "GET /portfolio/analyze"
test_endpoint GET /bookmarks 200 "GET /bookmarks"
test_endpoint GET /notes 200 "GET /notes"
test_endpoint GET /trip-plans 200 "GET /trip-plans"
test_endpoint GET /support/tickets 200 "GET /support/tickets"

echo ""
echo "▸ Admin (devem retornar 403)"
test_endpoint GET /security/admin/stats 403 "GET /security/admin/stats"
test_endpoint GET /admin/dashboard 403 "GET /admin/dashboard"

echo ""
echo "================================"
echo -e "${GREEN}✓ Passed: $passed${NC}  ${YELLOW}⚠ Warnings: $warnings${NC}  ${RED}✗ Failed: $failed${NC}"
echo ""

if [ $failed -gt 0 ]; then
  echo -e "${RED}❌ Smoke test FAILED${NC}"
  exit 1
fi

if [ $warnings -gt 5 ]; then
  echo -e "${YELLOW}⚠️  Muitos warnings — investigar autenticação${NC}"
fi

echo -e "${GREEN}✅ Smoke test PASSED${NC}"
