-- Export of current RLS policies for profiles table (as of 2025-08-13)

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remove any existing policies with these names
DROP POLICY IF EXISTS "clerk_insert_profile" ON public.profiles;
DROP POLICY IF EXISTS "clerk_select_profile" ON public.profiles;
DROP POLICY IF EXISTS "clerk_update_profile" ON public.profiles;
DROP POLICY IF EXISTS "clerk_delete_profile" ON public.profiles;

-- INSERT
CREATE POLICY "clerk_insert_profile" ON public.profiles
AS PERMISSIVE
FOR INSERT
TO public
WITH CHECK (
  clerk_user_id = current_setting('request.jwt.claims->>sub', true)
);

-- SELECT
CREATE POLICY "clerk_select_profile" ON public.profiles
AS PERMISSIVE
FOR SELECT
TO public
USING (
  clerk_user_id = current_setting('request.jwt.claims->>sub', true)
);

-- UPDATE
CREATE POLICY "clerk_update_profile" ON public.profiles
AS PERMISSIVE
FOR UPDATE
TO public
USING (
  clerk_user_id = current_setting('request.jwt.claims->>sub', true)
);

-- DELETE
CREATE POLICY "clerk_delete_profile" ON public.profiles
AS PERMISSIVE
FOR DELETE
TO public
USING (
  clerk_user_id = current_setting('request.jwt.claims->>sub', true)
);
