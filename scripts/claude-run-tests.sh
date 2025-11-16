#!/usr/bin/env bash

# Claude-friendly test runner for MyAILandlord
# Purpose: Give a single entrypoint that detects env, runs typecheck, unit tests,
# optional RLS tests, and (optionally) e2e tests when properly configured.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok()   { echo -e "${GREEN}✓${NC} $*"; }
warn() { echo -e "${YELLOW}⚠${NC} $*"; }
err()  { echo -e "${RED}✗${NC} $*"; }

USAGE="\nUsage: scripts/claude-run-tests.sh [options]\n\nOptions:\n  --install         Run 'npm ci' if node_modules is missing\n  --force-install   Always run 'npm ci'\n  --typecheck       Run TypeScript type checks\n  --unit            Run unit tests (jest)\n  --rls             Run RLS isolation tests (requires env JWTs)\n  --e2e             Run Playwright e2e tests (only if configured)\n  --all             Run typecheck + unit + conditional RLS + conditional e2e\n  -h, --help        Show help\n\nEnvironment:\n  EXPO_PUBLIC_AUTH_DISABLED=1 is recommended for local dev to bypass auth\n  RLS tests require: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, TEST_TENANT1_JWT, TEST_TENANT2_JWT\n"

DO_INSTALL_IF_MISSING=false
FORCE_INSTALL=false
RUN_TYPECHECK=false
RUN_UNIT=false
RUN_RLS=false
RUN_E2E=false

if [[ $# -eq 0 ]]; then
  echo -e "$USAGE"
  exit 0
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --install)        DO_INSTALL_IF_MISSING=true ; shift ;;
    --force-install)  FORCE_INSTALL=true ; shift ;;
    --typecheck)      RUN_TYPECHECK=true ; shift ;;
    --unit)           RUN_UNIT=true ; shift ;;
    --rls)            RUN_RLS=true ; shift ;;
    --e2e)            RUN_E2E=true ; shift ;;
    --all)            RUN_TYPECHECK=true; RUN_UNIT=true; RUN_RLS=true; RUN_E2E=true ; shift ;;
    -h|--help)        echo -e "$USAGE"; exit 0 ;;
    *)                warn "Unknown option: $1"; echo -e "$USAGE"; exit 1 ;;
  esac
done

# Node / npm presence
if ! command -v node >/dev/null 2>&1; then
  err "Node.js not found. Please install Node 20+."; exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  err "npm not found. Please install Node.js which includes npm."; exit 1
fi

# Dependency installation logic
if $FORCE_INSTALL; then
  ok "Installing dependencies (forced)"
  npm ci --legacy-peer-deps
elif $DO_INSTALL_IF_MISSING; then
  if [[ ! -d node_modules ]]; then
    ok "Installing dependencies (node_modules missing)"
    npm ci --legacy-peer-deps
  else
    ok "Dependencies present (skipping install)"
  fi
fi

SUMMARY=()
EXITCODE=0

# Recommend dev auth disabled if not set
if [[ -z "${EXPO_PUBLIC_AUTH_DISABLED:-}" ]]; then
  warn "EXPO_PUBLIC_AUTH_DISABLED not set. For local dev, consider: EXPO_PUBLIC_AUTH_DISABLED=1"
fi

run_typecheck() {
  echo "— TypeScript typecheck"
  if npx tsc --noEmit; then
    ok "Typecheck passed"
    SUMMARY+=("typecheck: pass")
  else
    err "Typecheck failed"
    SUMMARY+=("typecheck: fail")
    EXITCODE=1
  fi
}

run_unit() {
  echo "— Unit tests (jest)"
  if npm run test -- --coverage --passWithNoTests; then
    ok "Unit tests passed"
    SUMMARY+=("unit: pass")
  else
    err "Unit tests failed"
    SUMMARY+=("unit: fail")
    EXITCODE=1
  fi
}

run_rls() {
  echo "— RLS isolation tests"
  local missing=()
  [[ -z "${EXPO_PUBLIC_SUPABASE_URL:-}" ]] && missing+=(EXPO_PUBLIC_SUPABASE_URL)
  [[ -z "${EXPO_PUBLIC_SUPABASE_ANON_KEY:-}" ]] && missing+=(EXPO_PUBLIC_SUPABASE_ANON_KEY)
  [[ -z "${TEST_TENANT1_JWT:-}" ]] && missing+=(TEST_TENANT1_JWT)
  [[ -z "${TEST_TENANT2_JWT:-}" ]] && missing+=(TEST_TENANT2_JWT)
  if (( ${#missing[@]} )); then
    warn "Skipping RLS tests; missing env: ${missing[*]}"
    SUMMARY+=("rls: skipped (env)")
    return
  fi
  if node scripts/ci/rls-suite.js; then
    ok "RLS tests passed"
    SUMMARY+=("rls: pass")
  else
    err "RLS tests failed"
    SUMMARY+=("rls: fail")
    EXITCODE=1
  fi
}

run_e2e() {
  echo "— E2E tests (Playwright)"
  # Detect playwright config
  if ! rg -n "@playwright/test" package.json >/dev/null 2>&1; then
    warn "Playwright deps not detected; skipping e2e"
    SUMMARY+=("e2e: skipped (deps)")
    return
  fi
  # Look for a config or rely on default; user should ensure a server is running if needed
  if npx playwright --version >/dev/null 2>&1; then
    if npx playwright test; then
      ok "E2E tests passed"
      SUMMARY+=("e2e: pass")
    else
      err "E2E tests failed"
      SUMMARY+=("e2e: fail")
      EXITCODE=1
    fi
  else
    warn "Playwright not installed; run: npx playwright install"
    SUMMARY+=("e2e: skipped (install)")
  fi
}

$RUN_TYPECHECK && run_typecheck
$RUN_UNIT && run_unit
$RUN_RLS && run_rls
$RUN_E2E && run_e2e

echo
echo "Summary:"
for item in "${SUMMARY[@]}"; do echo "  - $item"; done
exit $EXITCODE

