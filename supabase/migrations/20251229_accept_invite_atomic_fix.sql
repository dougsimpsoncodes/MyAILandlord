-- ============================================================================
-- Migration: Atomic accept_invite() with unambiguous identifiers
-- Date: 2025-12-29
-- Purpose:
--   - Replace accept_invite(p_token TEXT) to eliminate ambiguous identifiers
--     and make the operation truly atomic.
--   - Fix pgcrypto usage (digest) and search_path.
--   - Ensure role is set to 'tenant' only if currently NULL, in the same
--     transaction as creating the tenant_property_link and updating invite usage.
--   - Return explicit status codes and non-ambiguous OUT column names.
-- Notes:
--   - This migration drops and recreates the function signature
--     accept_invite(TEXT). Make sure all callers expect the new return shape.
-- ============================================================================

-- Drop the existing function to avoid signature/return-type conflicts
DROP FUNCTION IF EXISTS public.accept_invite(TEXT);

CREATE OR REPLACE FUNCTION public.accept_invite(p_token TEXT)
RETURNS TABLE(
  success BOOLEAN,
  out_status TEXT,
  out_property_id UUID,
  out_property_name TEXT,
  out_error TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_token_hash TEXT;
  v_invite RECORD;
  v_already_linked BOOLEAN := FALSE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'NOT_AUTHENTICATED', NULL::UUID, NULL::TEXT, 'User not authenticated';
    RETURN;
  END IF;

  IF p_token IS NULL OR length(trim(p_token)) = 0 THEN
    RETURN QUERY SELECT FALSE, 'INVALID', NULL::UUID, NULL::TEXT, 'Token is required';
    RETURN;
  END IF;

  -- Compute hex-encoded SHA-256 of the token to match invites.token_hash (TEXT)
  v_token_hash := encode(digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');

  -- Find a valid, non-revoked, non-expired invite and join property for display name
  SELECT i.*, p.name AS property_name
  INTO v_invite
  FROM public.invites AS i
  JOIN public.properties AS p ON p.id = i.property_id
  WHERE i.token_hash = v_token_hash
    AND i.revoked_at IS NULL
    AND (i.expires_at IS NULL OR i.expires_at > now());

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'INVALID', NULL::UUID, NULL::TEXT, 'Invalid or expired invite';
    RETURN;
  END IF;

  -- Already linked check
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_property_links AS tpl
    WHERE tpl.tenant_id = v_user_id AND tpl.property_id = v_invite.property_id
  ) INTO v_already_linked;

  IF v_already_linked THEN
    RETURN QUERY SELECT TRUE, 'ALREADY_LINKED', v_invite.property_id, v_invite.property_name, NULL::TEXT;
    RETURN;
  END IF;

  -- Create tenant-property link
  INSERT INTO public.tenant_property_links (tenant_id, property_id, status)
  VALUES (v_user_id, v_invite.property_id, 'active');

  -- Update invite usage bookkeeping
  UPDATE public.invites
  SET use_count = COALESCE(use_count, 0) + 1,
      last_used_at = now(),
      accepted_by = v_user_id
  WHERE id = v_invite.id;

  -- Set tenant role only if currently NULL/empty (do not overwrite existing role)
  UPDATE public.profiles
  SET role = COALESCE(role, 'tenant')
  WHERE id = v_user_id;

  RETURN QUERY SELECT TRUE, 'OK', v_invite.property_id, v_invite.property_name, NULL::TEXT;

EXCEPTION
  WHEN unique_violation THEN
    -- Concurrent insert attempted; treat as already linked
    RETURN QUERY SELECT TRUE, 'ALREADY_LINKED', v_invite.property_id, v_invite.property_name, NULL::TEXT;
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, 'ERROR', NULL::UUID, NULL::TEXT, SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invite(TEXT) TO authenticated;

COMMENT ON FUNCTION public.accept_invite(TEXT) IS
'Accepts an invite atomically: creates tenant_property_link, updates invite usage, and sets role=tenant if unset.
 Returns (success, out_status, out_property_id, out_property_name, out_error).';

-- Optional hardening: ensure trigger function to set landlord_id has safe search_path
CREATE OR REPLACE FUNCTION public.set_tenant_link_landlord_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Populate landlord_id from properties whenever a link is inserted
  NEW.landlord_id := (
    SELECT p.landlord_id FROM public.properties AS p WHERE p.id = NEW.property_id
  );
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_tenant_link_landlord_id_trg'
  ) THEN
    CREATE TRIGGER set_tenant_link_landlord_id_trg
    BEFORE INSERT ON public.tenant_property_links
    FOR EACH ROW
    EXECUTE FUNCTION public.set_tenant_link_landlord_id();
  END IF;
END $$;

