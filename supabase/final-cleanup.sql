-- Final cleanup - remove old duplicate policies
-- Your native integration is working perfectly!

-- Remove the old JWT template policies (keep the native ones)
DROP POLICY IF EXISTS "clerk_insert_profile" ON public.profiles;
DROP POLICY IF EXISTS "clerk_select_profile" ON public.profiles;
DROP POLICY IF EXISTS "clerk_update_profile" ON public.profiles;
DROP POLICY IF EXISTS "clerk_delete_profile" ON public.profiles;

-- Verify we have the correct policies (should show 4 policies with auth.jwt()->>'sub')
SELECT 
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY cmd;