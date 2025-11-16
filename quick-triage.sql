-- Enhanced Quick Triage Script - Run first to identify exact failure mode
-- Replace user IDs with actual values from your error logs

-- Test 1: Comprehensive JWT/Role Analysis (CRITICAL)
SELECT 
  'JWT Analysis' as check_name,
  jsonb_build_object(
    'current_user', current_user,
    'current_role', current_role,
    'raw_claims', current_setting('request.jwt.claims', true),
    'jwt_sub', auth.jwt() ->> 'sub',
    'jwt_role', auth.jwt() ->> 'role',
    'jwt_present', auth.jwt() IS NOT NULL
  ) as result,
  CASE 
    WHEN auth.jwt() ->> 'sub' IS NULL THEN 'CRITICAL: JWT not working - fix Supabase JWKS config for Clerk'
    WHEN current_role != 'authenticated' AND EXISTS (
      SELECT 1 FROM pg_policies WHERE tablename IN ('profiles','properties','tenant_property_links','maintenance_requests') AND 'authenticated' = ANY(roles)
    ) THEN 'CRITICAL: Role mismatch - remove TO authenticated from policies'
    WHEN auth.jwt() ->> 'sub' = 'user_32D3tASWubEjlYfTrsjJKO2dl04' THEN 'PASS: JWT and role look good'
    ELSE 'FAIL: Wrong user or auth issue'
  END as status;

-- Test 2: RLS Status Check
SELECT 
  'RLS Status' as check_name,
  jsonb_agg(jsonb_build_object('table', tablename, 'rls_enabled', rowsecurity)) as result,
  CASE 
    WHEN bool_and(rowsecurity) THEN 'PASS: RLS enabled on all tables'
    ELSE 'WARNING: RLS disabled on some tables'
  END as status
FROM pg_tables 
WHERE tablename IN ('profiles','properties','tenant_property_links','maintenance_requests');

-- Test 3: Policy Conflicts and Restrictive Policies
-- Check for restrictive policies (these AND with permissive ones)
SELECT 
  'Restrictive Policies' as check_name,
  COALESCE(jsonb_agg(jsonb_build_object('table', tablename, 'policy', policyname)), '[]'::jsonb) as result,
  CASE 
    WHEN COUNT(*) = 0 THEN 'PASS: No restrictive policies found'
    ELSE 'CRITICAL: Restrictive policies will AND with permissive ones - may block inserts'
  END as status
FROM pg_policies 
WHERE tablename IN ('profiles','properties','tenant_property_links','maintenance_requests')
  AND permissive = 'RESTRICTIVE';

-- Test 4: Duplicate Policies (can cause conflicts)
SELECT 
  'Policy Duplicates' as check_name,
  jsonb_agg(jsonb_build_object('table', tablename, 'cmd', cmd, 'count', cnt)) as result,
  CASE 
    WHEN MAX(cnt) = 1 THEN 'PASS: No duplicate policies'
    ELSE 'WARNING: Multiple policies per command - may conflict'
  END as status
FROM (
  SELECT tablename, cmd, count(*) as cnt
  FROM pg_policies 
  WHERE tablename IN ('profiles','properties','tenant_property_links','maintenance_requests')
  GROUP BY tablename, cmd
  HAVING count(*) > 1
) duplicates;

-- Test 5: RLS-on-Subquery Visibility (CRITICAL - if these fail, policy subqueries fail silently)
-- Explicit subquery visibility checks as the current tenant
SELECT 
  'Profiles Self-Visibility' as check_name,
  jsonb_build_object(
    'profile_id', (SELECT id FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub'),
    'count', (SELECT COUNT(*) FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub')
  ) as result,
  CASE 
    WHEN (SELECT COUNT(*) FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub') = 1 
    THEN 'PASS: Tenant can see their profile - subqueries will work'
    WHEN (SELECT COUNT(*) FROM profiles WHERE clerk_user_id = auth.jwt() ->> 'sub') = 0 
    THEN 'CRITICAL: Tenant cannot see own profile - ALL policy subqueries will fail silently'
    ELSE 'ERROR: Multiple profiles found'
  END as status;

-- Test 6: Tenant Property Links Self-Visibility 
SELECT 
  'Tenant Property Links Visibility' as check_name,
  jsonb_build_object(
    'accessible_properties', (
      SELECT jsonb_agg(property_id) 
      FROM tenant_property_links tpl 
      JOIN profiles p ON p.id = tpl.tenant_id 
      WHERE p.clerk_user_id = auth.jwt() ->> 'sub' AND tpl.is_active = true
    ),
    'target_property_accessible', (
      SELECT COUNT(*) > 0
      FROM tenant_property_links tpl
      JOIN profiles p ON p.id = tpl.tenant_id
      WHERE p.clerk_user_id = auth.jwt() ->> 'sub' 
        AND tpl.property_id = 'ec4f8fe2-58ff-432c-bf61-7c81bfed340e'
        AND tpl.is_active = true
    )
  ) as result,
  CASE 
    WHEN (
      SELECT COUNT(*) 
      FROM tenant_property_links tpl
      JOIN profiles p ON p.id = tpl.tenant_id
      WHERE p.clerk_user_id = auth.jwt() ->> 'sub' 
        AND tpl.property_id = 'ec4f8fe2-58ff-432c-bf61-7c81bfed340e'
        AND tpl.is_active = true
    ) = 1 THEN 'PASS: Active link exists and visible'
    WHEN (
      SELECT COUNT(*) 
      FROM tenant_property_links tpl
      JOIN profiles p ON p.id = tpl.tenant_id
      WHERE p.clerk_user_id = auth.jwt() ->> 'sub' 
        AND tpl.property_id = 'ec4f8fe2-58ff-432c-bf61-7c81bfed340e'
        AND tpl.is_active = true
    ) = 0 THEN 'CRITICAL: No active link visible - create/activate link OR fix tenant_property_links SELECT policy'
    ELSE 'ERROR: Multiple active links found'
  END as status;

-- Test 7: Property Accessibility (Should work via tenant_property_links)
SELECT 
  'Property Accessibility' as check_name,
  jsonb_build_object(
    'property_exists', (SELECT COUNT(*) FROM properties WHERE id = 'ec4f8fe2-58ff-432c-bf61-7c81bfed340e'),
    'tenant_can_see', (
      SELECT COUNT(*) FROM properties 
      WHERE id = 'ec4f8fe2-58ff-432c-bf61-7c81bfed340e'
      AND id IN (
        SELECT tpl.property_id FROM tenant_property_links tpl
        JOIN profiles p ON p.id = tpl.tenant_id
        WHERE p.clerk_user_id = auth.jwt() ->> 'sub' AND tpl.is_active = true
      )
    )
  ) as result,
  CASE 
    WHEN (SELECT COUNT(*) FROM properties WHERE id = 'ec4f8fe2-58ff-432c-bf61-7c81bfed340e') = 0 
    THEN 'ERROR: Property does not exist'
    WHEN (
      SELECT COUNT(*) FROM properties 
      WHERE id = 'ec4f8fe2-58ff-432c-bf61-7c81bfed340e'
      AND id IN (
        SELECT tpl.property_id FROM tenant_property_links tpl
        JOIN profiles p ON p.id = tpl.tenant_id
        WHERE p.clerk_user_id = auth.jwt() ->> 'sub' AND tpl.is_active = true
      )
    ) = 1 THEN 'PASS: Tenant can access target property'
    ELSE 'WARNING: Property exists but tenant cannot see it - may need properties SELECT policy fix'
  END as status;

-- Summary: Quick Action Required
-- If any CRITICAL status appears above:
-- 1. JWT Test CRITICAL -> Fix Supabase JWKS configuration for Clerk first
-- 2. Profiles Visibility CRITICAL -> Apply profiles SELECT policy fix
-- 3. Tenant Property Link CRITICAL -> Create/activate tenant property link first
-- 
-- If all PASS -> The issue is likely role mapping (TO authenticated) or policy logic