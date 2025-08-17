-- Test Native Clerk + Supabase Integration
-- Run these queries in Supabase SQL editor while signed in

-- Create the test function if it doesn't exist
CREATE OR REPLACE FUNCTION get_auth_jwt_sub()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT auth.jwt()->>'sub';
$$;

GRANT EXECUTE ON FUNCTION get_auth_jwt_sub() TO authenticated;

-- Test 1: Check if we're receiving any token at all
SELECT 
  CASE 
    WHEN auth.jwt() IS NULL THEN 'No token received'
    ELSE 'Token received'
  END as token_status;

-- Test 2: Check what Clerk user ID Supabase sees
SELECT auth.jwt()->>'sub' as clerk_user_id_from_supabase;

-- Test 3: Check the role claim (should be 'authenticated')
SELECT auth.jwt()->>'role' as user_role;

-- Test 4: See all claims in the token
SELECT auth.jwt() as all_claims;

-- Test 5: Check if RLS is working properly
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'profiles';

-- Test 6: Check current RLS policies
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'profiles';