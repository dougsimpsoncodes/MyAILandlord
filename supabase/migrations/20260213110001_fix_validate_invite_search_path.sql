-- Fix validate_invite search_path to include extensions schema
-- Matches the pattern from accept_invite (20251229000002) and create_invite (20260213110000)

CREATE OR REPLACE FUNCTION public.validate_invite(p_token TEXT)
RETURNS TABLE(
  valid BOOLEAN,
  property_id UUID,
  property_name TEXT,
  property_address TEXT,
  property_unit TEXT,
  landlord_name TEXT,
  invite_id UUID,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_invite RECORD;
  v_recent_attempts INTEGER;
BEGIN
  -- Basic rate limiting: Check global validation attempts in last minute
  SELECT COUNT(*) INTO v_recent_attempts
  FROM public.invites
  WHERE last_validation_attempt > NOW() - INTERVAL '1 minute';

  IF v_recent_attempts > 20 THEN
    RETURN QUERY SELECT
      FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::UUID, NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  -- Find invite by hashed token (hash each candidate with its salt)
  SELECT i.id, i.property_id, i.expires_at, i.token_salt
  INTO v_invite
  FROM public.invites i
  WHERE i.token_hash = encode(digest(p_token || i.token_salt, 'sha256'), 'hex')
    AND i.accepted_at IS NULL
    AND i.deleted_at IS NULL
    AND i.expires_at > NOW()
  LIMIT 1;

  -- Update rate limit tracking
  IF v_invite.id IS NOT NULL THEN
    UPDATE public.invites
    SET validation_attempts = validation_attempts + 1,
        last_validation_attempt = NOW()
    WHERE id = v_invite.id;
  END IF;

  -- Return property details if valid
  IF v_invite.id IS NOT NULL THEN
    RETURN QUERY
    SELECT TRUE, p.id, p.name, p.address, p.unit, prof.name, v_invite.id, v_invite.expires_at
    FROM public.properties p
    JOIN public.profiles prof ON p.landlord_id = prof.id
    WHERE p.id = v_invite.property_id;
  ELSE
    RETURN QUERY SELECT
      FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::UUID, NULL::TIMESTAMPTZ;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_invite(TEXT) TO anon, authenticated;
