-- Simplified Invite System Migration
-- Replaces complex tokenized invite system with simple, email-based approach
--
-- Features:
-- - Single table for both email and code invites
-- - 48-hour expiration (only security feature)
-- - 3 simple RPC functions
-- - Auto-cleanup after 30 days
-- - Database trigger for automated emails

-- ============================================================================
-- TABLE: invites
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core relationships
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),

  -- Invite delivery (both methods supported)
  invite_code TEXT UNIQUE,  -- 6-char code (optional, for shareable invites)
  email TEXT,               -- Email address (optional, for email invites)

  -- Lifecycle timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '48 hours',
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users(id),
  deleted_at TIMESTAMPTZ,  -- Soft delete after 30 days

  -- Constraints
  CONSTRAINT invite_delivery_method CHECK (
    (invite_code IS NOT NULL) OR (email IS NOT NULL)
  )
);

-- ============================================================================
-- INDEXES: Fast lookup for active invites only
-- ============================================================================

-- Index for code-based invite lookups (constant-time)
CREATE INDEX IF NOT EXISTS idx_invites_code ON public.invites(invite_code)
  WHERE invite_code IS NOT NULL
    AND accepted_at IS NULL
    AND deleted_at IS NULL
    AND expires_at > NOW();

-- Index for email-based invite lookups
CREATE INDEX IF NOT EXISTS idx_invites_email ON public.invites(email)
  WHERE email IS NOT NULL
    AND accepted_at IS NULL
    AND deleted_at IS NULL
    AND expires_at > NOW();

-- Index for cleanup queries (find old accepted invites)
CREATE INDEX IF NOT EXISTS idx_invites_cleanup ON public.invites(accepted_at)
  WHERE accepted_at IS NOT NULL AND deleted_at IS NULL;

-- ============================================================================
-- RLS POLICIES: Landlords manage their own invites
-- ============================================================================

ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

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

-- Landlords can update (revoke) their own invites
CREATE POLICY landlords_update_own_invites ON public.invites
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- ============================================================================
-- RPC FUNCTION 1: create_invite
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_invite(
  p_property_id UUID,
  p_delivery_method TEXT,  -- 'code' or 'email'
  p_email TEXT DEFAULT NULL
)
RETURNS TABLE(invite_code TEXT, invite_id UUID, expires_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code TEXT := NULL;
  v_invite_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- Verify landlord owns property
  IF NOT EXISTS (
    SELECT 1 FROM public.properties
    WHERE id = p_property_id AND landlord_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Property not found or not owned by user';
  END IF;

  -- Validate delivery method
  IF p_delivery_method NOT IN ('code', 'email') THEN
    RAISE EXCEPTION 'Invalid delivery method. Must be ''code'' or ''email''';
  END IF;

  -- Email required for email method
  IF p_delivery_method = 'email' AND p_email IS NULL THEN
    RAISE EXCEPTION 'Email address required for email delivery method';
  END IF;

  -- Generate 6-character code if needed
  IF p_delivery_method = 'code' THEN
    -- Generate cryptographically secure random code
    -- Use base64 encoding and strip non-alphanumeric chars
    v_code := upper(substring(
      regexp_replace(
        encode(extensions.gen_random_bytes(5), 'base64'),
        '[^A-Za-z0-9]', '', 'g'
      ) from 1 for 6
    ));

    -- Ensure exactly 6 characters (regenerate if needed)
    WHILE length(v_code) < 6 LOOP
      v_code := v_code || upper(substring(
        regexp_replace(
          encode(extensions.gen_random_bytes(3), 'base64'),
          '[^A-Za-z0-9]', '', 'g'
        ) from 1 for 1
      ));
    END LOOP;

    v_code := substring(v_code from 1 for 6);
  END IF;

  -- Calculate expiration (48 hours from now)
  v_expires_at := NOW() + INTERVAL '48 hours';

  -- Insert invite
  INSERT INTO public.invites (property_id, created_by, invite_code, email, expires_at)
  VALUES (p_property_id, auth.uid(), v_code, p_email, v_expires_at)
  RETURNING id INTO v_invite_id;

  -- Return result
  RETURN QUERY SELECT v_code, v_invite_id, v_expires_at;
END;
$$;

-- Grant execute to authenticated users (landlords)
GRANT EXECUTE ON FUNCTION public.create_invite(UUID, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- RPC FUNCTION 2: validate_invite
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_invite(
  p_code TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL
)
RETURNS TABLE(
  valid BOOLEAN,
  property_id UUID,
  property_name TEXT,
  property_address TEXT,
  property_unit TEXT,
  landlord_name TEXT,
  landlord_id UUID,
  invite_id UUID,
  expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER  -- Bypass RLS to allow public access
SET search_path = public
AS $$
BEGIN
  -- Return property details if invite is valid and not expired
  RETURN QUERY
  SELECT
    TRUE as valid,
    p.id as property_id,
    p.name as property_name,
    p.address as property_address,
    p.unit as property_unit,
    prof.name as landlord_name,
    p.landlord_id as landlord_id,
    i.id as invite_id,
    i.expires_at as expires_at
  FROM public.invites i
  JOIN public.properties p ON i.property_id = p.id
  JOIN public.profiles prof ON p.landlord_id = prof.id
  WHERE
    (i.invite_code = p_code OR i.email = p_email)
    AND i.accepted_at IS NULL
    AND i.deleted_at IS NULL
    AND i.expires_at > NOW()
  LIMIT 1;  -- Only return first match

  -- Return invalid response if no match found
  -- (Don't leak information about why it's invalid)
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT
      FALSE,
      NULL::UUID,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::TEXT,
      NULL::UUID,
      NULL::UUID,
      NULL::TIMESTAMPTZ;
  END IF;
END;
$$;

-- Grant execute to anonymous and authenticated users
GRANT EXECUTE ON FUNCTION public.validate_invite(TEXT, TEXT) TO anon, authenticated;

-- ============================================================================
-- RPC FUNCTION 3: accept_invite
-- ============================================================================

CREATE OR REPLACE FUNCTION public.accept_invite(
  p_code TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, property_id UUID, error TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite_id UUID;
  v_property_id UUID;
  v_current_user_id UUID;
BEGIN
  -- Get current user ID
  v_current_user_id := auth.uid();

  IF v_current_user_id IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'User must be authenticated'::TEXT;
    RETURN;
  END IF;

  -- Find valid invite (with row lock to prevent double-accept)
  SELECT i.id, i.property_id INTO v_invite_id, v_property_id
  FROM public.invites i
  WHERE
    (i.invite_code = p_code OR i.email = p_email)
    AND i.accepted_at IS NULL
    AND i.deleted_at IS NULL
    AND i.expires_at > NOW()
  LIMIT 1
  FOR UPDATE;  -- Lock row to prevent concurrent accepts

  -- Check if invite was found
  IF v_invite_id IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, 'Invalid or expired invite'::TEXT;
    RETURN;
  END IF;

  -- Check if user is already linked to this property
  IF EXISTS (
    SELECT 1 FROM public.tenant_property_links
    WHERE tenant_id = v_current_user_id AND property_id = v_property_id
  ) THEN
    -- Mark invite as accepted anyway (idempotent)
    UPDATE public.invites
    SET accepted_at = NOW(), accepted_by = v_current_user_id
    WHERE id = v_invite_id;

    RETURN QUERY SELECT TRUE, v_property_id, NULL::TEXT;
    RETURN;
  END IF;

  -- Mark invite as accepted
  UPDATE public.invites
  SET accepted_at = NOW(), accepted_by = v_current_user_id
  WHERE id = v_invite_id;

  -- Create tenant-property link
  INSERT INTO public.tenant_property_links (tenant_id, property_id)
  VALUES (v_current_user_id, v_property_id)
  ON CONFLICT (tenant_id, property_id) DO NOTHING;

  -- Return success
  RETURN QUERY SELECT TRUE, v_property_id, NULL::TEXT;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.accept_invite(TEXT, TEXT) TO authenticated;

-- ============================================================================
-- CLEANUP FUNCTION: Delete old accepted invites
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
  -- Soft delete accepted invites older than 30 days
  UPDATE public.invites
  SET deleted_at = NOW()
  WHERE accepted_at IS NOT NULL
    AND accepted_at < NOW() - INTERVAL '30 days'
    AND deleted_at IS NULL;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count;
END;
$$;

-- Grant execute to service role only (run via cron or manual admin call)
GRANT EXECUTE ON FUNCTION public.cleanup_old_invites() TO service_role;

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
  v_invite_url TEXT;
  v_supabase_url TEXT;
  v_service_role_key TEXT;
BEGIN
  -- Only send email if email field is populated
  IF NEW.email IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get property and landlord details
  SELECT p.name, prof.name INTO v_property_name, v_landlord_name
  FROM public.properties p
  JOIN public.profiles prof ON p.landlord_id = prof.id
  WHERE p.id = NEW.property_id;

  -- Build invite URL (email-based)
  v_invite_url := 'https://myailandlord.app/invite?email=' || NEW.email;

  -- Get Supabase URL and service role key from settings
  -- These should be set via: ALTER DATABASE postgres SET app.supabase_url = '...'
  BEGIN
    v_supabase_url := current_setting('app.supabase_url', true);
    v_service_role_key := current_setting('app.service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    -- Settings not configured, skip email sending
    RAISE NOTICE 'Email not sent: Supabase settings not configured';
    RETURN NEW;
  END;

  -- Call Edge Function to send email (async, non-blocking)
  -- Note: Requires pg_net extension or http extension
  -- This will be implemented once send-invite-email Edge Function is deployed
  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/send-invite-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_role_key
    ),
    body := jsonb_build_object(
      'to', NEW.email,
      'property_name', v_property_name,
      'landlord_name', v_landlord_name,
      'invite_url', v_invite_url,
      'expires_at', NEW.expires_at
    )
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't fail invite creation if email sending fails
  RAISE NOTICE 'Email sending failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

-- Create trigger on invite creation
DROP TRIGGER IF EXISTS on_invite_created ON public.invites;
CREATE TRIGGER on_invite_created
  AFTER INSERT ON public.invites
  FOR EACH ROW
  EXECUTE FUNCTION public.send_invite_email_trigger();

-- ============================================================================
-- COMMENTS: Documentation for future reference
-- ============================================================================

COMMENT ON TABLE public.invites IS 'Simplified invite system supporting both email and code-based invites. Replaces complex tokenized invite system.';
COMMENT ON COLUMN public.invites.invite_code IS '6-character alphanumeric code for shareable invites (optional)';
COMMENT ON COLUMN public.invites.email IS 'Email address for email-based invites (optional)';
COMMENT ON COLUMN public.invites.expires_at IS 'Invite expiration time (default: 48 hours from creation)';
COMMENT ON COLUMN public.invites.deleted_at IS 'Soft delete timestamp (set by cleanup_old_invites after 30 days)';

COMMENT ON FUNCTION public.create_invite IS 'Creates a new invite (email or code-based) for a property. Landlords only.';
COMMENT ON FUNCTION public.validate_invite IS 'Validates an invite and returns property details. Public access (no auth required).';
COMMENT ON FUNCTION public.accept_invite IS 'Accepts an invite and links tenant to property. Authenticated users only.';
COMMENT ON FUNCTION public.cleanup_old_invites IS 'Soft-deletes accepted invites older than 30 days. Run via cron or manual admin call.';
