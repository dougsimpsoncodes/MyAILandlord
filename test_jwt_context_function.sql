-- Create helper function to test JWT context in RLS policies
-- This will help us debug what auth.jwt() returns during maintenance request creation

CREATE OR REPLACE FUNCTION test_jwt_context()
RETURNS jsonb AS $$
DECLARE
  jwt_data jsonb;
  result jsonb;
BEGIN
  -- Get the JWT data
  jwt_data := auth.jwt();
  
  -- Build diagnostic result
  result := jsonb_build_object(
    'jwt_exists', jwt_data IS NOT NULL,
    'jwt_sub', COALESCE(jwt_data ->> 'sub', 'NULL'),
    'jwt_full', jwt_data,
    'current_setting_result', (SELECT current_setting('app.current_user_id', true)::text),
    'timestamp', now()
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;