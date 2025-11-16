-- Fix the profiles_api view to include the role column
-- This should match the actual profiles table structure

-- First, let's see the current profiles table structure
-- \d profiles;

-- Drop and recreate the profiles_api view to include the role column
DROP VIEW IF EXISTS profiles_api;

CREATE VIEW profiles_api AS
SELECT 
  id,
  clerk_user_id,
  email,
  name,
  avatar_url,
  role,  -- This was missing!
  created_at,
  updated_at
FROM profiles;

-- Ensure RLS is enabled on the view
ALTER TABLE profiles_api ENABLE ROW LEVEL SECURITY;

-- Recreate policies for the view if needed
-- (You may need to adjust these policies based on your existing RLS setup)
DROP POLICY IF EXISTS "Users can read own profile" ON profiles_api;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles_api; 
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles_api;

CREATE POLICY "Users can read own profile" ON profiles_api
FOR SELECT USING (clerk_user_id = get_auth_jwt_sub());

CREATE POLICY "Users can update own profile" ON profiles_api  
FOR UPDATE USING (clerk_user_id = get_auth_jwt_sub());

CREATE POLICY "Users can insert own profile" ON profiles_api
FOR INSERT WITH CHECK (clerk_user_id = get_auth_jwt_sub());