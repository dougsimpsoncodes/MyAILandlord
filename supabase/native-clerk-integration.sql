-- Native Clerk + Supabase Integration (Recommended Approach)
-- This uses Clerk as a third-party auth provider, not JWT templates

-- Drop old custom functions (no longer needed with native integration)
DROP FUNCTION IF EXISTS auth.current_user_id();
DROP FUNCTION IF EXISTS auth.user_id();
DROP FUNCTION IF EXISTS get_current_user_id();
DROP FUNCTION IF EXISTS debug_jwt_full();
DROP FUNCTION IF EXISTS get_my_claim(TEXT);

-- Ensure profiles table has correct structure
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_user_id TEXT UNIQUE NOT NULL DEFAULT auth.jwt()->>'sub',
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('tenant', 'landlord')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop all old policies
DROP POLICY IF EXISTS "clerk_insert_profile" ON public.profiles;
DROP POLICY IF EXISTS "clerk_select_profile" ON public.profiles;
DROP POLICY IF EXISTS "clerk_update_profile" ON public.profiles;
DROP POLICY IF EXISTS "clerk_delete_profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;

-- Create new RLS policies using native Clerk integration
-- These policies use auth.jwt()->>'sub' to get the Clerk user ID

-- Policy: Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  (auth.jwt()->>'sub') = clerk_user_id
);

-- Policy: Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.jwt()->>'sub') = clerk_user_id
);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING ((auth.jwt()->>'sub') = clerk_user_id)
WITH CHECK ((auth.jwt()->>'sub') = clerk_user_id);

-- Policy: Users can delete their own profile
CREATE POLICY "Users can delete their own profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  (auth.jwt()->>'sub') = clerk_user_id
);

-- Create properties table with RLS
CREATE TABLE IF NOT EXISTS public.properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  landlord_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  landlord_clerk_id TEXT NOT NULL DEFAULT auth.jwt()->>'sub',
  name TEXT NOT NULL,
  address TEXT,
  description TEXT,
  type TEXT CHECK (type IN ('house', 'apartment', 'condo', 'townhouse', 'other')),
  bedrooms INTEGER,
  bathrooms NUMERIC,
  square_feet INTEGER,
  rent_amount NUMERIC,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on properties
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

-- Properties RLS policies
CREATE POLICY "Landlords can view their own properties"
ON public.properties
FOR SELECT
TO authenticated
USING (
  (auth.jwt()->>'sub') = landlord_clerk_id
);

CREATE POLICY "Landlords can create properties"
ON public.properties
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.jwt()->>'sub') = landlord_clerk_id
);

CREATE POLICY "Landlords can update their own properties"
ON public.properties
FOR UPDATE
TO authenticated
USING ((auth.jwt()->>'sub') = landlord_clerk_id)
WITH CHECK ((auth.jwt()->>'sub') = landlord_clerk_id);

CREATE POLICY "Landlords can delete their own properties"
ON public.properties
FOR DELETE
TO authenticated
USING (
  (auth.jwt()->>'sub') = landlord_clerk_id
);

-- Create maintenance_requests table with RLS
CREATE TABLE IF NOT EXISTS public.maintenance_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.profiles(id),
  tenant_clerk_id TEXT NOT NULL DEFAULT auth.jwt()->>'sub',
  property_id UUID REFERENCES public.properties(id),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  area TEXT,
  asset TEXT,
  issue_type TEXT,
  images TEXT[],
  voice_notes TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on maintenance_requests
ALTER TABLE public.maintenance_requests ENABLE ROW LEVEL SECURITY;

-- Maintenance requests RLS policies
CREATE POLICY "Tenants can view their own requests"
ON public.maintenance_requests
FOR SELECT
TO authenticated
USING (
  (auth.jwt()->>'sub') = tenant_clerk_id
);

CREATE POLICY "Tenants can create requests"
ON public.maintenance_requests
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.jwt()->>'sub') = tenant_clerk_id
);

CREATE POLICY "Tenants can update their own requests"
ON public.maintenance_requests
FOR UPDATE
TO authenticated
USING ((auth.jwt()->>'sub') = tenant_clerk_id)
WITH CHECK ((auth.jwt()->>'sub') = tenant_clerk_id);

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Test function to verify JWT is working
CREATE OR REPLACE FUNCTION get_auth_jwt_sub()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT auth.jwt()->>'sub';
$$;

-- Grant permission
GRANT EXECUTE ON FUNCTION get_auth_jwt_sub() TO authenticated;

-- Test queries (run after setup is complete):
-- SELECT auth.jwt()->>'sub'; -- Should return your Clerk user ID
-- SELECT get_auth_jwt_sub(); -- Should return your Clerk user ID
-- SELECT * FROM profiles WHERE clerk_user_id = auth.jwt()->>'sub';