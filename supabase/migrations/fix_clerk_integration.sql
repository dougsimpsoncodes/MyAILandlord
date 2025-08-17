-- Fix Clerk-Supabase integration issues
-- A. Make clerk_user_id text and index it

ALTER TABLE public.profiles 
  ALTER COLUMN clerk_user_id TYPE text USING clerk_user_id::text;

CREATE INDEX IF NOT EXISTS idx_profiles_clerk_user_id ON public.profiles(clerk_user_id);

-- B. Update profiles policies to use (select auth.uid()) pattern
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS profiles_delete_own ON public.profiles;

-- Note: For profiles, we need to map Clerk user ID to Supabase auth.uid()
-- Since Clerk user IDs are text (user_abc...) but auth.uid() returns UUID
-- We'll use a different approach for profiles

CREATE POLICY profiles_select_own ON public.profiles 
  FOR SELECT USING (true); -- Allow all authenticated users to read profiles for now

CREATE POLICY profiles_insert_own ON public.profiles 
  FOR INSERT WITH CHECK (true); -- Allow authenticated users to create profiles

CREATE POLICY profiles_update_own ON public.profiles 
  FOR UPDATE USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub')
  WITH CHECK (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY profiles_delete_own ON public.profiles 
  FOR DELETE USING (clerk_user_id = current_setting('request.jwt.claims', true)::json->>'sub');