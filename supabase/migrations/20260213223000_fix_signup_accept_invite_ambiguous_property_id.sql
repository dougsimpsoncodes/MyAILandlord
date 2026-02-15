-- Fix ambiguous identifier error in signup_and_accept_invite
-- Error observed during tenant invite acceptance:
--   "column reference \"property_id\" is ambiguous"
-- Root cause:
--   RETURNS TABLE defines output column `property_id`, and unqualified
--   references to `property_id` inside UPDATE can collide with it.

CREATE OR REPLACE FUNCTION public.signup_and_accept_invite(
  p_token TEXT,
  p_name TEXT DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  status TEXT,
  property_id UUID,
  property_name TEXT,
  profile_id UUID,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_invite RECORD;
  v_already_linked BOOLEAN := FALSE;
  v_user_email TEXT;
  v_user_name TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'NOT_AUTHENTICATED', NULL::UUID, NULL::TEXT, NULL::UUID, 'User not authenticated';
    RETURN;
  END IF;

  IF p_token IS NULL OR length(trim(p_token)) = 0 THEN
    RETURN QUERY SELECT FALSE, 'INVALID', NULL::UUID, NULL::TEXT, NULL::UUID, 'Token is required';
    RETURN;
  END IF;

  SELECT email, COALESCE(raw_user_meta_data->>'name', email)
  INTO v_user_email, v_user_name
  FROM auth.users
  WHERE id = v_user_id;

  v_user_name := COALESCE(p_name, v_user_name);

  SELECT i.*, p.name AS property_name
  INTO v_invite
  FROM public.invites AS i
  JOIN public.properties AS p ON p.id = i.property_id
  WHERE i.deleted_at IS NULL
    AND (i.expires_at IS NULL OR i.expires_at > now())
    AND i.token_hash = encode(extensions.digest(p_token || i.token_salt, 'sha256'), 'hex');

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'INVALID', NULL::UUID, NULL::TEXT, NULL::UUID, 'Invalid or expired invite';
    RETURN;
  END IF;

  INSERT INTO public.profiles (id, email, role, name)
  VALUES (v_user_id, v_user_email, 'tenant', v_user_name)
  ON CONFLICT (id) DO UPDATE
  SET
    role = COALESCE(public.profiles.role, 'tenant'),
    name = COALESCE(public.profiles.name, EXCLUDED.name);

  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_property_links tpl
    WHERE tpl.tenant_id = v_user_id
      AND tpl.property_id = v_invite.property_id
  ) INTO v_already_linked;

  -- Critical fix: qualify tpl.property_id to avoid collision with output variable
  UPDATE public.tenant_property_links AS tpl
  SET
    is_active = false,
    updated_at = now()
  WHERE tpl.tenant_id = v_user_id
    AND COALESCE(tpl.is_active, false) = true
    AND tpl.property_id <> v_invite.property_id;

  INSERT INTO public.tenant_property_links (
    tenant_id,
    property_id,
    is_active,
    invitation_status,
    accepted_at
  )
  VALUES (
    v_user_id,
    v_invite.property_id,
    true,
    'active',
    now()
  )
  ON CONFLICT (tenant_id, property_id)
  DO UPDATE SET
    is_active = true,
    invitation_status = 'active',
    accepted_at = COALESCE(public.tenant_property_links.accepted_at, now()),
    updated_at = now();

  UPDATE public.invites
  SET
    accepted_at = COALESCE(accepted_at, now()),
    accepted_by = COALESCE(accepted_by, v_user_id)
  WHERE id = v_invite.id;

  UPDATE public.profiles
  SET onboarding_completed = TRUE
  WHERE id = v_user_id;

  IF v_already_linked THEN
    RETURN QUERY SELECT TRUE, 'ALREADY_LINKED', v_invite.property_id, v_invite.property_name, v_user_id, NULL::TEXT;
  ELSE
    RETURN QUERY SELECT TRUE, 'OK', v_invite.property_id, v_invite.property_name, v_user_id, NULL::TEXT;
  END IF;

EXCEPTION
  WHEN unique_violation THEN
    RETURN QUERY SELECT FALSE, 'ERROR', NULL::UUID, NULL::TEXT, NULL::UUID, 'Tenant already has an active property link';
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, 'ERROR', NULL::UUID, NULL::TEXT, NULL::UUID, SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.signup_and_accept_invite(TEXT, TEXT) TO authenticated;
