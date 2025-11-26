-- ==================================================
-- Supabase RLS Verification Script
-- Run this in Supabase SQL Editor to verify RLS setup
-- ==================================================

-- ============================================
-- 1. Check RLS is Enabled on All Tables
-- ============================================
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE
        WHEN rowsecurity THEN '✅ RLS Enabled'
        ELSE '❌ RLS DISABLED - SECURITY RISK!'
    END as status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY rowsecurity, tablename;

-- Expected: ALL tables should have RLS enabled (rowsecurity = true)
-- If ANY table shows false, it's a CRITICAL security issue


-- ============================================
-- 2. List All RLS Policies
-- ============================================
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd as operation,
    CASE cmd
        WHEN 'SELECT' THEN '🔍 Read'
        WHEN 'INSERT' THEN '➕ Create'
        WHEN 'UPDATE' THEN '✏️ Update'
        WHEN 'DELETE' THEN '🗑️ Delete'
        ELSE cmd
    END as operation_type
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, cmd;

-- Expected: Should see policies for:
-- - properties (SELECT, INSERT, UPDATE, DELETE)
-- - maintenance_requests (SELECT, INSERT, UPDATE)
-- - profiles (SELECT, INSERT, UPDATE)


-- ============================================
-- 3. Check Specific Critical Policies
-- ============================================

-- Properties table policies
SELECT
    policyname,
    cmd,
    qual::text as policy_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'properties'
ORDER BY cmd;

-- Expected policies:
-- - Landlords can only see their own properties
-- - Tenants can only see properties they're linked to
-- - No cross-tenant access


-- Maintenance requests policies
SELECT
    policyname,
    cmd,
    qual::text as policy_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'maintenance_requests'
ORDER BY cmd;

-- Expected policies:
-- - Tenants can only see their own requests
-- - Landlords can see requests for their properties
-- - No cross-tenant access


-- ============================================
-- 4. Test User ID Function
-- ============================================
-- This should work when authenticated with Clerk JWT
SELECT
    auth.uid() as current_user_id,
    CASE
        WHEN auth.uid() IS NULL THEN '❌ No user ID - Auth may be broken'
        ELSE '✅ User ID detected: ' || auth.uid()::text
    END as status;

-- Expected: Should return current user's Clerk ID
-- If NULL, authentication is not working


-- ============================================
-- 5. Check JWT Claims
-- ============================================
-- Verify JWT contains necessary claims
SELECT
    auth.jwt() AS current_jwt_claims;

-- Expected: Should contain:
-- - sub (user ID)
-- - role
-- - email


-- ============================================
-- 6. Count Records by Table (Admin Only)
-- ============================================
-- Run this as superuser to see total records
SELECT
    'properties' as table_name,
    COUNT(*) as total_records
FROM properties
UNION ALL
SELECT
    'maintenance_requests',
    COUNT(*)
FROM maintenance_requests
UNION ALL
SELECT
    'profiles',
    COUNT(*)
FROM profiles
UNION ALL
SELECT
    'property_tenant_links',
    COUNT(*)
FROM property_tenant_links;


-- ============================================
-- 7. Test RLS Enforcement (Run as Different Users)
-- ============================================
-- To test properly, you need to:
-- 1. Get JWT tokens for different test users
-- 2. Run these queries with each user's token
-- 3. Verify each user only sees their own data

-- As Tenant A (use their JWT):
-- SELECT * FROM properties;
-- Expected: Only see properties they're linked to

-- As Landlord A (use their JWT):
-- SELECT * FROM properties;
-- Expected: Only see properties they own

-- As Tenant A trying to access Landlord B's data:
-- SELECT * FROM properties WHERE owner_id = 'landlord-b-id';
-- Expected: Should return 0 rows (blocked by RLS)


-- ============================================
-- 8. Verify No Bypass Exists
-- ============================================
-- Check for policies that might bypass RLS
SELECT
    tablename,
    policyname,
    qual::text
FROM pg_policies
WHERE schemaname = 'public'
  AND qual::text ILIKE '%true%'  -- Policies that always return true
ORDER BY tablename;

-- Expected: Should be EMPTY or only contain safe system policies
-- If you see user-facing tables with 'true' policies, it's a security risk!


-- ============================================
-- 9. Check for Missing Policies
-- ============================================
-- Tables with RLS enabled but no policies = data is invisible
SELECT
    t.tablename,
    t.rowsecurity as rls_enabled,
    COUNT(p.policyname) as policy_count,
    CASE
        WHEN t.rowsecurity AND COUNT(p.policyname) = 0
        THEN '⚠️ RLS enabled but NO POLICIES - data may be invisible'
        WHEN NOT t.rowsecurity
        THEN '❌ RLS DISABLED - CRITICAL SECURITY RISK'
        ELSE '✅ OK'
    END as status
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND p.schemaname = 'public'
WHERE t.schemaname = 'public'
GROUP BY t.tablename, t.rowsecurity
ORDER BY rls_enabled, policy_count;


-- ============================================
-- 10. Recommended Fix Template (if RLS is broken)
-- ============================================
-- If you find issues, use these templates to fix them:

/*
-- Enable RLS on a table
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Create policy for landlords to see their own properties
CREATE POLICY "Landlords can view own properties"
ON properties
FOR SELECT
USING (owner_id = auth.uid());

-- Create policy for tenants to see linked properties
CREATE POLICY "Tenants can view linked properties"
ON properties
FOR SELECT
USING (
  id IN (
    SELECT property_id
    FROM property_tenant_links
    WHERE tenant_id = auth.uid()
  )
);

-- Create policy for landlords to insert their own properties
CREATE POLICY "Landlords can create properties"
ON properties
FOR INSERT
WITH CHECK (owner_id = auth.uid());

-- Create policy for landlords to update their own properties
CREATE POLICY "Landlords can update own properties"
ON properties
FOR UPDATE
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Create policy for landlords to delete their own properties
CREATE POLICY "Landlords can delete own properties"
ON properties
FOR DELETE
USING (owner_id = auth.uid());
*/


-- ============================================
-- SUMMARY
-- ============================================
-- After running all queries above, verify:
-- ✅ All tables have RLS enabled
-- ✅ All tables have appropriate policies
-- ✅ auth.uid() returns correct user ID
-- ✅ No policies with 'true' that bypass security
-- ✅ Policy count matches table count
-- ✅ Test with different user JWTs shows proper isolation

-- If ANY of the above are ❌ or ⚠️, you have a SECURITY ISSUE
-- DO NOT go to production until all checks pass!
