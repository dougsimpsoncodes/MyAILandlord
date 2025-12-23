-- Migration: Tokenized Invites (Production-Ready)
-- Addresses: Atomic operations, unique constraints, token lifecycle

-- ============================================================
-- STEP 1: Add unique constraint to prevent duplicate links
-- ============================================================

-- Drop existing constraint if it exists
ALTER TABLE IF EXISTS public.tenant_property_links
  DROP CONSTRAINT IF EXISTS tenant_property_links_tenant_property_unique;

-- Add unique constraint (tenant_id, property_id)
-- This ensures deterministic "already linked" behavior
ALTER TABLE public.tenant_property_links
  ADD CONSTRAINT tenant_property_links_tenant_property_unique
  UNIQUE (tenant_id, property_id);

-- ============================================================
-- STEP 2: Create invite_tokens table with proper indexing
-- ============================================================

CREATE TABLE IF NOT EXISTS public.invite_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Short, URL-safe token (12-16 chars, base62)
  token TEXT NOT NULL UNIQUE,

  -- Property and creator references
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),

  -- Usage tracking
  used_at TIMESTAMPTZ,
  used_by UUID REFERENCES auth.users(id),
  use_count INTEGER NOT NULL DEFAULT 0,
  max_uses INTEGER NOT NULL DEFAULT 1,

  -- Revocation
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id)
);

-- ============================================================
-- STEP 3: Indexes for performance
-- ============================================================

-- Fast token lookup (only valid tokens)
CREATE INDEX idx_invite_tokens_active
  ON public.invite_tokens(token)
  WHERE revoked_at IS NULL
    AND used_at IS NULL
    AND expires_at > NOW();

-- Property lookup (for landlord UI - list/revoke)
CREATE INDEX idx_invite_tokens_property
  ON public.invite_tokens(property_id, created_at DESC);

-- Cleanup query optimization
CREATE INDEX idx_invite_tokens_expired
  ON public.invite_tokens(expires_at)
  WHERE revoked_at IS NULL;

-- ============================================================
-- STEP 4: Row Level Security (RLS)
-- ============================================================

ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;

-- Landlords can create tokens for their properties
CREATE POLICY "Landlords create invites for owned properties"
  ON public.invite_tokens
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = property_id AND landlord_id = auth.uid()
    )
  );

-- Landlords can view their own tokens
CREATE POLICY "Landlords view own invite tokens"
  ON public.invite_tokens
  FOR SELECT
  TO authenticated
  USING (created_by = auth.uid());

-- Landlords can revoke their own tokens
CREATE POLICY "Landlords revoke own invite tokens"
  ON public.invite_tokens
  FOR UPDATE
  TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- ============================================================
-- STEP 5: Atomic Accept Function (Prevents Race Conditions)
-- ============================================================

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
  v_result JSON;
BEGIN
  -- CRITICAL: Use SELECT FOR UPDATE to lock the row
  -- This prevents concurrent accepts from both succeeding
  SELECT
    id,
    token,
    property_id,
    expires_at,
    used_at,
    revoked_at,
    use_count,
    max_uses
  INTO v_token_record
  FROM public.invite_tokens
  WHERE token = p_token
  FOR UPDATE;

  -- Validate token exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'invalid_token',
      'message', 'Invite link is invalid or has expired'
    );
  END IF;

  -- Validate not expired
  IF v_token_record.expires_at < NOW() THEN
    RETURN json_build_object(
      'success', false,
      'error', 'expired',
      'message', 'This invite link has expired. Please request a new one.'
    );
  END IF;

  -- Validate not revoked
  IF v_token_record.revoked_at IS NOT NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'revoked',
      'message', 'This invite link has been revoked.'
    );
  END IF;

  -- Validate usage limit
  IF v_token_record.use_count >= v_token_record.max_uses THEN
    RETURN json_build_object(
      'success', false,
      'error', 'max_uses_reached',
      'message', 'This invite link has already been used.'
    );
  END IF;

  v_property_id := v_token_record.property_id;

  -- Check if already linked (idempotent)
  SELECT EXISTS (
    SELECT 1 FROM public.tenant_property_links
    WHERE tenant_id = p_tenant_id
      AND property_id = v_property_id
  ) INTO v_already_linked;

  IF v_already_linked THEN
    -- Already linked - don't increment use_count, just return success
    RETURN json_build_object(
      'success', true,
      'already_linked', true,
      'property_id', v_property_id,
      'message', 'You are already connected to this property'
    );
  END IF;

  -- Create the link (this can still fail due to unique constraint, that's OK)
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

    -- Mark token as used (increment use_count, set used_at if first use)
    UPDATE public.invite_tokens
    SET
      use_count = use_count + 1,
      used_at = COALESCE(used_at, NOW()),
      used_by = COALESCE(used_by, p_tenant_id)
    WHERE id = v_token_record.id;

    RETURN json_build_object(
      'success', true,
      'already_linked', false,
      'property_id', v_property_id,
      'message', 'Successfully connected to property'
    );

  EXCEPTION
    WHEN unique_violation THEN
      -- Race condition: another transaction inserted the link
      -- This is OK - return success anyway (idempotent)
      RETURN json_build_object(
        'success', true,
        'already_linked', true,
        'property_id', v_property_id,
        'message', 'You are already connected to this property'
      );
  END;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.accept_invite_token(TEXT, UUID) TO authenticated;

-- ============================================================
-- STEP 6: Token Validation Function (For Preview)
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_invite_token(p_token TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_record RECORD;
  v_property RECORD;
BEGIN
  -- Look up token (no lock needed for read-only validation)
  SELECT
    id,
    property_id,
    expires_at,
    revoked_at,
    use_count,
    max_uses
  INTO v_token_record
  FROM public.invite_tokens
  WHERE token = p_token;

  -- Validate token exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'invalid_token',
      'message', 'Invite link is invalid or has expired'
    );
  END IF;

  -- Validate not expired
  IF v_token_record.expires_at < NOW() THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'expired',
      'message', 'This invite link has expired. Please request a new one.',
      'expired_at', v_token_record.expires_at
    );
  END IF;

  -- Validate not revoked
  IF v_token_record.revoked_at IS NOT NULL THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'revoked',
      'message', 'This invite link has been revoked.'
    );
  END IF;

  -- Validate usage limit
  IF v_token_record.use_count >= v_token_record.max_uses THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'max_uses_reached',
      'message', 'This invite link has already been used.'
    );
  END IF;

  -- Fetch safe property details
  SELECT
    id,
    name,
    address,
    property_type
  INTO v_property
  FROM public.properties
  WHERE id = v_token_record.property_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'valid', false,
      'error', 'property_not_found',
      'message', 'Property no longer exists'
    );
  END IF;

  -- Return valid token with property preview
  RETURN json_build_object(
    'valid', true,
    'property', json_build_object(
      'id', v_property.id,
      'name', v_property.name,
      'address', v_property.address,
      'property_type', v_property.property_type
    ),
    'expires_at', v_token_record.expires_at,
    'uses_remaining', v_token_record.max_uses - v_token_record.use_count
  );
END;
$$;

-- Grant execute permission to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.validate_invite_token(TEXT) TO anon, authenticated;

-- ============================================================
-- STEP 7: Token Cleanup Function (For Scheduled Cron)
-- ============================================================

CREATE OR REPLACE FUNCTION public.cleanup_expired_invite_tokens()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete tokens that are:
  -- 1. Expired for more than 7 days (keep recent for analytics)
  -- 2. OR revoked for more than 30 days
  -- 3. OR used and expired
  DELETE FROM public.invite_tokens
  WHERE
    (expires_at < NOW() - INTERVAL '7 days')
    OR (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '30 days')
    OR (use_count >= max_uses AND expires_at < NOW());

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN json_build_object(
    'deleted_count', v_deleted_count,
    'cleaned_at', NOW()
  );
END;
$$;

-- Grant execute to service role (for cron job)
-- Note: This will be called by a Supabase cron job or Edge Function

-- ============================================================
-- STEP 8: Revoke Token Function (For Landlord UI)
-- ============================================================

CREATE OR REPLACE FUNCTION public.revoke_invite_token(
  p_token_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_revoked BOOLEAN;
BEGIN
  -- Revoke the token (only if owned by calling user)
  UPDATE public.invite_tokens
  SET
    revoked_at = NOW(),
    revoked_by = auth.uid()
  WHERE
    id = p_token_id
    AND created_by = auth.uid()
    AND revoked_at IS NULL
  RETURNING true INTO v_revoked;

  IF v_revoked THEN
    RETURN json_build_object(
      'success', true,
      'message', 'Invite link has been revoked'
    );
  ELSE
    RETURN json_build_object(
      'success', false,
      'error', 'not_found_or_unauthorized',
      'message', 'Token not found or you do not have permission to revoke it'
    );
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_invite_token(UUID) TO authenticated;

-- ============================================================
-- STEP 9: Migration Complete
-- ============================================================

-- Add migration record
INSERT INTO public.schema_migrations (version, name)
VALUES ('20251221000000', 'tokenized_invites_production_ready')
ON CONFLICT (version) DO NOTHING;

COMMENT ON TABLE public.invite_tokens IS 'Tokenized property invite links with expiration, revocation, and usage limits';
COMMENT ON FUNCTION public.accept_invite_token IS 'Atomic invite acceptance with race condition protection (SELECT FOR UPDATE)';
COMMENT ON FUNCTION public.validate_invite_token IS 'Validate invite token and return property preview (safe for unauthenticated users)';
COMMENT ON FUNCTION public.cleanup_expired_invite_tokens IS 'Scheduled cleanup of expired/revoked tokens (run daily via cron)';
COMMENT ON FUNCTION public.revoke_invite_token IS 'Revoke an invite token (landlord only)';
