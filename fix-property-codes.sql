-- Fix property codes and validation function
-- Run this in Supabase SQL Editor

-- First, check what properties exist and their codes
SELECT id, name, property_code, code_expires_at, allow_tenant_signup 
FROM properties 
LIMIT 10;

-- Generate property codes for all properties that don't have one
UPDATE properties 
SET 
    property_code = generate_property_code(),
    code_expires_at = NOW() + INTERVAL '90 days',
    allow_tenant_signup = true
WHERE property_code IS NULL;

-- Fix the validate_property_code function (ambiguous column reference)
CREATE OR REPLACE FUNCTION validate_property_code(
    input_code TEXT,
    tenant_clerk_id TEXT
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
    tenant_profile_id UUID;
    existing_link_id UUID;
BEGIN
    -- Get tenant profile ID
    SELECT id INTO tenant_profile_id 
    FROM profiles 
    WHERE clerk_user_id = tenant_clerk_id;
    
    IF tenant_profile_id IS NULL THEN
        RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, FALSE, NULL::TEXT, NULL::TEXT, FALSE, 'Tenant profile not found';
        RETURN;
    END IF;
    
    -- Find property by code
    SELECT p.id, p.name, p.address, p.allow_tenant_signup, p.code_expires_at, p.wifi_network, p.wifi_password
    INTO prop_record
    FROM properties p
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
    SELECT tpl.id INTO existing_link_id
    FROM tenant_property_links tpl
    WHERE tpl.tenant_id = tenant_profile_id AND tpl.property_id = prop_record.id AND tpl.is_active = true;
    
    IF existing_link_id IS NOT NULL THEN
        RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, FALSE, NULL::TEXT, NULL::TEXT, FALSE, 'You are already linked to this property';
        RETURN;
    END IF;
    
    -- Check if this is a multi-unit property (fixed: use tpl alias)
    RETURN QUERY SELECT 
        prop_record.id,
        prop_record.name,
        prop_record.address,
        (SELECT COUNT(*) > 1 FROM tenant_property_links tpl WHERE tpl.property_id = prop_record.id),
        prop_record.wifi_network,
        prop_record.wifi_password,
        TRUE,
        'Property code validated successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Show the generated property codes
SELECT id, name, property_code, code_expires_at 
FROM properties 
WHERE property_code IS NOT NULL
ORDER BY name;

-- Show the specific test property code
SELECT name, property_code, code_expires_at 
FROM properties 
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';