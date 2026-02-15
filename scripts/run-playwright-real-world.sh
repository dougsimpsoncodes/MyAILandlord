#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$ROOT_DIR"

PORT="${E2E_PORT:-8081}"
BASE_URL="${E2E_BASE_URL:-http://localhost:${PORT}}"
HEADLESS="${PW_HEADLESS:-1}"
SPEC="${PW_SPEC:-tests/e2e/manual-parity-landlord-tenant.spec.ts}"

info() { printf "[info] %s\n" "$*"; }

./scripts/e2e-web-server.sh start

info "Server is healthy: $BASE_URL"
info "Running Playwright spec: $SPEC"
mkdir -p artifacts/playwright

E2E_BASE_URL="$BASE_URL" PW_HEADLESS="$HEADLESS" npx playwright test "$SPEC" "$@"
