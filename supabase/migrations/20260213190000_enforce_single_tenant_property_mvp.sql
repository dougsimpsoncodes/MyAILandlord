-- MVP rule: one active property per tenant.
-- This makes invite-link routing deterministic and eliminates ambiguous tenant home state.

-- 1) Clean up existing data: keep only the newest active link per tenant.
WITH ranked_active AS (
  SELECT
    id,
    tenant_id,
    ROW_NUMBER() OVER (
      PARTITION BY tenant_id
      ORDER BY COALESCE(updated_at, accepted_at, created_at) DESC NULLS LAST, id DESC
    ) AS rn
  FROM public.tenant_property_links
  WHERE COALESCE(is_active, false) = true
)
UPDATE public.tenant_property_links tpl
SET
  is_active = false,
  updated_at = now()
FROM ranked_active ra
WHERE tpl.id = ra.id
  AND ra.rn > 1;

-- 2) Enforce at schema level: max one active link per tenant.
CREATE UNIQUE INDEX IF NOT EXISTS ux_tenant_property_links_one_active_per_tenant
  ON public.tenant_property_links (tenant_id)
  WHERE is_active = true;

-- 3) Accept invite: always activate target property and deactivate other active links.
CREATE OR REPLACE FUNCTION public.accept_invite(p_token text)
RETURNS TABLE(
  success boolean,
  out_status text,
  out_property_id uuid,
  out_property_name text,
  out_error text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
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

  -- Salted token hash lookup
  SELECT i.*, p.name AS property_name
  INTO v_invite
  FROM public.invites AS i
  JOIN public.properties AS p ON p.id = i.property_id
  WHERE i.deleted_at IS NULL
    AND (i.expires_at IS NULL OR i.expires_at > now())
    AND i.token_hash = encode(extensions.digest(p_token || i.token_salt, 'sha256'), 'hex');

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'INVALID', NULL::UUID, NULL::TEXT, 'Invalid or expired invite';
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_property_links tpl
    WHERE tpl.tenant_id = v_user_id
      AND tpl.property_id = v_invite.property_id
  ) INTO v_already_linked;

  -- MVP single-property rule: deactivate any other active links for this tenant.
  UPDATE public.tenant_property_links
  SET
    is_active = false,
    updated_at = now()
  WHERE tenant_id = v_user_id
    AND COALESCE(is_active, false) = true
    AND property_id <> v_invite.property_id;

  -- Activate target link (insert or reactivate existing).
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

  -- Preserve existing landlord role if present.
  UPDATE public.profiles
  SET role = COALESCE(role, 'tenant')
  WHERE id = v_user_id;

  IF v_already_linked THEN
    RETURN QUERY SELECT TRUE, 'ALREADY_LINKED', v_invite.property_id, v_invite.property_name, NULL::TEXT;
  ELSE
    RETURN QUERY SELECT TRUE, 'OK', v_invite.property_id, v_invite.property_name, NULL::TEXT;
  END IF;

EXCEPTION
  WHEN unique_violation THEN
    RETURN QUERY SELECT FALSE, 'ERROR', NULL::UUID, NULL::TEXT, 'Tenant already has an active property link';
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, 'ERROR', NULL::UUID, NULL::TEXT, SQLERRM;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.accept_invite(text) TO authenticated;

COMMENT ON FUNCTION public.accept_invite(text) IS
'Accept invite token, activate exactly one property link for tenant, and deactivate any previous active property links.';

-- 4) Signup + accept invite: same single-property activation semantics for first-time flow.
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

  -- Salted token hash lookup
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

  -- MVP single-property rule: deactivate any other active links for this tenant.
  UPDATE public.tenant_property_links
  SET
    is_active = false,
    updated_at = now()
  WHERE tenant_id = v_user_id
    AND COALESCE(is_active, false) = true
    AND property_id <> v_invite.property_id;

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

COMMENT ON FUNCTION public.signup_and_accept_invite(TEXT, TEXT) IS
'Atomic signup+accept invite that enforces a single active property link for each tenant.';

-- 5) Property-code linking path also enforces one active property.
CREATE OR REPLACE FUNCTION public.link_tenant_to_property(
  input_code TEXT,
  tenant_id UUID,
  unit_number TEXT DEFAULT NULL
)
RETURNS TABLE(
  link_id UUID,
  success BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  prop_record RECORD;
  input_tenant_id UUID := tenant_id;
  v_link_id UUID;
BEGIN
  -- Validate the property code first
  SELECT vpc.property_id INTO prop_record
  FROM public.validate_property_code(input_code, input_tenant_id) vpc
  WHERE vpc.success = true;

  IF prop_record.property_id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Property code validation failed'::TEXT;
    RETURN;
  END IF;

  -- MVP single-property rule: deactivate any other active links for this tenant.
  UPDATE public.tenant_property_links
  SET
    is_active = false,
    updated_at = now()
  WHERE tenant_id = input_tenant_id
    AND COALESCE(is_active, false) = true
    AND property_id <> prop_record.property_id;

  INSERT INTO public.tenant_property_links (
    tenant_id,
    property_id,
    unit_number,
    is_active,
    invitation_status,
    accepted_at
  )
  VALUES (
    input_tenant_id,
    prop_record.property_id,
    unit_number,
    true,
    'active',
    now()
  )
  ON CONFLICT (tenant_id, property_id)
  DO UPDATE SET
    unit_number = COALESCE(EXCLUDED.unit_number, public.tenant_property_links.unit_number),
    is_active = true,
    invitation_status = 'active',
    accepted_at = COALESCE(public.tenant_property_links.accepted_at, now()),
    updated_at = now()
  RETURNING public.tenant_property_links.id INTO v_link_id;

  RETURN QUERY SELECT v_link_id, TRUE, NULL::TEXT;

EXCEPTION
  WHEN unique_violation THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Tenant already has an active property link'::TEXT;
  WHEN OTHERS THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, SQLERRM::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_tenant_to_property(TEXT, UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.link_tenant_to_property(TEXT, UUID, TEXT) IS
'Link tenant to property by code and enforce single active property link per tenant.';
