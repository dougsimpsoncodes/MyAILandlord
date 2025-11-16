-- Test function to verify JWT validation is working
-- This bypasses RLS entirely and tests pure JWT authentication

-- Drop if exists for clean testing
DROP FUNCTION IF EXISTS get_current_user_id();
DROP FUNCTION IF EXISTS debug_jwt_full();

-- Simple test: Can Supabase extract the user ID from the JWT?
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS TEXT AS $$
  SELECT auth.uid()::text;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Comprehensive debug: Show all JWT claims Supabase can see
CREATE OR REPLACE FUNCTION debug_jwt_full()
RETURNS JSON AS $$
  SELECT json_build_object(
    'auth_uid', auth.uid(),
    'auth_role', auth.role(),
    'auth_email', auth.email(),
    'jwt_claims', auth.jwt(),
    'jwt_sub', auth.jwt()->>'sub',
    'jwt_email', auth.jwt()->>'email',
    'jwt_aud', auth.jwt()->>'aud',
    'jwt_iss', auth.jwt()->>'iss',
    'jwt_exp', auth.jwt()->>'exp',
    'current_user', current_user,
    'session_user', session_user
  );
$$ LANGUAGE SQL SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_current_user_id() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION debug_jwt_full() TO anon, authenticated;

-- Quick test query (run this after setting up JWT provider)
-- SELECT get_current_user_id();
-- SELECT debug_jwt_full();