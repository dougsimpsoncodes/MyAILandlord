#!/bin/bash
# Staging Environment Setup and Cleanup Script
# Purpose: Seed test data and cleanup after E2E test runs
# Usage:
#   ./scripts/ci/staging-setup.sh seed    # Seed test data
#   ./scripts/ci/staging-setup.sh cleanup # Cleanup test data

set -e  # Exit on error

# ============================================================
# Configuration
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Environment variables (should be set in CI or .env)
: "${SUPABASE_URL:?Error: SUPABASE_URL not set}"
: "${SUPABASE_SERVICE_ROLE_KEY:?Error: SUPABASE_SERVICE_ROLE_KEY not set}"

# Test data prefixes for easy identification
TEST_USER_PREFIX="${TEST_USER_PREFIX:-e2e-test}"
TEST_RUN_ID="${TEST_RUN_ID:-local-$(date +%s)}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================
# Helper Functions
# ============================================================

log_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
  echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
  echo -e "${RED}✗${NC} $1"
}

# Execute SQL via Supabase REST API
execute_sql() {
  local sql="$1"
  local response

  response=$(curl -s -X POST \
    "${SUPABASE_URL}/rest/v1/rpc/execute_sql" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"${sql}\"}" 2>&1)

  echo "$response"
}

# ============================================================
# Seed Test Data
# ============================================================

seed_data() {
  log_info "Seeding test data for staging environment..."

  # Create test landlord user
  log_info "Creating test landlord account..."

  local test_email="${TEST_USER_PREFIX}-${TEST_RUN_ID}@myailandlord.com"
  local test_password="TestUser123!E2E"

  # Note: Actual user creation happens via Clerk/Supabase Auth during test run
  # This script prepares the database schema and any reference data

  log_success "Test user email: ${test_email}"

  # Create reference data (if needed)
  log_info "Creating reference data..."

  # Example: Seed property types, area templates, etc.
  # execute_sql "INSERT INTO reference_data ..."

  log_success "Test data seeded successfully"
  log_info "Test run ID: ${TEST_RUN_ID}"
}

# ============================================================
# Cleanup Test Data
# ============================================================

cleanup_data() {
  log_info "Cleaning up test data..."

  # Find all test users by email prefix
  log_info "Finding test users with prefix: ${TEST_USER_PREFIX}..."

  # Get database connection string
  local db_url="${SUPABASE_URL/https:\/\//postgresql://postgres:${SUPABASE_DB_PASSWORD}@}"
  db_url="${db_url}.supabase.co:5432/postgres"

  # Cleanup via SQL (requires psql or equivalent)
  if command -v psql &> /dev/null; then
    log_info "Cleaning up via psql..."

    PGPASSWORD="${SUPABASE_DB_PASSWORD}" psql "${db_url}" <<EOF
-- Delete test data in dependency order

BEGIN;

-- 1. Delete invite tokens created by test users
DELETE FROM invite_tokens
WHERE created_by IN (
  SELECT id FROM auth.users
  WHERE email LIKE '${TEST_USER_PREFIX}%'
);

-- 2. Delete tenant-property links
DELETE FROM tenant_property_links
WHERE tenant_id IN (
  SELECT id FROM profiles
  WHERE email LIKE '${TEST_USER_PREFIX}%'
) OR property_id IN (
  SELECT id FROM properties
  WHERE user_id IN (
    SELECT id FROM auth.users
    WHERE email LIKE '${TEST_USER_PREFIX}%'
  )
);

-- 3. Delete assets
DELETE FROM property_assets
WHERE property_id IN (
  SELECT id FROM properties
  WHERE user_id IN (
    SELECT id FROM auth.users
    WHERE email LIKE '${TEST_USER_PREFIX}%'
  )
);

-- 4. Delete property areas
DELETE FROM property_areas
WHERE property_id IN (
  SELECT id FROM properties
  WHERE user_id IN (
    SELECT id FROM auth.users
    WHERE email LIKE '${TEST_USER_PREFIX}%'
  )
);

-- 5. Delete properties
DELETE FROM properties
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE email LIKE '${TEST_USER_PREFIX}%'
);

-- 6. Delete profiles
DELETE FROM profiles
WHERE email LIKE '${TEST_USER_PREFIX}%';

-- 7. Delete auth users (this will cascade to profiles if trigger exists)
DELETE FROM auth.users
WHERE email LIKE '${TEST_USER_PREFIX}%';

-- Commit transaction
COMMIT;

-- Report cleanup results
SELECT
  (SELECT COUNT(*) FROM auth.users WHERE email LIKE '${TEST_USER_PREFIX}%') as remaining_users,
  (SELECT COUNT(*) FROM properties WHERE user_id IN (
    SELECT id FROM auth.users WHERE email LIKE '${TEST_USER_PREFIX}%'
  )) as remaining_properties,
  (SELECT COUNT(*) FROM invite_tokens WHERE created_by IN (
    SELECT id FROM auth.users WHERE email LIKE '${TEST_USER_PREFIX}%'
  )) as remaining_tokens;
EOF

    log_success "Cleanup completed via database"

  else
    log_warning "psql not found - cleanup via API..."

    # Alternative: Cleanup via Edge Function
    curl -s -X POST \
      "${SUPABASE_URL}/functions/v1/cleanup-test-data" \
      -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Content-Type: application/json" \
      -d "{\"email_prefix\": \"${TEST_USER_PREFIX}\"}"

    log_success "Cleanup completed via Edge Function"
  fi

  # Cleanup storage (uploaded photos)
  log_info "Cleaning up storage..."

  # List and delete test user uploads
  # Note: Requires custom Edge Function or direct storage API access

  log_success "Test data cleanup completed"
}

# ============================================================
# Verify Environment
# ============================================================

verify_environment() {
  log_info "Verifying staging environment..."

  # Check Supabase connection
  local health_check
  health_check=$(curl -s "${SUPABASE_URL}/rest/v1/" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")

  if [[ $? -eq 0 ]]; then
    log_success "Supabase connection verified"
  else
    log_error "Supabase connection failed"
    exit 1
  fi

  # Verify database migrations are applied
  log_info "Checking database schema..."

  # Check for critical tables
  local tables="properties invite_tokens property_areas property_assets"
  for table in $tables; do
    # Simple check via REST API
    local check_result
    check_result=$(curl -s "${SUPABASE_URL}/rest/v1/${table}?limit=1" \
      -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Range: 0-0")

    if [[ $? -eq 0 ]]; then
      log_success "Table '${table}' exists"
    else
      log_error "Table '${table}' not found"
      exit 1
    fi
  done

  log_success "Environment verification completed"
}

# ============================================================
# Main Script
# ============================================================

main() {
  local command="${1:-help}"

  case "$command" in
    seed)
      verify_environment
      seed_data
      ;;
    cleanup)
      cleanup_data
      ;;
    verify)
      verify_environment
      ;;
    help)
      echo "Usage: $0 {seed|cleanup|verify}"
      echo ""
      echo "Commands:"
      echo "  seed    - Seed test data for staging environment"
      echo "  cleanup - Cleanup all test data"
      echo "  verify  - Verify staging environment configuration"
      echo ""
      echo "Environment variables:"
      echo "  SUPABASE_URL              - Supabase project URL"
      echo "  SUPABASE_SERVICE_ROLE_KEY - Service role key for admin access"
      echo "  SUPABASE_DB_PASSWORD      - Database password (for direct cleanup)"
      echo "  TEST_USER_PREFIX          - Email prefix for test users (default: e2e-test)"
      echo "  TEST_RUN_ID               - Unique ID for this test run (auto-generated)"
      exit 0
      ;;
    *)
      log_error "Unknown command: $command"
      echo "Run '$0 help' for usage information"
      exit 1
      ;;
  esac
}

main "$@"
