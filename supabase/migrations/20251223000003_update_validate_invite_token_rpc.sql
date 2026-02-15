-- Update validate_invite_token RPC to return additional fields for edge case handling
-- Returns: intended_email, max_uses, use_count for client-side validation

DROP FUNCTION IF EXISTS public.validate_invite_token(TEXT);

CREATE OR REPLACE FUNCTION public.validate_invite_token(p_token TEXT)
RETURNS TABLE(
  valid BOOLEAN,
  error TEXT,
  property JSONB,
  token_id UUID,
  expires_at TIMESTAMPTZ,
  intended_email TEXT,
  max_uses INT,
  use_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_record RECORD;
  v_property_data JSONB;
BEGIN
  -- Find the token (using index for constant-time lookup)
  -- NOTE: Must qualify column names to avoid ambiguity with RETURNS TABLE columns
  SELECT *
  INTO v_token_record
  FROM invite_tokens
  WHERE invite_tokens.token = p_token
    AND invite_tokens.revoked_at IS NULL
    AND invite_tokens.used_at IS NULL
    AND invite_tokens.expires_at > NOW();

  -- Token not found or invalid
  IF v_token_record IS NULL THEN
    -- Generic error to prevent token enumeration
    valid := FALSE;
    error := 'invalid';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Check if capacity reached
  IF v_token_record.use_count >= v_token_record.max_uses THEN
    valid := FALSE;
    error := 'capacity_reached';
    max_uses := v_token_record.max_uses;
    use_count := v_token_record.use_count;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Get property details
  SELECT jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'address', p.address,
    'address_jsonb', p.address_jsonb,
    'unit', p.unit,
    'landlord_name', prof.name,
    'landlord_id', p.landlord_id
  )
  INTO v_property_data
  FROM properties p
  LEFT JOIN profiles prof ON p.landlord_id = prof.id
  WHERE p.id = v_token_record.property_id;

  IF v_property_data IS NULL THEN
    valid := FALSE;
    error := 'property_not_found';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Token is valid - return full details
  valid := TRUE;
  error := NULL;
  property := v_property_data;
  token_id := v_token_record.id;
  expires_at := v_token_record.expires_at;
  intended_email := v_token_record.intended_email;
  max_uses := v_token_record.max_uses;
  use_count := v_token_record.use_count;

  RETURN NEXT;
END;
$$;

-- Grant execute to authenticated and anon (public validation)
GRANT EXECUTE ON FUNCTION public.validate_invite_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_invite_token(TEXT) TO anon;

-- Add comment
COMMENT ON FUNCTION public.validate_invite_token(TEXT) IS
  'Validate an invite token and return property details with edge case metadata (intended_email, capacity, etc.)';
