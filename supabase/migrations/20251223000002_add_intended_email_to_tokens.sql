-- Add intended_email column to invite_tokens for wrong-account detection
-- This allows us to enforce that invites are accepted by the correct user

-- Add column (nullable for backward compatibility with existing tokens)
ALTER TABLE invite_tokens
ADD COLUMN IF NOT EXISTS intended_email TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN invite_tokens.intended_email IS
  'Email address the invite was intended for. Used for wrong-account detection. NULL means any user can accept.';

-- Update generate_invite_token RPC to accept optional intended_email
CREATE OR REPLACE FUNCTION public.generate_invite_token(
  p_property_id UUID,
  p_max_uses INT DEFAULT 1,
  p_expires_in_days INT DEFAULT 7,
  p_intended_email TEXT DEFAULT NULL
)
RETURNS TABLE(token TEXT, token_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
  v_token_id UUID;
  v_landlord_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Verify the caller owns this property
  SELECT landlord_id INTO v_landlord_id
  FROM properties
  WHERE id = p_property_id;

  IF v_landlord_id IS NULL THEN
    RAISE EXCEPTION 'Property not found';
  END IF;

  IF v_landlord_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the property owner can generate invite tokens';
  END IF;

  -- Generate cryptographically secure random token (12 chars base62)
  -- NOTE: Must use extensions.gen_random_bytes because search_path is set to public
  v_token := encode(extensions.gen_random_bytes(9), 'base64');
  -- Remove non-alphanumeric characters and truncate to 12 chars
  v_token := regexp_replace(v_token, '[^A-Za-z0-9]', '', 'g');
  v_token := substring(v_token from 1 for 12);

  -- Ensure token is exactly 12 characters (regenerate if needed)
  WHILE length(v_token) < 12 LOOP
    v_token := v_token || encode(extensions.gen_random_bytes(3), 'base64');
    v_token := regexp_replace(v_token, '[^A-Za-z0-9]', '', 'g');
    v_token := substring(v_token from 1 for 12);
  END LOOP;

  -- Calculate expiration
  v_expires_at := NOW() + (p_expires_in_days || ' days')::INTERVAL;

  -- Insert token with intended_email
  INSERT INTO invite_tokens (
    token,
    property_id,
    created_by,
    max_uses,
    use_count,
    expires_at,
    intended_email
  ) VALUES (
    v_token,
    p_property_id,
    auth.uid(),
    p_max_uses,
    0,
    v_expires_at,
    p_intended_email
  )
  RETURNING id INTO v_token_id;

  -- Return token and ID
  RETURN QUERY SELECT v_token, v_token_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.generate_invite_token(UUID, INT, INT, TEXT) TO authenticated;

-- Update validate-invite-token Edge Function to return intended_email
-- (This is done in the Edge Function code, not here)

-- Index for intended_email lookups (optional, for analytics)
CREATE INDEX IF NOT EXISTS idx_invite_tokens_intended_email
  ON invite_tokens(intended_email)
  WHERE intended_email IS NOT NULL;
