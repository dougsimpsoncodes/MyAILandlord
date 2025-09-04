-- Verify test data exists (bypassing RLS)
-- Run this in Supabase SQL Editor

-- Check if our test data exists
SELECT 'Checking test data...' AS status;

-- Count maintenance requests
SELECT COUNT(*) AS total_maintenance_requests FROM maintenance_requests;

-- Show our specific test maintenance requests
SELECT id, title, status, priority, tenant_id, property_id, created_at 
FROM maintenance_requests 
WHERE id IN (
  '11111111-0001-0001-0001-000000000001',
  '22222222-0002-0002-0002-000000000002',
  '33333333-0003-0003-0003-000000000003',
  '44444444-0004-0004-0004-000000000004',
  '55555555-0005-0005-0005-000000000005',
  '66666666-0006-0006-0006-000000000006',
  '77777777-0007-0007-0007-000000000007',
  '88888888-0008-0008-0008-000000000008'
)
ORDER BY created_at DESC;

-- Check profiles
SELECT COUNT(*) AS total_profiles FROM profiles;
SELECT id, clerk_user_id, name, role FROM profiles 
WHERE clerk_user_id IN ('tenant_sarah_001', 'tenant_michael_002', 'landlord_john_001');

-- Check properties
SELECT COUNT(*) AS total_properties FROM properties;
SELECT id, name, user_id FROM properties 
WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');