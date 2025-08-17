-- Fix profiles column type by handling existing views
-- Step 1: Drop any existing views that depend on clerk_user_id
DROP VIEW IF EXISTS public.profiles_view CASCADE;
DROP VIEW IF EXISTS public.profiles_api CASCADE;

-- Step 2: Now we can alter the column type
ALTER TABLE public.profiles ALTER COLUMN clerk_user_id TYPE text USING clerk_user_id::text;

-- Step 3: Create index
CREATE INDEX IF NOT EXISTS idx_profiles_clerk_user_id ON public.profiles(clerk_user_id);

-- Step 4: Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop old policies
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_delete_own ON public.profiles;

-- Step 6: Create new policies using JWT claims
CREATE POLICY profiles_select_own ON public.profiles 
  FOR SELECT USING (clerk_user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY profiles_insert_own ON public.profiles 
  FOR INSERT WITH CHECK (clerk_user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY profiles_update_own ON public.profiles 
  FOR UPDATE USING (clerk_user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub')) 
  WITH CHECK (clerk_user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));

CREATE POLICY profiles_delete_own ON public.profiles 
  FOR DELETE USING (clerk_user_id = (SELECT current_setting('request.jwt.claims', true)::json->>'sub'));

-- Step 7: Create new API view with TEXT guarantee
CREATE OR REPLACE VIEW public.profiles_api AS
SELECT 
  id, 
  clerk_user_id::text as clerk_user_id, 
  email, 
  name, 
  avatar_url, 
  created_at, 
  updated_at
FROM public.profiles;

-- Step 8: Set security barrier on view
ALTER VIEW public.profiles_api SET (security_barrier = true);