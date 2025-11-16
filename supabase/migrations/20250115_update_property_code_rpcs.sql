-- Update property code RPCs to use Supabase Auth (tenant_id UUID)
-- Drops legacy Clerk-based overloads and replaces with UUID signatures.
-- Run this in Supabase after the main auth migration.

BEGIN;

-- Drop legacy Clerk-based overloads if they exist
DO $$ BEGIN
  DROP FUNCTION IF EXISTS public.validate_property_code(TEXT, TEXT);
EXCEPTION WHEN undefined_function THEN NULL; END $$;

DO $$ BEGIN
  DROP FUNCTION IF EXISTS public.link_tenant_to_property(TEXT, TEXT, TEXT);
EXCEPTION WHEN undefined_function THEN NULL; END $$;

-- Validate property code using tenant_id (UUID)
CREATE OR REPLACE FUNCTION public.validate_property_code(
  input_code TEXT,
  tenant_id UUID
)
RETURNS TABLE(
  property_id UUID,
  property_name TEXT,
  property_address TEXT,
  is_multi_unit BOOLEAN,
  wifi_network TEXT,
  wifi_password TEXT,
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  prop_record RECORD;
  tenant_exists BOOLEAN;
  existing_link_id UUID;
BEGIN
  -- Verify tenant profile exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = tenant_id) INTO tenant_exists;
  IF NOT tenant_exists THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, FALSE, NULL::TEXT, NULL::TEXT, FALSE, 'Tenant profile not found';
    RETURN;
  END IF;

  -- Find property by code (case-insensitive)
  SELECT p.id, p.name, p.address, p.allow_tenant_signup, p.code_expires_at, p.wifi_network, p.wifi_password
  INTO prop_record
  FROM public.properties p
  WHERE p.property_code = upper(input_code);

  IF prop_record.id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, FALSE, NULL::TEXT, NULL::TEXT, FALSE, 'Invalid property code';
    RETURN;
  END IF;

  -- Check if code is expired
  IF prop_record.code_expires_at IS NOT NULL AND prop_record.code_expires_at < NOW() THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, FALSE, NULL::TEXT, NULL::TEXT, FALSE, 'Property code has expired';
    RETURN;
  END IF;

  -- Check if tenant signup is allowed
  IF NOT prop_record.allow_tenant_signup THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, FALSE, NULL::TEXT, NULL::TEXT, FALSE, 'Tenant signup not allowed for this property';
    RETURN;
  END IF;

  -- Check if tenant is already linked to this property
  SELECT id INTO existing_link_id
  FROM public.tenant_property_links
  WHERE tenant_id = tenant_id AND property_id = prop_record.id AND is_active = true
  LIMIT 1;

  IF existing_link_id IS NOT NULL THEN
    RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, FALSE, NULL::TEXT, NULL::TEXT, FALSE, 'You are already linked to this property';
    RETURN;
  END IF;

  -- Return property info and whether it appears multi-unit
  RETURN QUERY SELECT 
    prop_record.id,
    prop_record.name,
    prop_record.address,
    (SELECT COUNT(*) > 1 FROM public.tenant_property_links tpl WHERE tpl.property_id = prop_record.id),
    prop_record.wifi_network,
    prop_record.wifi_password,
    TRUE,
    'Property code validated successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.validate_property_code(TEXT, UUID) TO authenticated;

-- Link tenant to property using tenant_id (UUID)
CREATE OR REPLACE FUNCTION public.link_tenant_to_property(
  input_code TEXT,
  tenant_id UUID,
  unit_number TEXT DEFAULT NULL
)
RETURNS TABLE(
  link_id UUID,
  success BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  validated RECORD;
  new_link_id UUID;
  tenant_exists BOOLEAN;
BEGIN
  -- Ensure tenant exists
  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = tenant_id) INTO tenant_exists;
  IF NOT tenant_exists THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Tenant profile not found';
    RETURN;
  END IF;

  -- Validate property code first
  SELECT * INTO validated 
  FROM public.validate_property_code(input_code, tenant_id)
  WHERE success = true
  LIMIT 1;

  IF validated.property_id IS NULL THEN
    RETURN QUERY SELECT NULL::UUID, FALSE, 'Property code validation failed';
    RETURN;
  END IF;

  -- Create the tenant-property link
  INSERT INTO public.tenant_property_links (
    tenant_id,
    property_id,
    unit_number,
    is_active,
    invitation_status,
    accepted_at
  ) VALUES (
    tenant_id,
    validated.property_id,
    unit_number,
    true,
    'active',
    NOW()
  ) RETURNING id INTO new_link_id;

  RETURN QUERY SELECT new_link_id, TRUE, 'Successfully linked to property'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.link_tenant_to_property(TEXT, UUID, TEXT) TO authenticated;

COMMIT;

