-- Test JWT context function for debugging
CREATE OR REPLACE FUNCTION test_jwt_context()
RETURNS jsonb AS $$
BEGIN
  RETURN jsonb_build_object(
    'jwt_available', CASE WHEN auth.jwt() IS NULL THEN false ELSE true END,
    'jwt_sub', auth.jwt() ->> 'sub',
    'current_user_id', current_setting('app.current_user_id', true),
    'timestamp', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the maintenance request RLS policy directly
SELECT 
  auth.jwt() IS NOT NULL as jwt_exists,
  auth.jwt() ->> 'sub' as jwt_sub,
  current_setting('app.current_user_id', true) as app_user_id;