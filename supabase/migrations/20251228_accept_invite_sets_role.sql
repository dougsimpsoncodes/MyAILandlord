-- ============================================================================
-- Migration: Add Atomic Role Setting to accept_invite
-- Date: 2025-12-28
-- Description: Update accept_invite() to set tenant role atomically with
--              link creation. This eliminates client-side race conditions
--              and makes the operation truly atomic.
-- ============================================================================

-- Drop old function since we're changing the return type
DROP FUNCTION IF EXISTS public.accept_invite(TEXT);

CREATE OR REPLACE FUNCTION public.accept_invite(p_token TEXT)
RETURNS TABLE(
  success BOOLEAN,
  property_id UUID,
  property_name TEXT,
  status TEXT,  -- New: 'OK', 'ALREADY_LINKED', 'EXPIRED', 'INVALID', 'REVOKED'
  error TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_invite RECORD;
  v_user_id UUID;
  v_already_linked BOOLEAN;
  v_property_name TEXT;
  v_current_role TEXT;
BEGIN
  -- Verify user is authenticated
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, 'INVALID'::TEXT, 'Authentication required'::TEXT;
    RETURN;
  END IF;

  -- Find and LOCK invite (prevents race conditions)
  -- Note: Must hash token with salt to compare
  SELECT
    i.id,
    i.property_id,
    i.accepted_at,
    i.accepted_by,
    p.name
  INTO v_invite
  FROM public.invites i
  JOIN public.properties p ON p.id = i.property_id
  WHERE i.token_hash = encode(extensions.digest(p_token || i.token_salt, 'sha256'::text), 'hex')
    AND i.deleted_at IS NULL
    AND i.expires_at > NOW()
  FOR UPDATE;  -- Row-level lock prevents concurrent accepts

  -- Validate invite exists
  IF v_invite.id IS NULL THEN
    -- Check if it's expired vs invalid
    IF EXISTS (
      SELECT 1 FROM public.invites i
      WHERE i.token_hash = encode(extensions.digest(p_token || i.token_salt, 'sha256'::text), 'hex')
        AND i.deleted_at IS NULL
        AND i.expires_at <= NOW()
    ) THEN
      RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, 'EXPIRED'::TEXT, 'This invite link has expired. Please request a new one.'::TEXT;
    ELSE
      RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, 'INVALID'::TEXT, 'Invalid or expired invite'::TEXT;
    END IF;
    RETURN;
  END IF;

  v_property_name := v_invite.name;

  -- IDEMPOTENCY CHECK: If already accepted by THIS user, return success
  IF v_invite.accepted_at IS NOT NULL AND v_invite.accepted_by = v_user_id THEN
    -- Check if tenant-property link exists
    SELECT EXISTS (
      SELECT 1 FROM public.tenant_property_links
      WHERE tenant_id = v_user_id AND tenant_property_links.property_id = v_invite.property_id
    ) INTO v_already_linked;

    IF v_already_linked THEN
      -- Already fully processed, ensure tenant role is set (idempotent)
      SELECT role INTO v_current_role FROM public.profiles WHERE id = v_user_id;

      -- Only set tenant role if currently NULL
      IF v_current_role IS NULL THEN
        UPDATE public.profiles
        SET role = 'tenant', updated_at = NOW()
        WHERE id = v_user_id;
      END IF;

      -- Return success with ALREADY_LINKED status
      RETURN QUERY SELECT TRUE, v_invite.property_id, v_property_name, 'ALREADY_LINKED'::TEXT, NULL::TEXT;
      RETURN;
    END IF;
    -- Link missing, recreate below (recovery from partial state)
  END IF;

  -- RACE PROTECTION: Ensure not already accepted by DIFFERENT user
  IF v_invite.accepted_at IS NOT NULL AND v_invite.accepted_by != v_user_id THEN
    -- Someone else already accepted this invite
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, 'INVALID'::TEXT, 'Invalid or expired invite'::TEXT;
    RETURN;
  END IF;

  -- BEGIN ATOMIC TRANSACTION BLOCK --

  -- 1. Mark invite as accepted (single-shot)
  UPDATE public.invites
  SET
    accepted_at = NOW(),
    accepted_by = v_user_id
  WHERE id = v_invite.id
    AND accepted_at IS NULL;  -- Double-check for race safety

  -- 2. Create tenant-property link (idempotent via ON CONFLICT)
  INSERT INTO public.tenant_property_links (tenant_id, property_id)
  VALUES (v_user_id, v_invite.property_id)
  ON CONFLICT (tenant_id, property_id) DO NOTHING;

  -- 3. Set tenant role ATOMICALLY (only if role is currently NULL)
  -- This prevents overwriting existing landlord roles
  SELECT role INTO v_current_role FROM public.profiles WHERE id = v_user_id;

  IF v_current_role IS NULL THEN
    UPDATE public.profiles
    SET role = 'tenant', updated_at = NOW()
    WHERE id = v_user_id
      AND role IS NULL;  -- Double-check to prevent race

    RAISE LOG 'accept_invite: Set tenant role for user %', v_user_id;
  ELSE
    RAISE LOG 'accept_invite: User % already has role %, not overwriting', v_user_id, v_current_role;
  END IF;

  -- END ATOMIC TRANSACTION BLOCK --

  -- Success - return property info
  RETURN QUERY SELECT TRUE, v_invite.property_id, v_property_name, 'OK'::TEXT, NULL::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invite(TEXT) TO authenticated;

COMMENT ON FUNCTION public.accept_invite(TEXT) IS
'Accepts invite token (authenticated users only).
Race-protected with FOR UPDATE lock.
Sets tenant role atomically with link creation (only if role is NULL).
Returns status codes: OK, ALREADY_LINKED, EXPIRED, INVALID, REVOKED.
Idempotent: same user accepting = success.';
