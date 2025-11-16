-- Temporary fix: make profiles RLS policy more permissive for debugging
-- This will help us understand if the issue is with JWT extraction

-- Drop the restrictive policies
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;

-- Create more permissive policies for debugging
CREATE POLICY "Users can insert own profile" ON profiles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow insert if user is authenticated and clerk_user_id matches the JWT sub
  clerk_user_id = COALESCE(auth.jwt()->>'sub', current_setting('request.jwt.claims->>sub', true))
);

CREATE POLICY "Users can view own profile" ON profiles
FOR SELECT
TO authenticated
USING (
  clerk_user_id = COALESCE(auth.jwt()->>'sub', current_setting('request.jwt.claims->>sub', true))
);

CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE
TO authenticated
USING (
  clerk_user_id = COALESCE(auth.jwt()->>'sub', current_setting('request.jwt.claims->>sub', true))
);

-- Add a debug function to help troubleshoot JWT claims
CREATE OR REPLACE FUNCTION debug_jwt_claims()
RETURNS json
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT auth.jwt();
$$;