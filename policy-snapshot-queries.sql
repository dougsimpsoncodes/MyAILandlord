-- High-Signal Checks Before Migration
-- Run these in Supabase SQL Editor to understand current state

-- 1. Policy Snapshot - List active policies for critical tables
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd, 
  roles, 
  permissive, 
  qual, 
  with_check
FROM pg_policies 
WHERE tablename IN ('profiles','properties','tenant_property_links','maintenance_requests')
ORDER BY tablename, cmd, policyname;

-- 2. RLS Status Check
SELECT 
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('profiles','properties','tenant_property_links','maintenance_requests');

-- 3. JWT Role Mapping Test
-- This will show what role PostgREST assigns to your Clerk JWT
SELECT 
  current_role as session_role,
  auth.jwt() ->> 'sub' as clerk_sub,
  auth.jwt() ->> 'role' as jwt_role_claim,
  auth.jwt() IS NOT NULL as jwt_present;

-- 4. Subquery Visibility Test (Replace with actual Clerk user ID)
-- Test if tenant can see their own profiles row
SELECT 
  'profiles visibility' as test,
  COUNT(*) as visible_rows
FROM profiles 
WHERE clerk_user_id = 'user_32D3tASWubEjlYfTrsjJKO2dl04';

-- 5. Tenant Property Links Visibility (Replace with actual tenant ID)
-- Test if tenant can see their active property links
SELECT 
  'tenant_property_links visibility' as test,
  tpl.property_id,
  tpl.is_active,
  p.clerk_user_id
FROM tenant_property_links tpl
JOIN profiles p ON p.id = tpl.tenant_id
WHERE p.clerk_user_id = 'user_32D3tASWubEjlYfTrsjJKO2dl04'
  AND tpl.property_id = 'ec4f8fe2-58ff-432c-bf61-7c81bfed340e'
  AND tpl.is_active = true;

-- 6. Maintenance Request Insert Predicate Simulation
-- This simulates the exact conditions in mr_insert_tenant_own_property policy
WITH current_user_profile AS (
  SELECT id, role 
  FROM profiles 
  WHERE clerk_user_id = auth.jwt() ->> 'sub'
),
tenant_check AS (
  SELECT 
    CASE WHEN '71a2098e-afb6-4e24-82e7-e1ab4be57ee6' IN (
      SELECT id::text FROM current_user_profile WHERE role = 'tenant'
    ) THEN 'PASS' ELSE 'FAIL' END as tenant_id_check
),
property_access AS (
  SELECT 
    CASE WHEN 'ec4f8fe2-58ff-432c-bf61-7c81bfed340e' IN (
      SELECT tpl.property_id::text 
      FROM tenant_property_links tpl
      JOIN profiles p ON p.id = tpl.tenant_id
      WHERE p.clerk_user_id = auth.jwt() ->> 'sub' 
        AND tpl.is_active = true
    ) THEN 'PASS' ELSE 'FAIL' END as property_access_check
)
SELECT 
  t.tenant_id_check,
  p.property_access_check
FROM tenant_check t, property_access p;

-- 7. Check for RESTRICTIVE policies (rare but can block inserts)
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive
FROM pg_policies 
WHERE tablename IN ('profiles','properties','tenant_property_links','maintenance_requests')
  AND permissive = 'RESTRICTIVE';

-- 8. Check if any policies use TO authenticated 
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  roles
FROM pg_policies 
WHERE tablename IN ('profiles','properties','tenant_property_links','maintenance_requests')
  AND 'authenticated' = ANY(roles);