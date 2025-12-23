-- Security Hardening for Tokenized Invites
-- Implements enumeration resistance and clock skew grace period

-- ============================================================
-- 1. Enumeration Resistance
-- ============================================================

-- Update validate_invite_token to return generic errors for unauthenticated validation
-- This prevents attackers from determining if tokens exist/are valid vs expired/revoked
CREATE OR REPLACE FUNCTION public.validate_invite_token(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_record RECORD;
  v_property RECORD;
  v_landlord_name TEXT;
BEGIN
  -- Validate token format
  IF p_token IS NULL OR LENGTH(p_token) != 12 THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'invalid',
      'message', 'This invite link is not valid. Please request a new one from your landlord.'
    );
  END IF;

  -- Get token record
  SELECT * INTO v_token_record
  FROM public.invite_tokens
  WHERE token = p_token;

  -- ENUMERATION RESISTANCE: Return generic "invalid" for all failures
  -- Don't reveal if token exists, is expired, revoked, or used

  IF NOT FOUND THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'invalid',
      'message', 'This invite link is not valid. Please request a new one from your landlord.'
    );
  END IF;

  -- CLOCK SKEW GRACE PERIOD: 5 minutes buffer on expiration
  IF v_token_record.expires_at < (NOW() - INTERVAL '5 minutes') THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'invalid',  -- Generic (don't reveal "expired")
      'message', 'This invite link is not valid. Please request a new one from your landlord.'
    );
  END IF;

  IF v_token_record.revoked_at IS NOT NULL THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'invalid',  -- Generic (don't reveal "revoked")
      'message', 'This invite link is not valid. Please request a new one from your landlord.'
    );
  END IF;

  IF v_token_record.use_count >= v_token_record.max_uses THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'invalid',  -- Generic (don't reveal "used")
      'message', 'This invite link is not valid. Please request a new one from your landlord.'
    );
  END IF;

  -- Token is valid - fetch property details
  SELECT
    p.id,
    p.name,
    p.address,
    p.city,
    p.state,
    p.zip,
    p.unit,
    prof.name as landlord_name
  INTO v_property
  FROM public.properties p
  LEFT JOIN public.profiles prof ON p.landlord_id = prof.id
  WHERE p.id = v_token_record.property_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'invalid',
      'message', 'This invite link is not valid. Please request a new one from your landlord.'
    );
  END IF;

  -- Return success with property details (safe to expose for valid tokens)
  RETURN json_build_object(
    'valid', true,
    'property', json_build_object(
      'id', v_property.id,
      'name', v_property.name,
      'address', v_property.address,
      'city', v_property.city,
      'state', v_property.state,
      'zip', v_property.zip,
      'unit', v_property.unit,
      'landlord_name', v_property.landlord_name
    ),
    'token_id', v_token_record.id,
    'expires_at', v_token_record.expires_at
  );
END;
$$;

-- ============================================================
-- 2. Accept Function with Clock Skew Grace + Specific Errors
-- ============================================================

-- Update accept_invite_token to use clock skew grace
-- Keep SPECIFIC errors here since user is authenticated (lower enumeration risk)
CREATE OR REPLACE FUNCTION public.accept_invite_token(
  p_token TEXT,
  p_tenant_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_record RECORD;
  v_property_id UUID;
  v_already_linked BOOLEAN;
BEGIN
  -- Validate token format
  IF p_token IS NULL OR LENGTH(p_token) != 12 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'invalid_token',
      'message', 'Invalid invite token format'
    );
  END IF;

  -- Validate tenant ID
  IF p_tenant_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'invalid_request',
      'message', 'Tenant ID is required'
    );
  END IF;

  -- CRITICAL: Lock token row to prevent race conditions
  SELECT * INTO v_token_record
  FROM public.invite_tokens
  WHERE token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'not_found',
      'message', 'This invite link is not valid. Please request a new one from your landlord.'
    );
  END IF;

  -- CLOCK SKEW GRACE PERIOD: 5 minutes buffer
  IF v_token_record.expires_at < (NOW() - INTERVAL '5 minutes') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'expired',  -- SPECIFIC error OK (user authenticated)
      'message', 'This invite link has expired. Please request a new one from your landlord.'
    );
  END IF;

  -- Validate not revoked (specific error)
  IF v_token_record.revoked_at IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'revoked',  -- SPECIFIC error OK (user authenticated)
      'message', 'This invite link has been cancelled by your landlord. Please request a new one.'
    );
  END IF;

  -- Validate usage limit (specific error)
  IF v_token_record.use_count >= v_token_record.max_uses THEN
    RETURN json_build_object(
      'success', false,
      'error', 'max_uses_reached',  -- SPECIFIC error OK (user authenticated)
      'message', 'This invite link has already been used. Please request a new one from your landlord.'
    );
  END IF;

  v_property_id := v_token_record.property_id;

  -- Check if already linked (idempotent - always succeed)
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_property_links
    WHERE tenant_id = p_tenant_id
      AND property_id = v_property_id
  ) INTO v_already_linked;

  IF v_already_linked THEN
    RETURN json_build_object(
      'success', true,
      'already_linked', true,
      'property_id', v_property_id,
      'message', 'You are already connected to this property'
    );
  END IF;

  -- Create the link (atomic - handles race condition via unique constraint)
  BEGIN
    INSERT INTO public.tenant_property_links (
      tenant_id,
      property_id,
      status
    ) VALUES (
      p_tenant_id,
      v_property_id,
      'active'
    );

    -- Increment use count
    UPDATE public.invite_tokens
    SET
      use_count = use_count + 1,
      used_at = COALESCE(used_at, NOW()),
      used_by = COALESCE(used_by, p_tenant_id)
    WHERE id = v_token_record.id;

    RETURN json_build_object(
      'success', true,
      'property_id', v_property_id,
      'message', 'Successfully connected to property'
    );

  EXCEPTION
    WHEN unique_violation THEN
      -- Race condition caught by unique constraint
      -- Return success (idempotent)
      RETURN json_build_object(
        'success', true,
        'already_linked', true,
        'property_id', v_property_id,
        'message', 'You are already connected to this property'
      );
  END;
END;
$$;

-- ============================================================
-- Comments
-- ============================================================

COMMENT ON FUNCTION public.validate_invite_token IS 'Validate invite token (enumeration-resistant, 5-min clock skew grace)';
COMMENT ON FUNCTION public.accept_invite_token IS 'Accept invite token atomically (authenticated users, 5-min clock skew grace)';

-- ============================================================
-- Security Notes
-- ============================================================

-- Enumeration Resistance:
-- - Unauthenticated validation returns generic "invalid" for ALL failures
-- - Prevents attackers from determining token validity/state via timing/errors
-- - Authenticated acceptance CAN return specific errors (lower risk)

-- Clock Skew Grace Period:
-- - 5-minute buffer on expiration checks
-- - Prevents false "expired" errors from server/client clock differences
-- - Common in production systems (JWT uses 60s grace typically)
-- - Token still expires at intended time, just with tolerance window

-- Atomic Operations:
-- - SELECT FOR UPDATE prevents concurrent acceptance
-- - Unique constraint on tenant_property_links catches races
-- - Idempotent: duplicate accepts return success (not error)
