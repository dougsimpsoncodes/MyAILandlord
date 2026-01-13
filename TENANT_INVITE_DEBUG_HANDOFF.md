Tenant Invite Acceptance – Definitive Fix and Test Plan
Date: 2025-12-29

Overview
- Root cause: The previous accept_invite() function had ambiguous identifiers (e.g., property_id) colliding with table columns/OUT parameters, plus pgcrypto usage and search_path pitfalls. This produced PostgreSQL 42702 errors and intermittent failures during acceptance.
- Resolution: Replace accept_invite() with an atomic, unambiguous implementation and ensure triggers/search_path are safe. Client only calls accept_invite(), refreshes profile, clears redirect/token, and hard-resets navigation to tenant flow on success.

What Changed (Server)
- File: supabase/migrations/20251229_accept_invite_atomic_fix.sql
- Key points:
  - Drops and recreates public.accept_invite(TEXT) with explicit, non-colliding OUT column names:
    (success, out_status, out_property_id, out_property_name, out_error)
  - Uses search_path = public, extensions and digest(convert_to(p_token,'UTF8'), 'sha256') for correct hashing; compares against invites.token_hash (hex TEXT) using encode(digest(...), 'hex').
  - Fully-qualifies all table references and avoids bare property_id references inside the function body.
  - Performs three atomic steps: insert tenant_property_link, update invite usage, set profiles.role = COALESCE(role,'tenant').
  - Returns explicit out_status values: OK, ALREADY_LINKED, INVALID, ERROR (plus message in out_error).
  - Catches unique_violation to treat concurrent inserts as ALREADY_LINKED.
  - Replaces/ensures trigger public.set_tenant_link_landlord_id() uses search_path=public and reads public.properties safely.

What Changed (Client – behavior only)
- Client no longer sets role. It:
  1) Calls accept_invite(token)
  2) If success: hard route-reset to tenant convergence (TenantInviteRoommate or TenantHome), then refreshes profile and clears redirect/token
  3) Treats ALREADY_LINKED as success (same route)
  4) On failure: shows error, keeps redirect for retry, does not alter role

How To Apply
1) Verify the migration
   - Review supabase/migrations/20251229_accept_invite_atomic_fix.sql
   - Apply to your database:
     psql -f supabase/migrations/20251229_accept_invite_atomic_fix.sql "$SUPABASE_DB_URL"

2) Validate in SQL (no app)
   SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname='accept_invite';

   -- Valid token path
   SELECT * FROM public.accept_invite('REPLACE_WITH_REAL_TOKEN');
   -- Expect: success=true, out_status='OK' or 'ALREADY_LINKED', out_property_id set

   -- Invalid token path
   SELECT * FROM public.accept_invite('invalid');
   -- Expect: success=false, out_status='INVALID'

3) App smoke test
   - Fresh simulator/device, open invite link
   - Tap Sign Up & Accept, create new email
   - On success/ALREADY_LINKED: app route-reset lands on tenant flow; no landlord screen
   - On failure: error displayed; retry remains available

Operational Notes
- RLS: Function is SECURITY DEFINER and uses fully-qualified tables; it should bypass RLS constraints for required reads/writes.
- Idempotency: If the unique constraint on tenant_property_links triggers, function returns ALREADY_LINKED consistently.
- Observability: Log token last-4/hash and out_status in client to triangulate issues; avoid logging full tokens.

Rollback Plan
- Keep the prior function SQL available. If necessary:
  DROP FUNCTION IF EXISTS public.accept_invite(TEXT);
  -- Recreate previous implementation (not recommended) and revert client’s response handling.

Appendix – Return Contract
- success: boolean (true on OK/ALREADY_LINKED, false otherwise)
- out_status: text in {'OK','ALREADY_LINKED','INVALID','ERROR'}
- out_property_id: uuid of linked property (on success)
- out_property_name: text (friendly name)
- out_error: text (diagnostic message on failure)

