-- Setup test data for maintenance request debugging
-- This creates the necessary records to allow the maintenance request to succeed

-- First, ensure the profile exists
INSERT INTO profiles (
  id,
  clerk_user_id, 
  email, 
  name, 
  role, 
  created_at, 
  updated_at
) VALUES (
  'fc7ff5e0-db84-4164-a1e2-a60bff2ac278',
  'user_30ODEM6qBd8hMikaCUGP59IClEG',
  'test-tenant@example.com',
  'Test Tenant',
  'tenant',
  NOW(),
  NOW()
) ON CONFLICT (clerk_user_id) DO UPDATE SET
  role = 'tenant',
  updated_at = NOW();

-- Create a landlord profile for the property
INSERT INTO profiles (
  id,
  clerk_user_id,
  email,
  name,
  role,
  created_at,
  updated_at
) VALUES (
  '22222222-2222-2222-2222-222222222222',
  'landlord-test-id',
  'test-landlord@example.com',
  'Test Landlord',
  'landlord',
  NOW(),
  NOW()
) ON CONFLICT (clerk_user_id) DO UPDATE SET
  role = 'landlord',
  updated_at = NOW();

-- Create the property
INSERT INTO properties (
  id,
  landlord_id,
  name,
  address,
  description,
  created_at,
  updated_at
) VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '22222222-2222-2222-2222-222222222222',
  'Test Property',
  '123 Test Street, Test City',
  'A test property for maintenance requests',
  NOW(),
  NOW()
) ON CONFLICT (id) DO UPDATE SET
  updated_at = NOW();

-- Create the tenant-property link
INSERT INTO tenant_property_links (
  id,
  tenant_id,
  property_id,
  unit_number,
  is_active,
  created_at,
  updated_at
) VALUES (
  '33333333-3333-3333-3333-333333333333',
  'fc7ff5e0-db84-4164-a1e2-a60bff2ac278',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'Unit 1',
  true,
  NOW(),
  NOW()
) ON CONFLICT (tenant_id, property_id) DO UPDATE SET
  is_active = true,
  updated_at = NOW();

-- Verify the setup
SELECT 'Setup verification:' as status;

SELECT 
  'Profile check:' as check_type,
  clerk_user_id,
  role,
  id
FROM profiles 
WHERE clerk_user_id = 'fc7ff5e0-db84-4164-a1e2-a60bff2ac278';

SELECT 
  'Property check:' as check_type,
  id,
  name,
  landlord_id
FROM properties 
WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

SELECT 
  'Link check:' as check_type,
  tpl.tenant_id,
  tpl.property_id,
  tpl.is_active,
  p.clerk_user_id as tenant_clerk_id
FROM tenant_property_links tpl
JOIN profiles p ON p.id = tpl.tenant_id
WHERE tpl.property_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
AND p.clerk_user_id = 'fc7ff5e0-db84-4164-a1e2-a60bff2ac278';
