-- Debug current RLS state for maintenance_requests table
-- This script will help identify what policies are active and why the INSERT is failing

-- Check if RLS is enabled on maintenance_requests
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'maintenance_requests';

-- List all current policies on maintenance_requests table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'maintenance_requests'
ORDER BY policyname;

-- Check JWT function availability
SELECT auth.jwt() ->> 'sub' as clerk_user_id;

-- Check if the user profile exists for the failing Clerk user
SELECT id, clerk_user_id, role, full_name 
FROM profiles 
WHERE clerk_user_id = 'user_32D3tASWubEjlYfTrsjJKO2dl04';

-- Check if property exists
SELECT id, landlord_id, address, property_code
FROM properties 
WHERE id = 'ec4f8fe2-58ff-432c-bf61-7c81bfed340e';

-- Check tenant-property link
SELECT tpl.*, p.clerk_user_id, p.role
FROM tenant_property_links tpl
JOIN profiles p ON p.id = tpl.tenant_id
WHERE tpl.property_id = 'ec4f8fe2-58ff-432c-bf61-7c81bfed340e'
  AND p.clerk_user_id = 'user_32D3tASWubEjlYfTrsjJKO2dl04'
  AND tpl.is_active = true;

-- Test the insert policy logic manually
-- This simulates what the policy check does
WITH current_user_profile AS (
  SELECT id, role FROM profiles 
  WHERE clerk_user_id = 'user_32D3tASWubEjlYfTrsjJKO2dl04'
),
tenant_properties AS (
  SELECT property_id FROM tenant_property_links tpl
  JOIN profiles p ON p.id = tpl.tenant_id
  WHERE p.clerk_user_id = 'user_32D3tASWubEjlYfTrsjJKO2dl04'
    AND tpl.is_active = true
)
SELECT 
  'Tenant ID check' as check_type,
  CASE 
    WHEN '71a2098e-afb6-4e24-82e7-e1ab4be57ee6' IN (SELECT id::text FROM current_user_profile WHERE role = 'tenant') 
    THEN 'PASS' 
    ELSE 'FAIL' 
  END as result
UNION ALL
SELECT 
  'Property access check' as check_type,
  CASE 
    WHEN 'ec4f8fe2-58ff-432c-bf61-7c81bfed340e' IN (SELECT property_id::text FROM tenant_properties)
    THEN 'PASS' 
    ELSE 'FAIL' 
  END as result;