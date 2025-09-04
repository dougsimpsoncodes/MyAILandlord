-- Create function to set user context for RLS policies
CREATE OR REPLACE FUNCTION public.set_app_user_id(user_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id, false);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.set_app_user_id(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_app_user_id(TEXT) TO anon;

-- Test the function with our test landlord
SELECT set_app_user_id('landlord_john_001');

-- Verify test data is accessible with the context set
SELECT COUNT(*) AS maintenance_count FROM maintenance_requests;
SELECT COUNT(*) AS property_count FROM properties;