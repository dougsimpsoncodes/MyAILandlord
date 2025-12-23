-- Fix Privilege Boundaries
-- Remove anon access to RPC functions (prevent token enumeration)
-- All sensitive operations must go through Edge Functions with service role

-- ============================================================
-- REVOKE anon/authenticated access to sensitive functions
-- ============================================================

-- Token validation: Should NOT be exposed to anon/authenticated
-- Must go through Edge Function which uses service role
REVOKE ALL ON FUNCTION public.validate_invite_token FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_invite_token FROM anon;
REVOKE ALL ON FUNCTION public.validate_invite_token FROM authenticated;
GRANT EXECUTE ON FUNCTION public.validate_invite_token TO service_role;

-- Token acceptance: Should only be called by authenticated users
-- But through Edge Function with proper validation
REVOKE ALL ON FUNCTION public.accept_invite_token FROM PUBLIC;
REVOKE ALL ON FUNCTION public.accept_invite_token FROM anon;
-- Keep for authenticated, but Edge Function should still be preferred
GRANT EXECUTE ON FUNCTION public.accept_invite_token TO authenticated;

-- Token revocation: Only authenticated landlords (already restricted by RLS)
REVOKE ALL ON FUNCTION public.revoke_invite_token FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_invite_token FROM anon;
GRANT EXECUTE ON FUNCTION public.revoke_invite_token TO authenticated;

-- Cleanup functions: Service role only
REVOKE ALL ON FUNCTION public.cleanup_expired_invite_tokens FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_invite_tokens TO service_role;

-- Rate limiting: Service role only (called from Edge Functions)
REVOKE ALL ON FUNCTION public.check_rate_limit FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO service_role;

-- ============================================================
-- Add table-level RLS to prevent direct token enumeration
-- ============================================================

-- Ensure RLS is enabled
ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Landlords create invites for owned properties" ON public.invite_tokens;
DROP POLICY IF EXISTS "Landlords view own invite tokens" ON public.invite_tokens;
DROP POLICY IF EXISTS "Landlords revoke own invite tokens" ON public.invite_tokens;

-- Recreate policies with explicit names
CREATE POLICY "invite_tokens_insert_landlord"
  ON public.invite_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = property_id AND landlord_id = auth.uid()
    )
  );

CREATE POLICY "invite_tokens_select_landlord"
  ON public.invite_tokens
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "invite_tokens_update_landlord"
  ON public.invite_tokens
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- NO DELETE policy - prevent accidental deletion (use revoke instead)
-- NO policy for anon - they CANNOT query this table directly

-- Service role bypasses RLS (used in Edge Functions)

-- ============================================================
-- Add rate_limits table RLS (no direct access)
-- ============================================================

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- NO policies - only service role can access this table
-- Prevents users from querying/modifying rate limit state

-- ============================================================
-- Comments
-- ============================================================

COMMENT ON TABLE public.invite_tokens IS 'Invite tokens table - access via Edge Functions only (service role)';
COMMENT ON TABLE public.rate_limits IS 'Rate limiting table - service role only (no direct user access)';
