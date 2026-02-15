-- Fix accept_invite RPC to preserve existing landlord role
-- Bug: Previously, accept_invite unconditionally set role='tenant',
-- which caused landlords to be demoted when accepting invites.
-- Fix: Only set role to 'tenant' if the user doesn't already have a role.

CREATE OR REPLACE FUNCTION public.accept_invite(p_token text)
 RETURNS TABLE(success boolean, out_status text, out_property_id uuid, out_property_name text, out_error text)
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

  -- Find invite by computing hash WITH salt for each candidate
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

  -- Already linked check
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_property_links AS tpl
    WHERE tpl.tenant_id = v_user_id AND tpl.property_id = v_invite.property_id
  ) INTO v_already_linked;

  IF v_already_linked THEN
    -- FIXED: Only set role to tenant if no role exists (preserve landlord role)
    UPDATE public.profiles
    SET role = COALESCE(role, 'tenant')
    WHERE id = v_user_id;
    RETURN QUERY SELECT TRUE, 'ALREADY_LINKED', v_invite.property_id, v_invite.property_name, NULL::TEXT;
    RETURN;
  END IF;

  -- Create tenant-property link
  INSERT INTO public.tenant_property_links (tenant_id, property_id, is_active)
  VALUES (v_user_id, v_invite.property_id, true);

  -- Update invite acceptance tracking
  UPDATE public.invites
  SET accepted_at = now(),
      accepted_by = v_user_id
  WHERE id = v_invite.id;

  -- FIXED: Only set role to tenant if user doesn't already have a role
  -- This preserves landlord role for landlords who accept invites to their own properties
  -- or for landlords who are also tenants elsewhere
  UPDATE public.profiles
  SET role = COALESCE(role, 'tenant')
  WHERE id = v_user_id;

  RETURN QUERY SELECT TRUE, 'OK', v_invite.property_id, v_invite.property_name, NULL::TEXT;

EXCEPTION
  WHEN unique_violation THEN
    -- Concurrent insert attempted; treat as already linked
    UPDATE public.profiles SET role = COALESCE(role, 'tenant') WHERE id = v_user_id;
    RETURN QUERY SELECT TRUE, 'ALREADY_LINKED', v_invite.property_id, v_invite.property_name, NULL::TEXT;
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, 'ERROR', NULL::UUID, NULL::TEXT, SQLERRM;
END;
$function$;

-- Add comment explaining the fix
COMMENT ON FUNCTION public.accept_invite(text) IS
'Accept a tenant invite token and link tenant to property.
Fixed: Uses COALESCE(role, ''tenant'') to preserve existing role (e.g., landlord).
This prevents landlords from being demoted to tenant when accepting invites.';
