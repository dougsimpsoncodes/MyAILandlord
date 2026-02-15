#!/bin/bash
# Execute SQL against the linked Supabase project via Management API.
# Uses the CLI access token stored in macOS Keychain.
#
# Usage:
#   ./scripts/supabase-sql.sh "SELECT count(*) FROM public.profiles"
#   ./scripts/supabase-sql.sh --file path/to/query.sql
#   echo "SELECT 1" | ./scripts/supabase-sql.sh --stdin
#   ./scripts/supabase-sql.sh --wipe   (runs the full data wipe)

set -euo pipefail

PROJECT_REF="zxqhxjuwmkxevhkpqfzf"
API_URL="https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query"
WIPE_FILE="$(dirname "$0")/../supabase/migrations/20260214101000_clear_all_user_data_for_fresh_testing.sql"

# Get access token from macOS Keychain
TOKEN_RAW=$(security find-generic-password -s "Supabase CLI" -w 2>/dev/null) || {
  echo "ERROR: Could not retrieve Supabase CLI token from Keychain." >&2
  echo "Run 'supabase login' first." >&2
  exit 1
}
TOKEN=$(echo "$TOKEN_RAW" | sed 's/go-keyring-base64://' | base64 -d)

run_sql() {
  local sql="$1"
  curl -s -X POST "$API_URL" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg q "$sql" '{query: $q}')"
}

case "${1:-}" in
  --wipe)
    echo "Wiping all user data from Supabase project ${PROJECT_REF}..."
    result=$(run_sql "$(cat "$WIPE_FILE")")
    echo "Wipe complete. Verifying..."
    run_sql "SELECT (SELECT count(*) FROM auth.users) AS auth_users, (SELECT count(*) FROM public.profiles) AS profiles, (SELECT count(*) FROM public.properties) AS properties, (SELECT count(*) FROM public.property_assets) AS assets"
    ;;
  --file)
    if [ -z "${2:-}" ]; then
      echo "Usage: $0 --file <path.sql>" >&2
      exit 1
    fi
    run_sql "$(cat "$2")"
    ;;
  --stdin)
    run_sql "$(cat -)"
    ;;
  --verify)
    echo "Checking row counts..."
    run_sql "SELECT (SELECT count(*) FROM auth.users) AS auth_users, (SELECT count(*) FROM public.profiles) AS profiles, (SELECT count(*) FROM public.properties) AS properties, (SELECT count(*) FROM public.property_areas) AS areas, (SELECT count(*) FROM public.property_assets) AS assets, (SELECT count(*) FROM public.invites) AS invites"
    ;;
  "")
    echo "Usage:" >&2
    echo "  $0 \"SQL statement\"" >&2
    echo "  $0 --file path/to/query.sql" >&2
    echo "  $0 --stdin" >&2
    echo "  $0 --wipe      (full data wipe)" >&2
    echo "  $0 --verify    (check row counts)" >&2
    exit 1
    ;;
  *)
    run_sql "$1"
    ;;
esac
