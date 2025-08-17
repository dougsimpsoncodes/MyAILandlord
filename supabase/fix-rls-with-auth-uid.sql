-- Once JWT validation is confirmed working, update RLS policies to use auth.uid()
-- This replaces the complex custom functions with Supabase's native auth

-- Drop old policies
DROP POLICY IF EXISTS "clerk_insert_profile" ON public.profiles;
DROP POLICY IF EXISTS "clerk_select_profile" ON public.profiles;
DROP POLICY IF EXISTS "clerk_update_profile" ON public.profiles;
DROP POLICY IF EXISTS "clerk_delete_profile" ON public.profiles;

-- Create new policies using auth.uid() which will contain the Clerk user ID
CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (clerk_user_id = auth.uid()::text);

CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT TO authenticated
USING (clerk_user_id = auth.uid()::text);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (clerk_user_id = auth.uid()::text)
WITH CHECK (clerk_user_id = auth.uid()::text);

CREATE POLICY "Users can delete own profile" ON public.profiles
FOR DELETE TO authenticated
USING (clerk_user_id = auth.uid()::text);

-- Note: auth.uid() returns the 'sub' claim from the JWT, which should be the Clerk user ID