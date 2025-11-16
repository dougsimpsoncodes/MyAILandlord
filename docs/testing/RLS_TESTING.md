RLS Testing Guide

Objective: Prove multi-tenant isolation at the database layer for critical tables.

Approach
- Use Clerk JWTs with template `supabase` for test tenants.
- Exercise allow/deny expectations via PostgREST endpoints with Authorization header.
- Run on CI for every PR.

How To Run Locally
1) Export envs:
   - EXPO_PUBLIC_SUPABASE_URL
   - EXPO_PUBLIC_SUPABASE_ANON_KEY
   - TEST_TENANT1_JWT, TEST_TENANT2_JWT
2) node scripts/ci/rls-suite.js

CI Integration
- See .github/workflows/ci.yml job `rls-suite`.
- Requires secrets: EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, TEST_TENANT1_JWT, TEST_TENANT2_JWT.

Coverage (Initial)
- profiles: tenant cannot read profiles of others
- properties: tenants/landlords see only scoped properties
- maintenance_requests: tenants see own requests; landlords only for owned properties

Future
- Add negative tests for write attempts to unauthorized rows
- Add tests for edge functions auth context (401/403 checks)

