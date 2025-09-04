#!/usr/bin/env bash
# Stage 1 Verification Runner
# Runs typecheck, tests, security audits, RLS smoke, and edge auth checks.
# Requirements:
#  - Node 18+, npm, curl
#  - Env vars:
#    EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
#    SUPABASE_URL (optional; defaults to EXPO_PUBLIC_SUPABASE_URL)
#    SUPABASE_ANON_KEY (optional; defaults to EXPO_PUBLIC_SUPABASE_ANON_KEY)
#    TEST_TENANT1_JWT, TEST_TENANT2_JWT (for RLS smoke; Clerk JWTs with template "supabase")
#    EDGE_URL (deployed analyze-maintenance-request function URL)
#    JWT (valid Clerk JWT with template "supabase" for 200 test)

set -euo pipefail

RED="$(printf '\033[0;31m')"
GRN="$(printf '\033[0;32m')"
YEL="$(printf '\033[1;33m')"
NC="$(printf '\033[0m')"

SKIP_RLS=false
SKIP_EDGE=false

for arg in "$@"; do
  case "$arg" in
    --skip-rls) SKIP_RLS=true ;;
    --skip-edge) SKIP_EDGE=true ;;
    *) echo "Unknown arg: $arg" >&2; exit 1 ;;
  esac
done

step() { echo -e "${YEL}==> $*${NC}"; }
ok()   { echo -e "${GRN}✅ $*${NC}"; }
fail() { echo -e "${RED}❌ $*${NC}"; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || { fail "Missing command: $1"; exit 1; }
}

require_cmd node
require_cmd npm
require_cmd curl

# Normalize envs
export SUPABASE_URL="${SUPABASE_URL:-${EXPO_PUBLIC_SUPABASE_URL:-}}"
export SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-${EXPO_PUBLIC_SUPABASE_ANON_KEY:-}}"

missing=()
[ -z "${EXPO_PUBLIC_SUPABASE_URL:-}" ] && missing+=("EXPO_PUBLIC_SUPABASE_URL")
[ -z "${EXPO_PUBLIC_SUPABASE_ANON_KEY:-}" ] && missing+=("EXPO_PUBLIC_SUPABASE_ANON_KEY")
[ -z "${SUPABASE_URL:-}" ] && missing+=("SUPABASE_URL")
[ -z "${SUPABASE_ANON_KEY:-}" ] && missing+=("SUPABASE_ANON_KEY")

if [ ${#missing[@]} -gt 0 ]; then
  fail "Missing required env vars: ${missing[*]}"
  exit 1
fi

step "Installing dependencies (npm ci)"
npm ci
ok "Dependencies installed"

step "Typecheck"
npm run typecheck
ok "Typecheck passed"

step "Unit tests"
npm test
ok "Unit tests passed"

step "Security audit script"
./scripts/security-audit.sh
ok "Security audit script passed"

step "npm audit (high)"
if npm audit --audit-level=high; then
  ok "npm audit passed"
else
  fail "npm audit found high-severity issues"
  exit 1
fi

if [ "$SKIP_RLS" = false ]; then
  step "RLS smoke test"
  if [ -z "${TEST_TENANT1_JWT:-}" ] || [ -z "${TEST_TENANT2_JWT:-}" ]; then
    fail "Missing TEST_TENANT1_JWT/TEST_TENANT2_JWT; cannot run RLS smoke"
    exit 1
  fi
  node scripts/ci/rls-smoke.js
  ok "RLS smoke test passed"
else
  step "Skipping RLS smoke test (--skip-rls)"
fi

if [ "$SKIP_EDGE" = false ]; then
  step "Edge function auth checks"
  if [ -z "${EDGE_URL:-}" ]; then
    fail "Missing EDGE_URL; cannot run edge checks"
    exit 1
  fi

  step "Edge 401 unauthenticated"
  CODE401=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$EDGE_URL" -H 'Content-Type: application/json' -d '{}')
  if [ "$CODE401" != "401" ]; then
    fail "Expected 401 without Authorization, got ${CODE401}"
    exit 1
  fi
  ok "Edge unauthenticated request returned 401"

  if [ -z "${JWT:-}" ]; then
    fail "Missing JWT for authenticated edge check"
    exit 1
  fi

  step "Edge 200 authenticated"
  CODE200=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$EDGE_URL"     -H "Authorization: Bearer $JWT" -H 'Content-Type: application/json'     -d '{"description":"test request from runner"}')
  if [ "$CODE200" != "200" ]; then
    fail "Expected 200 with Authorization, got ${CODE200}"
    exit 1
  fi
  ok "Edge authenticated request returned 200"
else
  step "Skipping edge function checks (--skip-edge)"
fi

ok "All Stage 1 checks completed successfully"