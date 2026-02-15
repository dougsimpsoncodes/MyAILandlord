-- ============================================================================
-- Migration: Onboarding Redesign - Database Foundation
-- Date: 2025-12-31
-- Purpose: Add onboarding_completed flag and atomic RPC functions for new onboarding flow
-- ============================================================================

-- ============================================================================
-- PART 1: Schema Changes - Add onboarding_completed to profiles
-- ============================================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN public.profiles.onboarding_completed IS
'Indicates if user has completed initial onboarding. Auto-set by triggers when:
- Landlord: Has created at least one property
- Tenant: Has accepted at least one invite';

-- ============================================================================
-- PART 2: Landlord Atomic Onboarding RPC
-- ============================================================================

CREATE OR REPLACE FUNCTION public.signup_and_onboard_landlord(
  p_property_name TEXT,
  p_address_jsonb JSONB,
  p_property_type TEXT DEFAULT NULL,
  p_bedrooms INTEGER DEFAULT NULL,
  p_bathrooms NUMERIC DEFAULT NULL,
  p_areas TEXT[] DEFAULT NULL
)
RETURNS TABLE(
  success BOOLEAN,
  property_id UUID,
  profile_id UUID,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_property_id UUID;
  v_area TEXT;
BEGIN
  -- Validate authentication
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, 'User not authenticated';
    RETURN;
  END IF;

  -- Validate required inputs
  IF p_property_name IS NULL OR trim(p_property_name) = '' THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, 'Property name is required';
    RETURN;
  END IF;

  -- Ensure profile exists with landlord role (update if exists, insert if not)
  INSERT INTO public.profiles (id, email, role, name)
  VALUES (
    v_user_id,
    (SELECT email FROM auth.users WHERE id = v_user_id),
    'landlord',
    (SELECT COALESCE(raw_user_meta_data->>'name', email) FROM auth.users WHERE id = v_user_id)
  )
  ON CONFLICT (id) DO UPDATE
  SET role = COALESCE(profiles.role, 'landlord'); -- Don't overwrite existing role

  -- Create property atomically
  INSERT INTO public.properties (
    name,
    address_jsonb,
    property_type,
    bedrooms,
    bathrooms,
    landlord_id
  )
  VALUES (
    p_property_name,
    p_address_jsonb,
    p_property_type,
    p_bedrooms,
    p_bathrooms,
    v_user_id
  )
  RETURNING id INTO v_property_id;

  -- Create property areas if provided
  IF p_areas IS NOT NULL AND array_length(p_areas, 1) > 0 THEN
    FOREACH v_area IN ARRAY p_areas
    LOOP
      INSERT INTO public.property_areas (property_id, name, area_type)
      VALUES (v_property_id, v_area, 'general')
      ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  -- Set onboarding_completed = true (landlord has created first property)
  UPDATE public.profiles
  SET onboarding_completed = TRUE
  WHERE id = v_user_id;

  RETURN QUERY SELECT TRUE, v_property_id, v_user_id, NULL::TEXT;

EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::UUID, SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.signup_and_onboard_landlord TO authenticated;

COMMENT ON FUNCTION public.signup_and_onboard_landlord IS
'Atomic landlord onboarding: creates/updates profile with landlord role, creates property with optional areas, and marks onboarding complete.
Returns (success, property_id, profile_id, error_message).';

-- ============================================================================
-- PART 3: Tenant Atomic Onboarding RPC (Enhanced accept_invite)
-- ============================================================================

DROP FUNCTION IF EXISTS public.signup_and_accept_invite(TEXT);

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
  v_token_hash TEXT;
  v_invite RECORD;
  v_already_linked BOOLEAN := FALSE;
  v_user_email TEXT;
  v_user_name TEXT;
BEGIN
  -- Validate authentication
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'NOT_AUTHENTICATED', NULL::UUID, NULL::TEXT, NULL::UUID, 'User not authenticated';
    RETURN;
  END IF;

  -- Validate token
  IF p_token IS NULL OR length(trim(p_token)) = 0 THEN
    RETURN QUERY SELECT FALSE, 'INVALID', NULL::UUID, NULL::TEXT, NULL::UUID, 'Token is required';
    RETURN;
  END IF;

  -- Get user info from auth.users
  SELECT email, COALESCE(raw_user_meta_data->>'name', email)
  INTO v_user_email, v_user_name
  FROM auth.users
  WHERE id = v_user_id;

  -- Use provided name if available, otherwise use auth metadata
  v_user_name := COALESCE(p_name, v_user_name);

  -- Compute token hash
  v_token_hash := encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');

  -- Find valid invite
  SELECT i.*, p.name AS property_name
  INTO v_invite
  FROM public.invites AS i
  JOIN public.properties AS p ON p.id = i.property_id
  WHERE i.token_hash = v_token_hash
    AND i.deleted_at IS NULL
    AND (i.expires_at IS NULL OR i.expires_at > now());

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'INVALID', NULL::UUID, NULL::TEXT, NULL::UUID, 'Invalid or expired invite';
    RETURN;
  END IF;

  -- Check if already linked
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_property_links AS tpl
    WHERE tpl.tenant_id = v_user_id AND tpl.property_id = v_invite.property_id
  ) INTO v_already_linked;

  IF v_already_linked THEN
    -- Still mark onboarding complete
    UPDATE public.profiles
    SET onboarding_completed = TRUE
    WHERE id = v_user_id;

    RETURN QUERY SELECT TRUE, 'ALREADY_LINKED', v_invite.property_id, v_invite.property_name, v_user_id, NULL::TEXT;
    RETURN;
  END IF;

  -- Create or update profile with tenant role
  INSERT INTO public.profiles (id, email, role, name)
  VALUES (v_user_id, v_user_email, 'tenant', v_user_name)
  ON CONFLICT (id) DO UPDATE
  SET
    role = COALESCE(profiles.role, 'tenant'),
    name = COALESCE(profiles.name, EXCLUDED.name);

  -- Create tenant-property link
  INSERT INTO public.tenant_property_links (tenant_id, property_id, is_active)
  VALUES (v_user_id, v_invite.property_id, true);

  -- Update invite acceptance tracking
  UPDATE public.invites
  SET accepted_at = now(),
      accepted_by = v_user_id
  WHERE id = v_invite.id;

  -- Mark onboarding complete (tenant has accepted invite)
  UPDATE public.profiles
  SET onboarding_completed = TRUE
  WHERE id = v_user_id;

  RETURN QUERY SELECT TRUE, 'OK', v_invite.property_id, v_invite.property_name, v_user_id, NULL::TEXT;

EXCEPTION
  WHEN unique_violation THEN
    -- Concurrent insert; treat as already linked and mark complete
    UPDATE public.profiles
    SET onboarding_completed = TRUE
    WHERE id = v_user_id;

    RETURN QUERY SELECT TRUE, 'ALREADY_LINKED', v_invite.property_id, v_invite.property_name, v_user_id, NULL::TEXT;
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, 'ERROR', NULL::UUID, NULL::TEXT, NULL::UUID, SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.signup_and_accept_invite TO authenticated;

COMMENT ON FUNCTION public.signup_and_accept_invite IS
'Atomic tenant onboarding: creates/updates profile with tenant role, accepts invite, creates tenant-property link, and marks onboarding complete.
Returns (success, status, property_id, property_name, profile_id, error_message).';

-- ============================================================================
-- PART 4: Trigger to Auto-Complete Onboarding
-- ============================================================================

-- Trigger function: Mark landlord onboarding complete when first property created
CREATE OR REPLACE FUNCTION public.auto_complete_landlord_onboarding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a new property is created, mark the landlord's onboarding as complete
  UPDATE public.profiles
  SET onboarding_completed = TRUE
  WHERE id = NEW.landlord_id
    AND role = 'landlord'
    AND onboarding_completed = FALSE;

  RETURN NEW;
END;
$$;

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'auto_complete_landlord_onboarding_trg'
  ) THEN
    CREATE TRIGGER auto_complete_landlord_onboarding_trg
    AFTER INSERT ON public.properties
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_complete_landlord_onboarding();
  END IF;
END $$;

-- Trigger function: Mark tenant onboarding complete when first link created
CREATE OR REPLACE FUNCTION public.auto_complete_tenant_onboarding()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a tenant-property link is created, mark the tenant's onboarding as complete
  UPDATE public.profiles
  SET onboarding_completed = TRUE
  WHERE id = NEW.tenant_id
    AND onboarding_completed = FALSE;

  RETURN NEW;
END;
$$;

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'auto_complete_tenant_onboarding_trg'
  ) THEN
    CREATE TRIGGER auto_complete_tenant_onboarding_trg
    AFTER INSERT ON public.tenant_property_links
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_complete_tenant_onboarding();
  END IF;
END $$;

-- ============================================================================
-- PART 5: Backfill onboarding_completed for existing users
-- ============================================================================

-- Mark existing landlords with properties as onboarding complete
UPDATE public.profiles
SET onboarding_completed = TRUE
WHERE role = 'landlord'
  AND onboarding_completed = FALSE
  AND EXISTS (
    SELECT 1 FROM public.properties WHERE landlord_id = profiles.id
  );

-- Mark existing tenants with property links as onboarding complete
UPDATE public.profiles
SET onboarding_completed = TRUE
WHERE role = 'tenant'
  AND onboarding_completed = FALSE
  AND EXISTS (
    SELECT 1 FROM public.tenant_property_links WHERE tenant_id = profiles.id
  );

-- ============================================================================
-- PART 6: Helper function to check onboarding status
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_onboarding_status()
RETURNS TABLE(
  user_id UUID,
  role TEXT,
  onboarding_completed BOOLEAN,
  has_properties BOOLEAN,
  has_property_links BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.role::TEXT,
    p.onboarding_completed,
    EXISTS (SELECT 1 FROM public.properties WHERE landlord_id = p.id) AS has_properties,
    EXISTS (SELECT 1 FROM public.tenant_property_links WHERE tenant_id = p.id) AS has_property_links
  FROM public.profiles p
  WHERE p.id = v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_onboarding_status TO authenticated;

COMMENT ON FUNCTION public.get_onboarding_status IS
'Returns current user onboarding status including completion flag and related entity counts.';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
