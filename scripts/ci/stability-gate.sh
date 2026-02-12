#!/usr/bin/env bash
set -euo pipefail

RED="$(printf '\033[0;31m')"
GRN="$(printf '\033[0;32m')"
YEL="$(printf '\033[1;33m')"
NC="$(printf '\033[0m')"

step() { echo -e "${YEL}==> $*${NC}"; }
ok()   { echo -e "${GRN}✅ $*${NC}"; }

step "Type check"
npm run typecheck
ok "Type check passed"

step "Unit tests (excluding RLS integration suite)"
npm run test:unit:ci
ok "Unit tests passed"

if [ -n "${GITHUB_BASE_REF:-}" ]; then
  step "Lint gate (new lines only, PR base)"
  npm run lint:new-lines -- "origin/${GITHUB_BASE_REF}"
  ok "Lint new-lines gate passed"
elif [ -n "${STABILITY_BASE_REF:-}" ]; then
  step "Lint gate (new lines only, STABILITY_BASE_REF=${STABILITY_BASE_REF})"
  npm run lint:new-lines -- "${STABILITY_BASE_REF}"
  ok "Lint new-lines gate passed"
else
  echo "Skipping lint:new-lines locally (set STABILITY_BASE_REF to enable)."
fi

if [ -n "${SUPABASE_URL:-${EXPO_PUBLIC_SUPABASE_URL:-}}" ] \
  && [ -n "${SUPABASE_ANON_KEY:-${EXPO_PUBLIC_SUPABASE_ANON_KEY:-}}" ] \
  && [ -n "${TEST_TENANT1_JWT:-}" ] \
  && [ -n "${TEST_TENANT2_JWT:-}" ]; then
  step "RLS smoke test"
  npm run test:rls
  ok "RLS smoke test passed"
else
  echo "Skipping test:rls (missing SUPABASE/JWT env vars)."
fi

step "Manual gate reminder"
echo "Run device smoke test before merge: ./scripts/claude-test-invite-on-iphone.sh --clean"
ok "Stability gate complete"
