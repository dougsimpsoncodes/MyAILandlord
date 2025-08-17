-- Export of current RLS policies for profiles table (as of 2025-08-13)
-- Updated for proper Clerk JWT integration

-- First, create a function to set the current user context from JWT
CREATE OR REPLACE FUNCTION auth.current_user_id()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims->>sub', true),
    current_setting('request.jwt.claims->>user_id', true)
  );
$$;

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remove any existing policies with these names
DROP POLICY IF EXISTS "clerk_insert_profile" ON public.profiles;
DROP POLICY IF EXISTS "clerk_select_profile" ON public.profiles;
DROP POLICY IF EXISTS "clerk_update_profile" ON public.profiles;
DROP POLICY IF EXISTS "clerk_delete_profile" ON public.profiles;

-- INSERT - Allow users to create their own profile
CREATE POLICY "clerk_insert_profile" ON public.profiles
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (
  clerk_user_id = auth.current_user_id()
);

-- SELECT - Allow users to view their own profile
CREATE POLICY "clerk_select_profile" ON public.profiles
AS PERMISSIVE
FOR SELECT
TO public
USING (
  clerk_user_id = auth.current_user_id()
);

-- UPDATE - Allow users to update their own profile
CREATE POLICY "clerk_update_profile" ON public.profiles
AS PERMISSIVE
FOR UPDATE
TO public
USING (
  clerk_user_id = auth.current_user_id()
);

-- DELETE - Allow users to delete their own profile
CREATE POLICY "clerk_delete_profile" ON public.profiles
AS PERMISSIVE
FOR DELETE
TO public
USING (
  clerk_user_id = auth.current_user_id()
);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT EXECUTE ON FUNCTION auth.current_user_id() TO anon, authenticated;
