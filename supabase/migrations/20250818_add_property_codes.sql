-- Add property code system for tenant linking
-- Migration: Add property codes and tenant onboarding support

BEGIN;

-- Add property code fields to properties table
ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS property_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS code_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS allow_tenant_signup BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS onboarding_message TEXT,
ADD COLUMN IF NOT EXISTS wifi_network TEXT,
ADD COLUMN IF NOT EXISTS wifi_password TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact TEXT,
ADD COLUMN IF NOT EXISTS emergency_phone TEXT;

-- Add invitation status to tenant_property_links
ALTER TABLE tenant_property_links 
ADD COLUMN IF NOT EXISTS invitation_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS invited_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

-- Add constraint for invitation status
ALTER TABLE tenant_property_links 
ADD CONSTRAINT check_invitation_status 
CHECK (invitation_status IN ('pending', 'active', 'expired', 'revoked'));

-- Create function to generate property codes
CREATE OR REPLACE FUNCTION generate_property_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists_already BOOLEAN;
BEGIN
    LOOP
        -- Generate 6-character code: 3 letters + 3 numbers
        code := upper(
            chr(65 + floor(random() * 26)::int) ||
            chr(65 + floor(random() * 26)::int) ||
            chr(65 + floor(random() * 26)::int) ||
            floor(random() * 10)::text ||
            floor(random() * 10)::text ||
            floor(random() * 10)::text
        );
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM properties WHERE property_code = code) INTO exists_already;
        
        -- If unique, return the code
        IF NOT exists_already THEN
            RETURN code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create function to validate and use property codes
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
    SELECT id INTO existing_link_id
    FROM tenant_property_links
    WHERE tenant_id = tenant_profile_id AND property_id = prop_record.id AND is_active = true;
    
    IF existing_link_id IS NOT NULL THEN
        RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, FALSE, NULL::TEXT, NULL::TEXT, FALSE, 'You are already linked to this property';
        RETURN;
    END IF;
    
    -- Check if this is a multi-unit property
    RETURN QUERY SELECT 
        prop_record.id,
        prop_record.name,
        prop_record.address,
        (SELECT COUNT(*) > 1 FROM tenant_property_links WHERE property_id = prop_record.id),
        prop_record.wifi_network,
        prop_record.wifi_password,
        TRUE,
        'Property code validated successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to link tenant to property
CREATE OR REPLACE FUNCTION link_tenant_to_property(
    input_code TEXT,
    tenant_clerk_id TEXT,
    unit_number TEXT DEFAULT NULL
)
RETURNS TABLE(
    link_id UUID,
    success BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    prop_record RECORD;
    tenant_profile_id UUID;
    new_link_id UUID;
BEGIN
    -- Validate the property code first
    SELECT property_id INTO prop_record 
    FROM validate_property_code(input_code, tenant_clerk_id) 
    WHERE success = true;
    
    IF prop_record.property_id IS NULL THEN
        RETURN QUERY SELECT NULL::UUID, FALSE, 'Property code validation failed';
        RETURN;
    END IF;
    
    -- Get tenant profile ID
    SELECT id INTO tenant_profile_id 
    FROM profiles 
    WHERE clerk_user_id = tenant_clerk_id;
    
    -- Create the tenant-property link
    INSERT INTO tenant_property_links (
        tenant_id,
        property_id,
        unit_number,
        is_active,
        invitation_status,
        accepted_at
    ) VALUES (
        tenant_profile_id,
        prop_record.property_id,
        unit_number,
        true,
        'active',
        NOW()
    ) RETURNING id INTO new_link_id;
    
    RETURN QUERY SELECT new_link_id, TRUE, 'Successfully linked to property'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_properties_code ON properties(property_code) WHERE property_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenant_links_tenant_property ON tenant_property_links(tenant_id, property_id);
CREATE INDEX IF NOT EXISTS idx_tenant_links_active ON tenant_property_links(is_active) WHERE is_active = true;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_property_code() TO authenticated;
GRANT EXECUTE ON FUNCTION validate_property_code(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION link_tenant_to_property(TEXT, TEXT, TEXT) TO authenticated;

-- Create some sample property codes for testing
UPDATE properties 
SET 
    property_code = generate_property_code(),
    code_expires_at = NOW() + INTERVAL '90 days',
    allow_tenant_signup = true,
    wifi_network = 'Property_Guest',
    wifi_password = 'welcome123',
    emergency_contact = 'Property Manager',
    emergency_phone = '(555) 123-4567'
WHERE property_code IS NULL;

-- Display the generated codes for testing
SELECT 
    name,
    property_code,
    code_expires_at,
    wifi_network
FROM properties 
WHERE property_code IS NOT NULL
ORDER BY name;

COMMIT;