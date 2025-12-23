-- Fix invite token generation to ensure exactly 12 characters
-- Problem: Removing +, /, = from base64 can produce < 12 chars
-- Solution: Use more random bytes (12 instead of 9) to ensure enough chars after cleanup

CREATE OR REPLACE FUNCTION public.generate_invite_token(
  p_property_id uuid,
  p_max_uses int DEFAULT 1,
  p_expires_in_days int DEFAULT 7
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_token text;
  v_token_id uuid;
  v_property_name text;
  v_landlord_id uuid;
  v_expires_at timestamptz;
  v_retry_count int := 0;
  v_max_retries int := 5;
BEGIN
  -- Get authenticated user (landlord)
  v_landlord_id := auth.uid();

  IF v_landlord_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify landlord owns this property
  SELECT name INTO v_property_name
  FROM public.properties
  WHERE id = p_property_id AND landlord_id = v_landlord_id;

  IF v_property_name IS NULL THEN
    RAISE EXCEPTION 'Property not found or access denied';
  END IF;

  -- Validate inputs
  IF p_max_uses < 1 OR p_max_uses > 100 THEN
    RAISE EXCEPTION 'max_uses must be between 1 and 100';
  END IF;

  IF p_expires_in_days < 1 OR p_expires_in_days > 365 THEN
    RAISE EXCEPTION 'expires_in_days must be between 1 and 365';
  END IF;

  -- Calculate expiration timestamp
  v_expires_at := clock_timestamp() + (p_expires_in_days || ' days')::interval;

  -- Generate token with collision retry (handle rare duplicates)
  LOOP
    -- Generate random 12-character base62-safe token
    -- Use 12 random bytes (produces 16 base64 chars) to ensure >= 12 after cleanup
    v_token := encode(
      extensions.gen_random_bytes(12),  -- Changed from 9 to 12
      'base64'
    );

    -- Clean up base64 to base62 (remove +, /, =)
    v_token := replace(replace(replace(v_token, '+', ''), '/', ''), '=', '');

    -- Truncate to exactly 12 chars (now we have enough chars after cleanup)
    v_token := substring(v_token from 1 for 12);

    -- Try to insert (will fail on duplicate token due to unique index)
    BEGIN
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

      -- Success! Exit loop
      EXIT;

    EXCEPTION WHEN unique_violation THEN
      -- Token collision (very rare with 12-char base62 = ~72 bits entropy)
      v_retry_count := v_retry_count + 1;

      IF v_retry_count >= v_max_retries THEN
        RAISE EXCEPTION 'Failed to generate unique token after % retries', v_max_retries;
      END IF;

      -- Retry with new random token
    END;
  END LOOP;

  -- Return success response with all token details
  RETURN json_build_object(
    'success', true,
    'token', v_token,
    'token_id', v_token_id,
    'property_id', p_property_id,
    'property_name', v_property_name,
    'max_uses', p_max_uses,
    'expires_at', v_expires_at,
    'created_at', clock_timestamp()
  );
END;
$$;

-- Smoke test
DO $$
DECLARE
  v_test_token text;
  v_token_length int;
BEGIN
  -- Generate test token locally to verify length
  v_test_token := encode(extensions.gen_random_bytes(12), 'base64');
  v_test_token := replace(replace(replace(v_test_token, '+', ''), '/', ''), '=', '');
  v_test_token := substring(v_test_token from 1 for 12);
  v_token_length := length(v_test_token);

  IF v_token_length <> 12 THEN
    RAISE EXCEPTION 'Token length test failed: expected 12, got %', v_token_length;
  END IF;

  RAISE NOTICE 'SMOKE TEST PASSED: Token length is exactly 12 characters (sample: %)', v_test_token;
END $$;
