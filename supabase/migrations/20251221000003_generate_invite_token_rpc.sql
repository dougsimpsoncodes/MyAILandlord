-- Token Generation RPC Function
-- Allows authenticated landlords to generate invite tokens for their properties
-- CRITICAL: This was missing from the initial tokenized invites implementation

-- ============================================================
-- Generate Invite Token Function
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_invite_token(
  p_property_id UUID,
  p_max_uses INTEGER DEFAULT 1,
  p_expires_in_days INTEGER DEFAULT 7
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token TEXT;
  v_token_id UUID;
  v_landlord_id UUID;
  v_property_name TEXT;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Get authenticated user ID
  v_landlord_id := auth.uid();

  IF v_landlord_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify landlord owns the property
  SELECT name INTO v_property_name
  FROM public.properties
  WHERE id = p_property_id
    AND landlord_id = v_landlord_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Property not found or you do not have permission to create invites for this property';
  END IF;

  -- Validate parameters
  IF p_max_uses < 1 OR p_max_uses > 100 THEN
    RAISE EXCEPTION 'max_uses must be between 1 and 100';
  END IF;

  IF p_expires_in_days < 1 OR p_expires_in_days > 365 THEN
    RAISE EXCEPTION 'expires_in_days must be between 1 and 365';
  END IF;

  -- Generate random 12-character base62 token
  -- Base62: [a-zA-Z0-9] = 62 chars, 12 chars = ~72 bits entropy
  v_token := encode(
    gen_random_bytes(9),
    'base64'
  );
  -- Clean up base64 to base62 (remove +, /, =)
  v_token := replace(replace(replace(v_token, '+', ''), '/', ''), '=', '');
  -- Truncate to exactly 12 chars
  v_token := substring(v_token from 1 for 12);

  -- Calculate expiration timestamp
  v_expires_at := NOW() + (p_expires_in_days || ' days')::INTERVAL;

  -- Insert token into invite_tokens table
  INSERT INTO public.invite_tokens (
    token,
    property_id,
    created_by,
    max_uses,
    expires_at
  ) VALUES (
    v_token,
    p_property_id,
    v_landlord_id,
    p_max_uses,
    v_expires_at
  )
  RETURNING id INTO v_token_id;

  -- Return success with token (only time token value is exposed)
  RETURN json_build_object(
    'success', true,
    'token', v_token,
    'token_id', v_token_id,
    'property_id', p_property_id,
    'property_name', v_property_name,
    'max_uses', p_max_uses,
    'expires_at', v_expires_at,
    'created_at', NOW()
  );
END;
$$;

-- ============================================================
-- Permissions
-- ============================================================

-- Grant execute to authenticated users only (landlords)
-- RLS is enforced via property ownership check in function
REVOKE ALL ON FUNCTION public.generate_invite_token FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_invite_token TO authenticated;

-- Service role doesn't need this (only landlords generate tokens)
-- Validation/acceptance use service role, generation uses authenticated

-- ============================================================
-- Comments
-- ============================================================

COMMENT ON FUNCTION public.generate_invite_token IS 'Generate invite token for property (authenticated landlords only, ownership verified)';

-- ============================================================
-- Usage Examples
-- ============================================================

-- Example call from client (via supabase.rpc):
-- const { data, error } = await supabase.rpc('generate_invite_token', {
--   p_property_id: 'uuid-here',
--   p_max_uses: 1,          // Single-use token
--   p_expires_in_days: 7    // 7-day expiry
-- });
--
-- Returns:
-- {
--   "success": true,
--   "token": "aBc123XyZ789",
--   "token_id": "uuid-of-token-record",
--   "property_id": "uuid-of-property",
--   "property_name": "Property Name",
--   "max_uses": 1,
--   "expires_at": "2025-12-28T12:00:00Z",
--   "created_at": "2025-12-21T12:00:00Z"
-- }
