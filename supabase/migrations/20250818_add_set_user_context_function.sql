-- Create function to set user context for RLS policies
-- This function allows the application to set the current user ID
-- for Row Level Security policies to reference

CREATE OR REPLACE FUNCTION public.set_app_user_id(user_id TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Set the current user ID in the session configuration
  PERFORM set_config('app.current_user_id', user_id, false);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.set_app_user_id(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_app_user_id(TEXT) TO anon;

-- Add comment for documentation
COMMENT ON FUNCTION public.set_app_user_id(TEXT) IS 'Sets the current user Clerk ID in session config for RLS policies to reference';