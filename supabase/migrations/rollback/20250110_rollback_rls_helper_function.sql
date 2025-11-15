-- Rollback for: 20250110_rls_helper_function.sql
-- Purpose: Remove RLS helper functions
-- Use: Only if functions cause issues or need to revert to sub-select pattern

-- ============================================================================
-- DROP HELPER FUNCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS public.get_current_user_profile_id();
DROP FUNCTION IF EXISTS public.get_current_user_role();
DROP FUNCTION IF EXISTS public.is_landlord();
DROP FUNCTION IF EXISTS public.is_tenant();

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify functions removed:
-- SELECT routine_name
-- FROM information_schema.routines
-- WHERE routine_schema = 'public'
-- AND routine_name IN (
--   'get_current_user_profile_id',
--   'get_current_user_role',
--   'is_landlord',
--   'is_tenant'
-- );
-- Should return empty

-- Note: After rollback, any RLS policies using these functions will fail
-- You must update RLS policies to use sub-select pattern before rolling back
