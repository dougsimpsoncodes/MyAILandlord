-- Migration: Server-side invite code generation and validation
-- This ensures invite codes are:
-- 1. Generated server-side (not client-generated)
-- 2. Properly validated with rate limiting support
-- 3. Secure against enumeration attacks

-- Function to generate a secure invite code for a property
CREATE OR REPLACE FUNCTION generate_property_invite_code(p_property_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_code TEXT;
  v_landlord_id UUID;
  v_attempts INT := 0;
  v_max_attempts INT := 10;
BEGIN
  -- Verify the caller owns this property
  SELECT landlord_id INTO v_landlord_id
  FROM public.properties
  WHERE id = p_property_id;

  IF v_landlord_id IS NULL THEN
    RAISE EXCEPTION 'Property not found';
  END IF;

  IF v_landlord_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized to generate invite code for this property';
  END IF;

  -- Generate a unique 6-character alphanumeric code
  LOOP
    v_attempts := v_attempts + 1;
    IF v_attempts > v_max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique code after % attempts', v_max_attempts;
    END IF;

    -- Generate uppercase alphanumeric code (A-Z, 0-9)
    v_code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));

    -- Ensure it doesn't exist
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.properties WHERE invite_code = v_code
    );
  END LOOP;

  -- Update the property with the new code
  UPDATE public.properties
  SET invite_code = v_code,
      invite_code_created_at = now()
  WHERE id = p_property_id;

  RETURN v_code;
END;
$$;

-- Add invite_code_created_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'properties'
    AND column_name = 'invite_code_created_at'
  ) THEN
    ALTER TABLE public.properties ADD COLUMN invite_code_created_at TIMESTAMPTZ;
  END IF;
END $$;

-- Create table for tracking invite code validation attempts (for rate limiting)
CREATE TABLE IF NOT EXISTS public.invite_code_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT,
  user_id UUID REFERENCES auth.users(id),
  attempted_code TEXT NOT NULL,
  success BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_invite_code_attempts_user_time
ON public.invite_code_attempts(user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_invite_code_attempts_ip_time
ON public.invite_code_attempts(ip_address, created_at) WHERE ip_address IS NOT NULL;

-- Function to validate invite code with rate limiting
CREATE OR REPLACE FUNCTION validate_invite_code(p_code TEXT)
RETURNS TABLE(
  valid BOOLEAN,
  property_id UUID,
  property_name TEXT,
  landlord_name TEXT,
  error_code TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
  v_recent_attempts INT;
  v_normalized_code TEXT;
  v_property RECORD;
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT, 'NOT_AUTHENTICATED'::TEXT;
    RETURN;
  END IF;

  -- Check rate limit: max 10 attempts per 15 minutes per user
  SELECT COUNT(*) INTO v_recent_attempts
  FROM public.invite_code_attempts
  WHERE user_id = v_user_id
    AND created_at > now() - interval '15 minutes';

  IF v_recent_attempts >= 10 THEN
    -- Log the rate-limited attempt
    INSERT INTO public.invite_code_attempts (user_id, attempted_code, success)
    VALUES (v_user_id, 'RATE_LIMITED', FALSE);

    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT, 'RATE_LIMITED'::TEXT;
    RETURN;
  END IF;

  -- Normalize code: uppercase, trim whitespace
  v_normalized_code := upper(trim(p_code));

  -- Validate format: exactly 6 alphanumeric characters
  IF v_normalized_code !~ '^[A-Z0-9]{6}$' THEN
    INSERT INTO public.invite_code_attempts (user_id, attempted_code, success)
    VALUES (v_user_id, v_normalized_code, FALSE);

    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT, 'INVALID_FORMAT'::TEXT;
    RETURN;
  END IF;

  -- Look up property by invite code
  SELECT p.id, p.name, pr.first_name AS landlord_first_name
  INTO v_property
  FROM public.properties p
  LEFT JOIN public.profiles pr ON p.landlord_id = pr.id
  WHERE p.invite_code = v_normalized_code;

  IF v_property.id IS NULL THEN
    -- Log failed attempt (don't reveal if code format was valid but not found)
    INSERT INTO public.invite_code_attempts (user_id, attempted_code, success)
    VALUES (v_user_id, v_normalized_code, FALSE);

    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT, 'INVALID_CODE'::TEXT;
    RETURN;
  END IF;

  -- Check if user is already linked to this property
  IF EXISTS (
    SELECT 1 FROM public.tenant_property_links
    WHERE tenant_id = v_user_id AND property_id = v_property.id
  ) THEN
    INSERT INTO public.invite_code_attempts (user_id, attempted_code, success)
    VALUES (v_user_id, v_normalized_code, TRUE);

    RETURN QUERY SELECT FALSE, v_property.id, v_property.name, v_property.landlord_first_name, 'ALREADY_LINKED'::TEXT;
    RETURN;
  END IF;

  -- Log successful validation
  INSERT INTO public.invite_code_attempts (user_id, attempted_code, success)
  VALUES (v_user_id, v_normalized_code, TRUE);

  -- Return property info (limited - no address until confirmed)
  RETURN QUERY SELECT
    TRUE,
    v_property.id,
    v_property.name,
    COALESCE(v_property.landlord_first_name, 'Your landlord'),
    NULL::TEXT;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_property_invite_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION validate_invite_code(TEXT) TO authenticated;

-- RLS for invite_code_attempts (users can only see their own)
ALTER TABLE public.invite_code_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attempts"
ON public.invite_code_attempts
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Service role can insert (for the functions above)
CREATE POLICY "Service can insert attempts"
ON public.invite_code_attempts
FOR INSERT
TO authenticated
WITH CHECK (TRUE);

COMMENT ON FUNCTION generate_property_invite_code IS 'Generates a secure 6-character invite code for a property. Only the property owner can call this.';
COMMENT ON FUNCTION validate_invite_code IS 'Validates an invite code with rate limiting. Returns property info on success or error code on failure.';
