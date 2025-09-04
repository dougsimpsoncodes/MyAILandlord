-- Create trigger to auto-generate property codes for new properties
-- This ensures all new properties automatically get a unique property code

-- First, make sure all existing properties have codes
UPDATE properties 
SET 
    property_code = generate_property_code(),
    code_expires_at = NOW() + INTERVAL '90 days',
    allow_tenant_signup = true
WHERE property_code IS NULL;

-- Create trigger function
CREATE OR REPLACE FUNCTION auto_generate_property_code()
RETURNS TRIGGER AS $$
BEGIN
    -- If no property code is provided, generate one
    IF NEW.property_code IS NULL THEN
        NEW.property_code := generate_property_code();
        NEW.code_expires_at := NOW() + INTERVAL '90 days';
        NEW.allow_tenant_signup := true;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_property_code ON properties;
CREATE TRIGGER trigger_auto_generate_property_code
    BEFORE INSERT ON properties
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_property_code();

-- Verify all properties have codes
SELECT 
    name,
    property_code,
    allow_tenant_signup,
    CASE 
        WHEN property_code IS NULL THEN '❌ Missing code'
        ELSE '✅ Has code'
    END as status
FROM properties 
ORDER BY name;