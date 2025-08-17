-- Quick test to see if Clerk JWT is working
-- Run this in Supabase SQL editor while signed in with Clerk

-- Test 1: Check if JWT is being received
SELECT auth.jwt() IS NOT NULL as jwt_exists;

-- Test 2: Get the Clerk user ID from JWT
SELECT auth.jwt()->>'sub' as clerk_user_id;

-- Test 3: Check all JWT claims
SELECT auth.jwt() as full_jwt_claims;

-- Test 4: Check if RLS is enabled on profiles
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';

-- Test 5: Check existing RLS policies
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
WHERE tablename = 'profiles';