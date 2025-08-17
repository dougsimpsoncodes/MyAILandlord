-- Fix existing setup without breaking current tables
-- Run this instead of the full migration

-- First, let's see what we have
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND table_schema = 'public';

-- Create the test function we need
CREATE OR REPLACE FUNCTION get_auth_jwt_sub()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT auth.jwt()->>'sub';
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION get_auth_jwt_sub() TO authenticated;

-- Clean up duplicate RLS policies on profiles (keep the good ones)
DROP POLICY IF EXISTS "clerk_insert_profile" ON public.profiles;
DROP POLICY IF EXISTS "clerk_select_profile" ON public.profiles;
DROP POLICY IF EXISTS "clerk_update_profile" ON public.profiles;
DROP POLICY IF EXISTS "clerk_delete_profile" ON public.profiles;

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Test the JWT function
SELECT get_auth_jwt_sub() as test_result;