-- Fix Invite Token Generation - Enable pgcrypto and Schema Qualification
-- Issue: gen_random_bytes() requires pgcrypto extension
-- Security: Change search_path from 'public' to '' and schema-qualify all identifiers

-- ============================================================
-- 1. Enable pgcrypto Extension
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- ============================================================
-- 2. Add Unique Index on Token (for collision detection)
-- ============================================================

-- This prevents duplicate tokens and enables INSERT ... ON CONFLICT
CREATE UNIQUE INDEX IF NOT EXISTS invite_tokens_token_unique_idx 
ON public.invite_tokens(token);

-- ============================================================
-- 3. Fix generate_invite_token Function with Schema Qualification
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_invite_token(
  p_property_id uuid,
  p_max_uses integer DEFAULT 1,
  p_expires_in_days integer DEFAULT 7
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''  -- CRITICAL: Empty search path for security
AS $$
DECLARE
  v_token text;
  v_token_id uuid;
  v_landlord_id uuid;
  v_property_name text;
  v_expires_at timestamptz;
  v_max_retries integer := 5;
  v_retry_count integer := 0;
BEGIN
  -- Get authenticated user ID (schema-qualified)
  v_landlord_id := auth.uid();

  IF v_landlord_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Verify landlord owns the property (schema-qualified)
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

  -- Calculate expiration timestamp
  v_expires_at := clock_timestamp() + (p_expires_in_days || ' days')::interval;

  -- Generate token with collision retry (handle rare duplicates)
  LOOP
    -- Generate random 12-character base62 token
    -- Use extensions.gen_random_bytes (schema-qualified!)
    v_token := encode(
      extensions.gen_random_bytes(9),
      'base64'
    );
    
    -- Clean up base64 to base62 (remove +, /, =)
    v_token := replace(replace(replace(v_token, '+', ''), '/', ''), '=', '');
    
    -- Truncate to exactly 12 chars
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
        RAISE EXCEPTION 'Failed to generate unique token after % attempts', v_max_retries;
      END IF;
      
      -- Log collision (rare event worth noting)
      RAISE WARNING 'Token collision detected, retry %/%', v_retry_count, v_max_retries;
      
      -- Continue loop to retry with new token
    END;
  END LOOP;

  -- Return success with token (only time token value is exposed)
  -- Use public.json_build_object (schema-qualified)
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

-- ============================================================
-- 4. Permissions (Unchanged but explicit)
-- ============================================================

REVOKE ALL ON FUNCTION public.generate_invite_token FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.generate_invite_token TO authenticated;

-- ============================================================
-- 5. Comments
-- ============================================================

COMMENT ON FUNCTION public.generate_invite_token IS 
'Generate invite token for property (authenticated landlords only). 
Uses schema-qualified extensions.gen_random_bytes for security. 
Handles token collisions with retry logic.';

-- ============================================================
-- 6. Smoke Tests (Run these manually to verify)
-- ============================================================

-- Test 1: Verify pgcrypto extension is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pgcrypto'
  ) THEN
    RAISE EXCEPTION 'SMOKE TEST FAILED: pgcrypto extension not enabled';
  END IF;
  RAISE NOTICE 'SMOKE TEST PASSED: pgcrypto extension enabled';
END $$;

-- Test 2: Verify extensions.gen_random_bytes is accessible
DO $$
DECLARE
  v_test_bytes bytea;
BEGIN
  v_test_bytes := extensions.gen_random_bytes(12);
  IF length(v_test_bytes) != 12 THEN
    RAISE EXCEPTION 'SMOKE TEST FAILED: gen_random_bytes returned wrong length';
  END IF;
  RAISE NOTICE 'SMOKE TEST PASSED: extensions.gen_random_bytes() works';
END $$;

-- Test 3: Verify token generation produces valid 12-char tokens
-- (Can only be tested with authenticated session, so this is a manual test)
-- Example:
-- SELECT public.generate_invite_token(
--   '<property_id>'::uuid,
--   1,
--   7
-- );
-- Should return JSON with 'token' field containing 12-character string

-- Test 4: Verify unique index exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'invite_tokens' 
    AND indexname = 'invite_tokens_token_unique_idx'
  ) THEN
    RAISE EXCEPTION 'SMOKE TEST FAILED: Unique index on token not created';
  END IF;
  RAISE NOTICE 'SMOKE TEST PASSED: Unique index on token exists';
END $$;

-- ============================================================
-- Migration Notes
-- ============================================================

-- BEFORE: Function had search_path = public (insecure)
-- AFTER:  Function has search_path = '' (secure)
--
-- BEFORE: gen_random_bytes() unqualified (fails with empty search_path)
-- AFTER:  extensions.gen_random_bytes() (schema-qualified)
--
-- BEFORE: No collision handling (tokens assumed unique)
-- AFTER:  Retry loop with unique_violation exception handling
--
-- BEFORE: No unique constraint on token
-- AFTER:  Unique index prevents duplicates and enables ON CONFLICT
--
-- Security improvements:
-- - Empty search_path prevents search path manipulation attacks
-- - Schema-qualified auth.uid() prevents function hijacking
-- - Schema-qualified table/function references are explicit
--
-- Operational improvements:
-- - Handles rare token collisions gracefully
-- - Logs warnings on collision for monitoring
-- - Fails explicitly after max retries
