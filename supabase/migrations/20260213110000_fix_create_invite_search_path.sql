-- Fix create_invite search_path to include extensions schema
-- The accept_invite function was already fixed (20251229000002) to use
-- SET search_path = public, extensions
-- but create_invite was missed. While the function uses fully-qualified
-- extensions.gen_random_bytes() and extensions.digest(), adding extensions
-- to the search_path ensures consistent behavior and prevents potential
-- resolution issues in edge cases.

CREATE OR REPLACE FUNCTION public.create_invite(
  p_property_id UUID,
  p_delivery_method TEXT,
  p_intended_email TEXT DEFAULT NULL
)
RETURNS TABLE(token TEXT, invite_id UUID, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_token TEXT;
  v_token_hash TEXT;
  v_salt TEXT;
  v_invite_id UUID;
  v_expires_at TIMESTAMPTZ;
  v_user_id UUID;
BEGIN
  -- Get authenticated user
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Input validation
  IF p_delivery_method NOT IN ('email', 'code') THEN
    RAISE EXCEPTION 'Invalid delivery method. Must be ''email'' or ''code''';
  END IF;

  IF p_delivery_method = 'email' AND (p_intended_email IS NULL OR p_intended_email = '') THEN
    RAISE EXCEPTION 'Email address required for email delivery method';
  END IF;

  -- Verify landlord owns property
  IF NOT EXISTS (
    SELECT 1 FROM public.properties
    WHERE id = p_property_id AND landlord_id = v_user_id
  ) THEN
    RAISE EXCEPTION 'Property not found or access denied';
  END IF;

  -- Generate 12-character cryptographically secure token
  v_token := upper(substring(
    regexp_replace(
      encode(gen_random_bytes(10), 'base64'),
      '[^A-Za-z0-9]', '', 'g'
    ) from 1 for 12
  ));

  -- Ensure exactly 12 characters (regenerate if needed)
  WHILE length(v_token) < 12 LOOP
    v_token := v_token || upper(substring(
      regexp_replace(
        encode(gen_random_bytes(3), 'base64'),
        '[^A-Za-z0-9]', '', 'g'
      ) from 1 for 1
    ));
  END LOOP;
  v_token := substring(v_token from 1 for 12);

  -- Generate per-token salt (16 bytes = 32 hex chars)
  v_salt := encode(gen_random_bytes(16), 'hex');

  -- Hash token with salt: sha256(token || salt)
  v_token_hash := encode(
    digest(v_token || v_salt, 'sha256'),
    'hex'
  );

  -- Calculate expiration (48 hours from now)
  v_expires_at := NOW() + INTERVAL '48 hours';

  -- Insert invite (store hash + salt, NEVER plaintext token)
  INSERT INTO public.invites (
    property_id,
    created_by,
    token_hash,
    token_salt,
    intended_email,
    delivery_method,
    expires_at
  )
  VALUES (
    p_property_id,
    v_user_id,
    v_token_hash,
    v_salt,
    p_intended_email,
    p_delivery_method,
    v_expires_at
  )
  RETURNING id INTO v_invite_id;

  -- Return plaintext token ONLY to caller (never stored in database)
  RETURN QUERY SELECT v_token, v_invite_id, v_expires_at;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_invite(UUID, TEXT, TEXT) TO authenticated;
