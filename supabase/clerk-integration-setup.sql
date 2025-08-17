-- Clerk + Supabase Integration Setup
-- Based on official Clerk documentation

-- Step 1: Create a function to extract the Clerk user ID from JWT
CREATE OR REPLACE FUNCTION auth.user_id() 
RETURNS TEXT 
LANGUAGE SQL 
STABLE
AS $$
  SELECT NULLIF(
    COALESCE(
      current_setting('request.jwt.claims', true)::json->>'sub',
      (current_setting('request.jwt.claims', true)::jsonb)->>'sub'
    ),
    ''
  )::text;
$$;

-- Step 2: Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_user_id TEXT UNIQUE NOT NULL,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('tenant', 'landlord')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies using Clerk's recommended approach
-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

-- INSERT: Users can create their own profile
CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.user_id() = clerk_user_id
);

-- SELECT: Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT 
TO authenticated
USING (
  auth.user_id() = clerk_user_id
);

-- UPDATE: Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE 
TO authenticated
USING (auth.user_id() = clerk_user_id)
WITH CHECK (auth.user_id() = clerk_user_id);

-- DELETE: Users can delete their own profile
CREATE POLICY "Users can delete own profile" ON public.profiles
FOR DELETE 
TO authenticated
USING (
  auth.user_id() = clerk_user_id
);

-- Step 5: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.profiles TO authenticated;

-- Step 6: Create helper function for debugging
CREATE OR REPLACE FUNCTION get_my_claim(claim TEXT) 
RETURNS TEXT 
LANGUAGE SQL 
STABLE
AS $$
  SELECT current_setting('request.jwt.claims', true)::json->>claim;
$$;

-- Test queries (run these after setting up the integration):
-- SELECT auth.user_id(); -- Should return your Clerk user ID
-- SELECT get_my_claim('email'); -- Should return your email
-- SELECT * FROM profiles WHERE clerk_user_id = auth.user_id();