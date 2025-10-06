-- Debug maintenance_requests RLS issue
-- This script diagnoses why tenant maintenance request creation is failing

-- Check RLS is enabled on table
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables 
WHERE tablename = 'maintenance_requests';

-- List current policies on maintenance_requests
SELECT 
  policyname,
  cmd,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'maintenance_requests'
ORDER BY cmd, policyname;

-- Check the specific user and property data
SELECT 'Profile Check' as check_type, 
       p.id, 
       p.clerk_user_id, 
       p.role, 
       p.name,
       p.created_at
FROM profiles p 
WHERE p.clerk_user_id = 'user_32D3tASWubEjlYfTrsjJKO2dl04';

SELECT 'Property Check' as check_type, 
       prop.id, 
       prop.landlord_id, 
       prop.address,
       prop.property_code
FROM properties prop 
WHERE prop.id = 'ec4f8fe2-58ff-432c-bf61-7c81bfed340e';

-- Check tenant-property link
SELECT 'Tenant-Property Link Check' as check_type,
       tpl.id as link_id,
       tpl.tenant_id,
       tpl.property_id,
       tpl.is_active,
       tpl.created_at,
       p.clerk_user_id,
       p.role
FROM tenant_property_links tpl
JOIN profiles p ON p.id = tpl.tenant_id
WHERE tpl.property_id = 'ec4f8fe2-58ff-432c-bf61-7c81bfed340e'
  AND p.clerk_user_id = 'user_32D3tASWubEjlYfTrsjJKO2dl04';

-- Test the RLS policy logic step by step
-- This simulates what the INSERT policy checks
WITH policy_checks AS (
  -- Check 1: Does tenant_id match current user profile with role=tenant?
  SELECT 
    'tenant_id_check' as check_name,
    ('71a2098e-afb6-4e24-82e7-e1ab4be57ee6' IN (
      SELECT id::text FROM profiles 
      WHERE clerk_user_id = 'user_32D3tASWubEjlYfTrsjJKO2dl04' 
      AND role = 'tenant'
    )) as passes,
    (
      SELECT json_agg(json_build_object('id', id, 'clerk_user_id', clerk_user_id, 'role', role))
      FROM profiles 
      WHERE clerk_user_id = 'user_32D3tASWubEjlYfTrsjJKO2dl04'
    ) as user_profiles
  
  UNION ALL
  
  -- Check 2: Is property_id in tenant's active property links?
  SELECT 
    'property_access_check' as check_name,
    ('ec4f8fe2-58ff-432c-bf61-7c81bfed340e' IN (
      SELECT property_id::text FROM tenant_property_links tpl
      JOIN profiles p ON p.id = tpl.tenant_id
      WHERE p.clerk_user_id = 'user_32D3tASWubEjlYfTrsjJKO2dl04'
        AND tpl.is_active = true
    )) as passes,
    (
      SELECT json_agg(json_build_object(
        'property_id', tpl.property_id, 
        'tenant_id', tpl.tenant_id, 
        'is_active', tpl.is_active,
        'tenant_clerk_id', p.clerk_user_id
      ))
      FROM tenant_property_links tpl
      JOIN profiles p ON p.id = tpl.tenant_id
      WHERE p.clerk_user_id = 'user_32D3tASWubEjlYfTrsjJKO2dl04'
    ) as property_links
)
SELECT * FROM policy_checks;

-- Test if JWT function works (may not work in psql, but useful to try)
SELECT 
  'JWT Test' as test_type,
  CASE 
    WHEN auth.jwt() IS NULL THEN 'JWT IS NULL'
    ELSE 'JWT EXISTS' 
  END as jwt_status,
  COALESCE(auth.jwt() ->> 'sub', 'NULL') as jwt_sub;