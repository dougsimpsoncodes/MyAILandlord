-- Purpose: Resolve Supabase linter warnings:
-- - 0003_auth_rls_initplan: wrap auth.* calls in SELECT to avoid per-row re-evaluation
-- - 0006_multiple_permissive_policies: consolidate duplicate permissive policies
--
-- Scope: public.properties, public.device_tokens, public.invites

BEGIN;

-- Ensure helper exists (used by policies below)
-- public.auth_uid_compat() returns a UUID for the current user, compatible with Clerk ids.
-- If not present, fallback to auth.uid().
DO $do$
BEGIN
  PERFORM 1 FROM pg_proc
   WHERE pronamespace = 'public'::regnamespace
     AND proname = 'auth_uid_compat';
  IF NOT FOUND THEN
    EXECUTE $create_fn$
      CREATE OR REPLACE FUNCTION public.auth_uid_compat()
      RETURNS uuid LANGUAGE sql STABLE AS $body$
        SELECT auth.uid();
      $body$;
    $create_fn$;
  END IF;
END $do$;

-- ============================
-- properties: drop duplicates
-- ============================
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.properties;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.properties;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.properties;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.properties;
DROP POLICY IF EXISTS "Users can read own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can insert own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can update own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can delete own properties" ON public.properties;
DROP POLICY IF EXISTS properties_select_own ON public.properties;
DROP POLICY IF EXISTS properties_insert_own ON public.properties;
DROP POLICY IF EXISTS properties_update_own ON public.properties;
DROP POLICY IF EXISTS properties_delete_own ON public.properties;

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY properties_select_own ON public.properties
  FOR SELECT USING (user_id = (SELECT public.auth_uid_compat()));

CREATE POLICY properties_insert_own ON public.properties
  FOR INSERT WITH CHECK (user_id = (SELECT public.auth_uid_compat()));

CREATE POLICY properties_update_own ON public.properties
  FOR UPDATE USING (user_id = (SELECT public.auth_uid_compat()))
  WITH CHECK (user_id = (SELECT public.auth_uid_compat()));

CREATE POLICY properties_delete_own ON public.properties
  FOR DELETE USING (user_id = (SELECT public.auth_uid_compat()));

-- ===============================
-- device_tokens: drop duplicates
-- ===============================
DROP POLICY IF EXISTS "Users can view own device tokens" ON public.device_tokens;
DROP POLICY IF EXISTS "Users can read own device tokens" ON public.device_tokens;
DROP POLICY IF EXISTS "Users can insert own device tokens" ON public.device_tokens;
DROP POLICY IF EXISTS "Users can update own device tokens" ON public.device_tokens;
DROP POLICY IF EXISTS "Users can delete own device tokens" ON public.device_tokens;

ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY device_tokens_select_own ON public.device_tokens
  FOR SELECT USING (user_id = (SELECT public.auth_uid_compat()));

CREATE POLICY device_tokens_insert_own ON public.device_tokens
  FOR INSERT WITH CHECK (user_id = (SELECT public.auth_uid_compat()));

CREATE POLICY device_tokens_update_own ON public.device_tokens
  FOR UPDATE USING (user_id = (SELECT public.auth_uid_compat()))
  WITH CHECK (user_id = (SELECT public.auth_uid_compat()));

CREATE POLICY device_tokens_delete_own ON public.device_tokens
  FOR DELETE USING (user_id = (SELECT public.auth_uid_compat()));

-- ==========================
-- invites: drop and re-add
-- ==========================
DROP POLICY IF EXISTS landlords_create_own_invites ON public.invites;
DROP POLICY IF EXISTS landlords_view_own_invites ON public.invites;
DROP POLICY IF EXISTS landlords_update_own_invites ON public.invites;

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Landlords can create invites for properties they own
CREATE POLICY landlords_create_own_invites ON public.invites
  FOR INSERT
  WITH CHECK (
    created_by = (SELECT public.auth_uid_compat()) AND
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = property_id AND landlord_id = (SELECT public.auth_uid_compat())
    )
  );

-- Landlords can view their own invites
CREATE POLICY landlords_view_own_invites ON public.invites
  FOR SELECT
  USING (created_by = (SELECT public.auth_uid_compat()));

-- Landlords can update (soft delete/revoke) their own invites
CREATE POLICY landlords_update_own_invites ON public.invites
  FOR UPDATE
  USING (created_by = (SELECT public.auth_uid_compat()))
  WITH CHECK (created_by = (SELECT public.auth_uid_compat()));

COMMIT;

