#!/usr/bin/env bash

# Maintenance Requests RLS debugger
# - Lists current policies on maintenance_requests
# - Verifies tenant profile and active tenant_property_links for a given Clerk sub + property
# - Optionally applies fix-maintenance-rls-policy.sql
# - Optionally simulates a JWT in-session to validate policy preconditions (non-destructive)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIX_SQL_PATH="$SCRIPT_DIR/fix-maintenance-rls-policy.sql"
HELPERS_SQL_PATH="$SCRIPT_DIR/sql/maintenance_rls_helpers.sql"
HELPERS_POLICY_SQL_PATH="$SCRIPT_DIR/sql/fix_maintenance_rls_with_helpers.sql"

DB_URL=${DB_URL:-${DATABASE_URL:-${SUPABASE_DB_URL:-}}}
CLERK_SUB=""
PROPERTY_ID=""
PROFILE_ID=""
APPLY_FIX=false
SHOW_ONLY=false
SIMULATE_JWT=false
APPLY_HELPERS=false
REPAIR_DATA=false
ENSURE_LINK=false
UNIT_NUMBER="Unit 1"

usage() {
  cat <<EOF
Maintenance RLS Debugger

Usage:
  $(basename "$0") [--db-url URL] --clerk-sub SUB [--property-id UUID] [--profile-id UUID] [--apply-fix] [--simulate-jwt] [--show-only]

Flags:
  --db-url URL       Postgres connection URL (or set DB_URL/DATABASE_URL/SUPABASE_DB_URL env)
  --clerk-sub SUB    Clerk user sub (e.g., user_30ODE...)
  --property-id ID   Property UUID to validate tenant link (optional but recommended)
  --profile-id ID    Known tenant profile UUID; else auto-lookup from clerk-sub
  --apply-fix        Apply fix-maintenance-rls-policy.sql to target DB
  --apply-helpers    Apply helper functions and helper-based maintenance policies (sql/maintenance_rls_helpers.sql and sql/fix_maintenance_rls_with_helpers.sql)
  --simulate-jwt     Set request.jwt.claims for this session (uses clerk-sub)
  --repair-data      Repair data mapping (set profiles.clerk_user_id to clerk-sub for provided/auto profile)
  --ensure-link      Ensure active tenant_property_link for tenant/profile and property (requires --property-id)
  --unit-number STR  Unit number to use when creating link (default: "Unit 1")
  --show-only        Only print planned actions/SQL; do not execute

Examples:
  DB_URL=postgres://... $(basename "$0") --clerk-sub user_123 --property-id aaaa-... --simulate-jwt
  $(basename "$0") --db-url postgres://... --clerk-sub user_123 --apply-fix
EOF
}

die() { echo "[error] $*" >&2; exit 1; }
note() { echo "[info]  $*"; }
warn() { echo "[warn]  $*"; }

require() {
  command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"
}

run_psql() {
  local sql="$1"
  if $SHOW_ONLY; then
    echo "\n-- Would run SQL:"; echo "$sql"; echo
  else
    PGPASSWORD="${PGPASSWORD:-}" psql "$DB_URL" -v ON_ERROR_STOP=1 -X -q -c "$sql"
  fi
}

fetch_scalar() {
  local sql="$1"
  if $SHOW_ONLY; then
    echo "" # no output
  else
    PGPASSWORD="${PGPASSWORD:-}" psql "$DB_URL" -v ON_ERROR_STOP=1 -X -q -t -A -c "$sql"
  fi
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --db-url) DB_URL="$2"; shift 2;;
    --clerk-sub) CLERK_SUB="$2"; shift 2;;
    --property-id) PROPERTY_ID="$2"; shift 2;;
    --profile-id) PROFILE_ID="$2"; shift 2;;
    --apply-fix) APPLY_FIX=true; shift;;
    --apply-helpers) APPLY_HELPERS=true; shift;;
    --simulate-jwt) SIMULATE_JWT=true; shift;;
    --repair-data) REPAIR_DATA=true; shift;;
    --ensure-link) ENSURE_LINK=true; shift;;
    --unit-number) UNIT_NUMBER="$2"; shift 2;;
    --show-only) SHOW_ONLY=true; shift;;
    -h|--help) usage; exit 0;;
    *) die "Unknown arg: $1";;
  esac
done

[[ -z "$DB_URL" ]] && die "Provide DB URL via --db-url or DB_URL/DATABASE_URL/SUPABASE_DB_URL env"
[[ -z "$CLERK_SUB" ]] && die "--clerk-sub is required"

require psql

note "Target DB: ${DB_URL%%@*}@..."
note "Clerk sub: $CLERK_SUB"
[[ -n "$PROPERTY_ID" ]] && note "Property ID: $PROPERTY_ID"
[[ -n "$PROFILE_ID" ]] && note "Profile ID: $PROFILE_ID"

if $APPLY_FIX; then
  [[ -f "$FIX_SQL_PATH" ]] || die "Cannot find fix SQL at $FIX_SQL_PATH"
  note "Applying fix-maintenance-rls-policy.sql"
  if $SHOW_ONLY; then
    echo "-- Would apply: $FIX_SQL_PATH"
  else
    PGPASSWORD="${PGPASSWORD:-}" psql "$DB_URL" -v ON_ERROR_STOP=1 -X -q -f "$FIX_SQL_PATH"
  fi
fi

if $APPLY_HELPERS; then
  [[ -f "$HELPERS_SQL_PATH" ]] || die "Cannot find helpers SQL at $HELPERS_SQL_PATH"
  [[ -f "$HELPERS_POLICY_SQL_PATH" ]] || die "Cannot find helper policies SQL at $HELPERS_POLICY_SQL_PATH"
  note "Applying maintenance RLS helper functions"
  if $SHOW_ONLY; then
    echo "-- Would apply: $HELPERS_SQL_PATH"
  else
    PGPASSWORD="${PGPASSWORD:-}" psql "$DB_URL" -v ON_ERROR_STOP=1 -X -q -f "$HELPERS_SQL_PATH"
  fi
  note "Applying helper-based maintenance policies"
  if $SHOW_ONLY; then
    echo "-- Would apply: $HELPERS_POLICY_SQL_PATH"
  else
    PGPASSWORD="${PGPASSWORD:-}" psql "$DB_URL" -v ON_ERROR_STOP=1 -X -q -f "$HELPERS_POLICY_SQL_PATH"
  fi
fi

note "Listing current policies on maintenance_requests"
run_psql "SELECT policyname, cmd, roles, qual, with_check FROM pg_policies WHERE schemaname = 'public' AND tablename = 'maintenance_requests' ORDER BY policyname, cmd;"

note "Quick check: dependent table policies (profiles/properties/tenant_property_links)"
run_psql "SELECT tablename, policyname, cmd FROM pg_policies WHERE tablename IN ('profiles','properties','tenant_property_links') ORDER BY tablename, policyname;"

note "Lookup tenant profile by clerk_sub"
if [[ -z "$PROFILE_ID" ]]; then
  PROFILE_ID=$(fetch_scalar "SELECT id FROM profiles WHERE clerk_user_id = '$CLERK_SUB' LIMIT 1;")
  if [[ -z "${PROFILE_ID// /}" ]]; then
    warn "No profile found for clerk_user_id='$CLERK_SUB'"
    warn "Make sure profiles.clerk_user_id stores the Clerk 'sub' (e.g., user_...), not the profile UUID."
  else
    note "Found profile id: $PROFILE_ID"
  fi
fi

note "Check profile role"
run_psql "SELECT id, clerk_user_id, role FROM profiles WHERE id = '$PROFILE_ID'::uuid;"

if [[ -n "$PROPERTY_ID" ]]; then
  note "Validate active tenant_property_links for tenant/profile + property"
  run_psql "SELECT tpl.id, tpl.is_active, tpl.unit_number, tpl.tenant_id, tpl.property_id
            FROM tenant_property_links tpl
            WHERE tpl.property_id = '$PROPERTY_ID'::uuid AND tpl.tenant_id = '$PROFILE_ID'::uuid;"

  note "Effective policy predicates for INSERT should be satisfied if both checks below are true:"
  run_psql "SELECT
              EXISTS (SELECT 1 FROM profiles p WHERE p.clerk_user_id = '$CLERK_SUB' AND p.role='tenant' AND p.id = '$PROFILE_ID'::uuid) AS tenant_matches_profile,
              EXISTS (
                SELECT 1
                FROM tenant_property_links tpl
                JOIN profiles p ON p.id = tpl.tenant_id
                WHERE p.clerk_user_id = '$CLERK_SUB'
                  AND tpl.property_id = '$PROPERTY_ID'::uuid
                  AND tpl.is_active = true
              ) AS has_active_link;"
fi

if $REPAIR_DATA; then
  if [[ -z "${PROFILE_ID// /}" ]]; then
    die "--repair-data requires a resolvable --profile-id or an existing profile for --clerk-sub"
  fi
  note "Repair: set profiles.clerk_user_id for profile=$PROFILE_ID to sub=$CLERK_SUB"
  run_psql "UPDATE public.profiles SET clerk_user_id = '$CLERK_SUB' WHERE id = '$PROFILE_ID'::uuid;"
fi

if $ENSURE_LINK; then
  [[ -n "$PROPERTY_ID" ]] || die "--ensure-link requires --property-id"
  if [[ -z "${PROFILE_ID// /}" ]]; then
    die "--ensure-link requires a resolvable --profile-id or an existing profile for --clerk-sub"
  fi
  note "Ensure active tenant_property_link for tenant=$PROFILE_ID property=$PROPERTY_ID"
  run_psql "INSERT INTO public.tenant_property_links (id, tenant_id, property_id, unit_number, is_active, created_at, updated_at)
            VALUES (gen_random_uuid(), '$PROFILE_ID'::uuid, '$PROPERTY_ID'::uuid, '$UNIT_NUMBER', true, now(), now())
            ON CONFLICT (tenant_id, property_id)
            DO UPDATE SET is_active = true, updated_at = EXCLUDED.updated_at;"
fi

if $SIMULATE_JWT; then
  note "Simulating JWT in session (request.jwt.claims)"
  # Provide a minimal set of claims: sub and role
  run_psql "SELECT set_config('request.jwt.claims', json_build_object('sub', '$CLERK_SUB', 'role', 'authenticated')::text, true);"

  note "JWT context sanity check"
  run_psql "SELECT auth.jwt() IS NOT NULL AS jwt_exists, auth.jwt() ->> 'sub' AS jwt_sub;"

  if [[ -n "$PROPERTY_ID" && -n "$PROFILE_ID" ]]; then
    note "Re-evaluating policy subqueries under simulated JWT"
    run_psql "SELECT
                EXISTS (SELECT 1 FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub' AND id = '$PROFILE_ID'::uuid) AS tenant_matches_profile_under_jwt,
                EXISTS (
                  SELECT 1 FROM tenant_property_links tpl
                  JOIN profiles p ON p.id = tpl.tenant_id
                  WHERE p.clerk_user_id = auth.jwt() ->> 'sub'
                    AND tpl.property_id = '$PROPERTY_ID'::uuid
                    AND tpl.is_active = true
                ) AS has_active_link_under_jwt;"
  fi
fi

note "Done. If either check is false, INSERT will violate RLS. If policies differ from fix-maintenance-rls-policy.sql, consider --apply-fix."
note "Follow-up: Ensure your API validates Clerk JWTs so requests execute as role 'authenticated', which these policies target."
