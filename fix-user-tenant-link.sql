-- Fix tenant-property link for the user experiencing RLS issues
-- This creates the missing link between the actual user and the test property

-- Temporarily disable RLS for this fix
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE properties DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_property_links DISABLE ROW LEVEL SECURITY;

-- Update the existing profile to use the correct Clerk user ID
-- The user in the logs has clerk_user_id: user_30ODEM6qBd8hMikaCUGP59IClEG
-- and profile ID: fc7ff5e0-db84-4164-a1e2-a60bff2ac278

UPDATE profiles 
SET clerk_user_id = 'user_30ODEM6qBd8hMikaCUGP59IClEG',
    role = 'tenant',
    name = 'Test User',
    email = 'test@example.com'
WHERE id = 'fc7ff5e0-db84-4164-a1e2-a60bff2ac278';

-- If the profile doesn't exist, create it
INSERT INTO profiles (id, clerk_user_id, role, name, email, created_at, updated_at) 
SELECT 
    'fc7ff5e0-db84-4164-a1e2-a60bff2ac278'::uuid,
    'user_30ODEM6qBd8hMikaCUGP59IClEG',
    'tenant',
    'Test User',
    'test@example.com',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = 'fc7ff5e0-db84-4164-a1e2-a60bff2ac278'::uuid
);

-- Create or update the tenant-property link for this user and the test property
INSERT INTO tenant_property_links (id, tenant_id, property_id, unit_number, is_active, created_at, updated_at)
VALUES (
    gen_random_uuid(),
    'fc7ff5e0-db84-4164-a1e2-a60bff2ac278'::uuid,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    '2A',
    true,
    NOW(),
    NOW()
)
ON CONFLICT (tenant_id, property_id) 
DO UPDATE SET 
    is_active = true,
    updated_at = NOW();

-- Make sure the property exists and is owned by a landlord
INSERT INTO properties (id, name, address, landlord_id, property_type, unit, bedrooms, bathrooms, created_at, updated_at)
VALUES (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
    'Test Apartment Complex',
    '123 Test Street, Unit 2A, Test City, CA 90210',
    '33333333-3333-3333-3333-333333333333'::uuid,  -- Use existing landlord
    'apartment',
    '2A',
    2,
    1,
    NOW(),
    NOW()
)
ON CONFLICT (id) 
DO UPDATE SET 
    name = EXCLUDED.name,
    updated_at = NOW();

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_property_links ENABLE ROW LEVEL SECURITY;

-- Verify the fix
SELECT 'Profile check:' AS check_type, id, clerk_user_id, role, name 
FROM profiles 
WHERE id = 'fc7ff5e0-db84-4164-a1e2-a60bff2ac278'::uuid;

SELECT 'Property check:' AS check_type, id, name 
FROM properties 
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;

SELECT 'Tenant-property link check:' AS check_type, id, tenant_id, property_id, unit_number, is_active 
FROM tenant_property_links 
WHERE tenant_id = 'fc7ff5e0-db84-4164-a1e2-a60bff2ac278'::uuid 
AND property_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;

SELECT 'Fix completed successfully!' AS message;