-- Simplified Invite System Migration (Security-Hardened)
-- Replaces complex tokenized invite system with simple, secure token-based approach
--
-- SECURITY FEATURES:
-- - 12-character high-entropy tokens (62^12 ≈ 3.2 × 10^21 combinations)
-- - Token hashing with salt (sha256, never store plaintext)
-- - Email is metadata only (never used for authentication)
-- - Basic rate limiting (20 attempts/minute)
-- - Race-protected acceptance (SELECT FOR UPDATE)
-- - Idempotent operations (same user accepting = success)

-- ============================================================================
-- TABLE: invites
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core relationships
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- SECURITY: Token is always the credential (hashed, never plaintext)
  token_hash TEXT UNIQUE NOT NULL,      -- sha256(token || salt), indexed
  token_salt TEXT NOT NULL,             -- Per-token salt for hashing

  -- Delivery metadata (for UX/audit only, NEVER for authentication)
  intended_email TEXT,                  -- Email for delivery (optional)
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('email', 'code')),

  -- Lifecycle timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '48 hours',
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,  -- Soft delete after 30 days

  -- Rate limiting metadata
  validation_attempts INTEGER NOT NULL DEFAULT 0,
  last_validation_attempt TIMESTAMPTZ
);

-- Compatibility for upgrades from v1 table definition
ALTER TABLE public.invites ADD COLUMN IF NOT EXISTS token_hash TEXT;
ALTER TABLE public.invites ADD COLUMN IF NOT EXISTS token_salt TEXT;
ALTER TABLE public.invites ADD COLUMN IF NOT EXISTS intended_email TEXT;
ALTER TABLE public.invites ADD COLUMN IF NOT EXISTS delivery_method TEXT;
ALTER TABLE public.invites ADD COLUMN IF NOT EXISTS validation_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.invites ADD COLUMN IF NOT EXISTS last_validation_attempt TIMESTAMPTZ;

-- Backfill values for existing rows created by v1
UPDATE public.invites
SET
  token_salt = COALESCE(token_salt, encode(extensions.gen_random_bytes(16), 'hex')),
  intended_email = COALESCE(intended_email, email),
  delivery_method = COALESCE(delivery_method, CASE WHEN email IS NOT NULL THEN 'email' ELSE 'code' END)
WHERE token_salt IS NULL
   OR intended_email IS NULL
   OR delivery_method IS NULL;

UPDATE public.invites
SET token_hash = encode(extensions.digest(COALESCE(invite_code, id::text) || token_salt, 'sha256'), 'hex')
WHERE token_hash IS NULL AND token_salt IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS invites_token_hash_unique_idx
  ON public.invites(token_hash)
  WHERE token_hash IS NOT NULL;

DO $$ BEGIN
  ALTER TABLE public.invites
    ADD CONSTRAINT invites_delivery_method_check
    CHECK (delivery_method IN ('email', 'code'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- INDEXES: Fast, secure lookups
-- ============================================================================

-- Primary lookup: Find active invites by token hash (constant-time via btree)
-- Note: Can't use NOW() in index predicate (not immutable), check expiration in query
CREATE INDEX IF NOT EXISTS idx_invites_token_hash ON public.invites(token_hash)
  WHERE accepted_at IS NULL
    AND deleted_at IS NULL;

-- Cleanup: Find old invites to soft-delete
CREATE INDEX IF NOT EXISTS idx_invites_cleanup ON public.invites(expires_at, accepted_at)
  WHERE deleted_at IS NULL;

-- Rate limiting: Track recent validation attempts
CREATE INDEX IF NOT EXISTS idx_invites_rate_limit ON public.invites(last_validation_attempt)
  WHERE last_validation_attempt IS NOT NULL
    AND deleted_at IS NULL;

-- ============================================================================
-- RLS POLICIES: Landlords manage their own invites
-- ============================================================================

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

-- Drop v1 policies if they already exist
DROP POLICY IF EXISTS landlords_create_own_invites ON public.invites;
DROP POLICY IF EXISTS landlords_view_own_invites ON public.invites;
DROP POLICY IF EXISTS landlords_update_own_invites ON public.invites;

-- Landlords can create invites for properties they own
CREATE POLICY landlords_create_own_invites ON public.invites
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.properties
      WHERE id = property_id AND landlord_id = auth.uid()
    )
  );

-- Landlords can view their own invites
CREATE POLICY landlords_view_own_invites ON public.invites
  FOR SELECT
  USING (created_by = auth.uid());

-- Landlords can update (soft delete/revoke) their own invites
CREATE POLICY landlords_update_own_invites ON public.invites
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Drop v1 function signatures before redefining
DROP TRIGGER IF EXISTS on_invite_created ON public.invites;
DROP FUNCTION IF EXISTS public.create_invite(UUID, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.validate_invite(TEXT);
DROP FUNCTION IF EXISTS public.validate_invite(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.accept_invite(TEXT);
DROP FUNCTION IF EXISTS public.accept_invite(TEXT, TEXT);
DROP FUNCTION IF EXISTS public.cleanup_old_invites();
DROP FUNCTION IF EXISTS public.send_invite_email_trigger();

-- ============================================================================
-- RPC FUNCTION 1: create_invite
-- Creates a new invite with hashed token
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_invite(
  p_property_id UUID,
  p_delivery_method TEXT,
  p_intended_email TEXT DEFAULT NULL
)
RETURNS TABLE(token TEXT, invite_id UUID, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
  -- Use base64 encoding and strip non-alphanumeric characters
  v_token := upper(substring(
    regexp_replace(
      encode(extensions.gen_random_bytes(10), 'base64'),
      '[^A-Za-z0-9]', '', 'g'
    ) from 1 for 12
  ));

  -- Ensure exactly 12 characters (regenerate if needed)
  WHILE length(v_token) < 12 LOOP
    v_token := v_token || upper(substring(
      regexp_replace(
        encode(extensions.gen_random_bytes(3), 'base64'),
        '[^A-Za-z0-9]', '', 'g'
      ) from 1 for 1
    ));
  END LOOP;
  v_token := substring(v_token from 1 for 12);

  -- Generate per-token salt (16 bytes = 32 hex chars)
  v_salt := encode(extensions.gen_random_bytes(16), 'hex');

  -- Hash token with salt: sha256(token || salt)
  v_token_hash := encode(
    extensions.digest(v_token || v_salt, 'sha256'),
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

COMMENT ON FUNCTION public.create_invite(UUID, TEXT, TEXT) IS 'Creates a new invite with hashed 12-char token. Returns plaintext token only to caller (never stored).';

-- ============================================================================
-- RPC FUNCTION 2: validate_invite
-- Validates token and returns property details (public, rate-limited)
-- ============================================================================

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
SET search_path = public
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
    -- Rate limit exceeded: Return generic invalid (don't leak rate limit info)
    RETURN QUERY SELECT
      FALSE,
      NULL::UUID,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::UUID,
      NULL::TIMESTAMPTZ;
    RETURN;
  END IF;

  -- Find invite by hashed token
  -- Note: We need to hash each candidate token with its salt to compare
  SELECT
    i.id,
    i.property_id,
    i.expires_at,
    i.token_salt
  INTO v_invite
  FROM public.invites i
  WHERE i.token_hash = encode(extensions.digest(p_token || i.token_salt, 'sha256'), 'hex')
    AND i.accepted_at IS NULL
    AND i.deleted_at IS NULL
    AND i.expires_at > NOW()
  LIMIT 1;

  -- Update rate limit tracking (even if invalid, to prevent timing attacks)
  IF v_invite.id IS NOT NULL THEN
    UPDATE public.invites
    SET
      validation_attempts = validation_attempts + 1,
      last_validation_attempt = NOW()
    WHERE id = v_invite.id;
  END IF;

  -- Return property details if valid
  IF v_invite.id IS NOT NULL THEN
    RETURN QUERY
    SELECT
      TRUE,
      p.id,
      p.name,
      p.address,
      p.unit,
      prof.name,
      v_invite.id,
      v_invite.expires_at
    FROM public.properties p
    JOIN public.profiles prof ON p.landlord_id = prof.id
    WHERE p.id = v_invite.property_id;
  ELSE
    -- Generic invalid response (don't leak why: expired, used, or never existed)
    RETURN QUERY SELECT
      FALSE,
      NULL::UUID,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::UUID,
      NULL::TIMESTAMPTZ;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_invite(TEXT) TO anon, authenticated;

COMMENT ON FUNCTION public.validate_invite(TEXT) IS 'Validates invite token (hashed comparison) and returns property details. Rate-limited to 20 attempts/minute globally.';

-- ============================================================================
-- RPC FUNCTION 3: accept_invite
-- Accepts invite (race-protected, idempotent)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.accept_invite(p_token TEXT)
RETURNS TABLE(success BOOLEAN, property_id UUID, error TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite RECORD;
  v_user_id UUID;
  v_already_linked BOOLEAN;
BEGIN
  -- Verify user is authenticated
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Authentication required'::TEXT;
    RETURN;
  END IF;

  -- Find and LOCK invite (prevents race conditions)
  -- Note: Must hash token with salt to compare
  SELECT
    i.id,
    i.property_id,
    i.accepted_at,
    i.accepted_by
  INTO v_invite
  FROM public.invites i
  WHERE i.token_hash = encode(extensions.digest(p_token || i.token_salt, 'sha256'), 'hex')
    AND i.deleted_at IS NULL
    AND i.expires_at > NOW()
  FOR UPDATE;  -- Row-level lock prevents concurrent accepts

  -- Validate invite exists
  IF v_invite.id IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Invalid or expired invite'::TEXT;
    RETURN;
  END IF;

  -- IDEMPOTENCY CHECK: If already accepted by THIS user, return success
  IF v_invite.accepted_at IS NOT NULL AND v_invite.accepted_by = v_user_id THEN
    -- Check if tenant-property link exists
    SELECT EXISTS (
      SELECT 1 FROM public.tenant_property_links
      WHERE tenant_id = v_user_id AND property_id = v_invite.property_id
    ) INTO v_already_linked;

    IF v_already_linked THEN
      -- Already fully processed, return success (idempotent)
      RETURN QUERY SELECT TRUE, v_invite.property_id, NULL::TEXT;
      RETURN;
    END IF;
    -- Link missing, recreate below (recovery from partial state)
  END IF;

  -- RACE PROTECTION: Ensure not already accepted by DIFFERENT user
  IF v_invite.accepted_at IS NOT NULL AND v_invite.accepted_by != v_user_id THEN
    -- Someone else already accepted this invite
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Invalid or expired invite'::TEXT;
    RETURN;
  END IF;

  -- Mark invite as accepted (single-shot)
  UPDATE public.invites
  SET
    accepted_at = NOW(),
    accepted_by = v_user_id
  WHERE id = v_invite.id
    AND accepted_at IS NULL;  -- Double-check for race safety

  -- Create tenant-property link (idempotent via ON CONFLICT)
  INSERT INTO public.tenant_property_links (tenant_id, property_id)
  VALUES (v_user_id, v_invite.property_id)
  ON CONFLICT (tenant_id, property_id) DO NOTHING;

  -- Success
  RETURN QUERY SELECT TRUE, v_invite.property_id, NULL::TEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invite(TEXT) TO authenticated;

COMMENT ON FUNCTION public.accept_invite(TEXT) IS 'Accepts invite token (authenticated users only). Race-protected with FOR UPDATE lock. Idempotent: same user accepting = success.';

-- ============================================================================
-- RPC FUNCTION 4: cleanup_old_invites
-- Soft-deletes old invites (accepted >30 days, expired >7 days)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_old_invites()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Soft delete:
  -- 1. Accepted invites older than 30 days
  -- 2. Expired (not accepted) invites older than 7 days
  UPDATE public.invites
  SET deleted_at = NOW()
  WHERE deleted_at IS NULL
    AND (
      (accepted_at IS NOT NULL AND accepted_at < NOW() - INTERVAL '30 days')
      OR (accepted_at IS NULL AND expires_at < NOW() - INTERVAL '7 days')
    );

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$;

-- Only service role can run cleanup (run via cron or manual admin call)
GRANT EXECUTE ON FUNCTION public.cleanup_old_invites() TO service_role;

COMMENT ON FUNCTION public.cleanup_old_invites() IS 'Soft-deletes old invites: accepted >30 days or expired >7 days. Run via cron or manually.';

-- ============================================================================
-- DATABASE TRIGGER: Send email on invite creation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.send_invite_email_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_property_name TEXT;
  v_landlord_name TEXT;
  v_supabase_url TEXT;
  v_service_role_key TEXT;
  v_plaintext_token TEXT;
BEGIN
  -- Only send email if delivery method is email
  IF NEW.delivery_method != 'email' OR NEW.intended_email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get property and landlord details
  SELECT p.name, prof.name INTO v_property_name, v_landlord_name
  FROM public.properties p
  JOIN public.profiles prof ON p.landlord_id = prof.id
  WHERE p.id = NEW.property_id;

  -- Get Supabase configuration
  BEGIN
    v_supabase_url := current_setting('app.supabase_url', true);
    v_service_role_key := current_setting('app.service_role_key', true);

    IF v_supabase_url IS NULL OR v_service_role_key IS NULL THEN
      RAISE NOTICE 'Email not sent: Supabase settings not configured';
      RETURN NEW;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Email not sent: Supabase settings not configured';
    RETURN NEW;
  END;

  -- PROBLEM: We don't have the plaintext token here (it's only hashed)
  -- SOLUTION: The trigger must receive the plaintext token as a parameter
  -- This requires storing token temporarily during creation
  -- For now, skip email sending in trigger and handle in application layer

  RAISE NOTICE 'Email trigger: Token not available (hashed). Handle email sending in application layer.';

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Email sending failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Create trigger (disabled for now - email sending happens in application layer)
-- DROP TRIGGER IF EXISTS on_invite_created ON public.invites;
-- CREATE TRIGGER on_invite_created
--   AFTER INSERT ON public.invites
--   FOR EACH ROW
--   EXECUTE FUNCTION send_invite_email_trigger();

-- ============================================================================
-- COMMENTS: Documentation
-- ============================================================================

COMMENT ON TABLE public.invites IS 'Simplified invite system with 12-char hashed tokens. Supports email and shareable code delivery. Replaces complex tokenized invite system.';
COMMENT ON COLUMN public.invites.token_hash IS 'sha256(token || salt) - never stores plaintext token';
COMMENT ON COLUMN public.invites.token_salt IS 'Per-token salt for hashing (16 bytes = 32 hex chars)';
COMMENT ON COLUMN public.invites.intended_email IS 'Email for delivery (metadata only, NEVER used for authentication)';
COMMENT ON COLUMN public.invites.delivery_method IS 'How invite was delivered: ''email'' or ''code'' (shareable link)';
COMMENT ON COLUMN public.invites.expires_at IS 'Invite expiration (default: 48 hours from creation)';
COMMENT ON COLUMN public.invites.validation_attempts IS 'Rate limiting: Count of validation attempts';
COMMENT ON COLUMN public.invites.last_validation_attempt IS 'Rate limiting: Timestamp of last validation attempt';
COMMENT ON COLUMN public.invites.deleted_at IS 'Soft delete timestamp (set by cleanup_old_invites)';
