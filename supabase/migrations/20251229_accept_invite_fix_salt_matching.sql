-- ============================================================================
-- Migration: Fix accept_invite() to use salted token hashing
-- Date: 2025-12-29
-- Purpose: Fix hash mismatch - create_invite uses hash(token+salt),
--          but accept_invite was using hash(token) without salt
-- ============================================================================

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

  -- Find invite by computing hash WITH salt for each candidate
  -- This matches how create_invite generates token_hash: hash(token + salt)
  SELECT i.*, p.name AS property_name
  INTO v_invite
  FROM public.invites AS i
  JOIN public.properties AS p ON p.id = i.property_id
  WHERE i.deleted_at IS NULL
    AND (i.expires_at IS NULL OR i.expires_at > now())
    AND i.token_hash = encode(digest(p_token || i.token_salt, 'sha256'), 'hex');

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

  -- Create tenant-property link (using is_active boolean, not status)
  INSERT INTO public.tenant_property_links (tenant_id, property_id, is_active)
  VALUES (v_user_id, v_invite.property_id, true);

  -- Update invite acceptance tracking (using actual columns that exist)
  UPDATE public.invites
  SET accepted_at = now(),
      accepted_by = v_user_id
  WHERE id = v_invite.id;

  -- Set tenant role only if currently NULL (do not overwrite existing role)
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
'Accepts an invite atomically: creates tenant_property_link, updates invite acceptance, and sets role=tenant if unset.
Uses salted token hashing to match how create_invite generates tokens: hash(token + salt).
Returns (success, out_status, out_property_id, out_property_name, out_error).';
