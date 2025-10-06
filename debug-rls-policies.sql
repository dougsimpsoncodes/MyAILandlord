-- Step 2: SQL Diagnostics for RLS Policy Investigation
-- Run these queries in Supabase SQL Editor

-- 1. Check which tables have RLS enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('profiles','properties','tenant_property_links','maintenance_requests','messages','announcements');

-- 2. List all current RLS policies
SELECT schemaname, tablename, policyname, cmd, roles, permissive, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('profiles','properties','tenant_property_links','maintenance_requests','messages','announcements') 
ORDER BY tablename, cmd, policyname;

-- 3. JWT sanity check - should return Clerk user ID, not NULL
SELECT auth.jwt() ->> 'sub' AS clerk_sub;

-- 4. Predicate simulation for failing case
WITH current_user_profile AS (
  SELECT id, role FROM profiles WHERE clerk_user_id = 'user_32D3tASWubEjlYfTrsjJKO2dl04'
),
tenant_properties AS (
  SELECT property_id FROM tenant_property_links tpl
  JOIN profiles p ON p.id = tpl.tenant_id
  WHERE p.clerk_user_id = 'user_32D3tASWubEjlYfTrsjJKO2dl04'
    AND tpl.is_active = true
)
SELECT 'Tenant ID check' AS check_type,
       CASE WHEN '71a2098e-afb6-4e24-82e7-e1ab4be57ee6' IN (SELECT id::text FROM current_user_profile WHERE role = 'tenant') THEN 'PASS'
ELSE 'FAIL' END
UNION ALL
SELECT 'Property access check',
       CASE WHEN 'ec4f8fe2-58ff-432c-bf61-7c81bfed340e' IN (SELECT property_id::text FROM tenant_properties) THEN 'PASS' ELSE 'FAIL' END;