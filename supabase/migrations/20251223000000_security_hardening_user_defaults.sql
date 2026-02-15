-- Security Hardening: Add DEFAULT auth.uid() to User Tracking Columns
-- Date: 2025-12-23
-- Purpose: Prevent client from spoofing user IDs by setting defaults server-side
-- Rationale: Server-side defaults eliminate timing dependencies and prevent ID spoofing

BEGIN;

-- ============================================================
-- STEP 1: Add DEFAULT auth.uid() to User Tracking Columns
-- ============================================================

-- Properties table: user_id should default to current authenticated user
ALTER TABLE public.properties
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Invite tokens table: created_by should default to current authenticated user
ALTER TABLE public.invite_tokens
  ALTER COLUMN created_by SET DEFAULT auth.uid();

-- Device tokens table: user_id should default to current authenticated user
ALTER TABLE public.device_tokens
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- ============================================================
-- STEP 2: Verify RLS Policies Use auth.uid() Exclusively
-- ============================================================

-- Properties: Ensure all policies use auth.uid()
-- SELECT (read): Users can read their own properties
DROP POLICY IF EXISTS "Users can read own properties" ON public.properties;
CREATE POLICY "Users can read own properties"
  ON public.properties
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT (create): Users can create properties (user_id auto-set by DEFAULT)
DROP POLICY IF EXISTS "Users can insert own properties" ON public.properties;
CREATE POLICY "Users can insert own properties"
  ON public.properties
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE (edit): Users can update their own properties
DROP POLICY IF EXISTS "Users can update own properties" ON public.properties;
CREATE POLICY "Users can update own properties"
  ON public.properties
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE (remove): Users can delete their own properties (symmetric with INSERT)
DROP POLICY IF EXISTS "Users can delete own properties" ON public.properties;
CREATE POLICY "Users can delete own properties"
  ON public.properties
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- STEP 3: Invite Tokens RLS - Ensure Symmetry
-- ============================================================

-- SELECT: Users can read tokens they created
DROP POLICY IF EXISTS "Users can read own invite tokens" ON public.invite_tokens;
CREATE POLICY "Users can read own invite tokens"
  ON public.invite_tokens
  FOR SELECT
  USING (created_by = auth.uid());

-- INSERT: Already handled by RPC function (SECURITY DEFINER)
-- We keep the existing policy but note it's primarily used by the RPC
DROP POLICY IF EXISTS "Users can create invite tokens" ON public.invite_tokens;
CREATE POLICY "Users can create invite tokens"
  ON public.invite_tokens
  FOR INSERT
  WITH CHECK (created_by = auth.uid());

-- UPDATE: Users can update tokens they created (for revocation)
DROP POLICY IF EXISTS "Users can update own invite tokens" ON public.invite_tokens;
CREATE POLICY "Users can update own invite tokens"
  ON public.invite_tokens
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- DELETE: Users can delete tokens they created (symmetric with INSERT)
DROP POLICY IF EXISTS "Users can delete own invite tokens" ON public.invite_tokens;
CREATE POLICY "Users can delete own invite tokens"
  ON public.invite_tokens
  FOR DELETE
  USING (created_by = auth.uid());

-- ============================================================
-- STEP 4: Device Tokens RLS - Ensure Symmetry
-- ============================================================

-- SELECT: Users can read their own device tokens
DROP POLICY IF EXISTS "Users can read own device tokens" ON public.device_tokens;
CREATE POLICY "Users can read own device tokens"
  ON public.device_tokens
  FOR SELECT
  USING (user_id = auth.uid());

-- INSERT: Users can create device tokens (user_id auto-set by DEFAULT)
DROP POLICY IF EXISTS "Users can insert own device tokens" ON public.device_tokens;
CREATE POLICY "Users can insert own device tokens"
  ON public.device_tokens
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- UPDATE: Users can update their own device tokens
DROP POLICY IF EXISTS "Users can update own device tokens" ON public.device_tokens;
CREATE POLICY "Users can update own device tokens"
  ON public.device_tokens
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- DELETE: Users can delete their own device tokens (symmetric with INSERT)
DROP POLICY IF EXISTS "Users can delete own device tokens" ON public.device_tokens;
CREATE POLICY "Users can delete own device tokens"
  ON public.device_tokens
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================================
-- STEP 5: Verification Queries (For Manual Testing)
-- ============================================================

-- Verify defaults are set
DO $$
BEGIN
  -- Check properties.user_id has default
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'properties'
      AND column_name = 'user_id'
      AND column_default LIKE '%auth.uid()%'
  ) THEN
    RAISE WARNING 'properties.user_id DEFAULT not set correctly';
  END IF;

  -- Check invite_tokens.created_by has default
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invite_tokens'
      AND column_name = 'created_by'
      AND column_default LIKE '%auth.uid()%'
  ) THEN
    RAISE WARNING 'invite_tokens.created_by DEFAULT not set correctly';
  END IF;

  -- Check device_tokens.user_id has default
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'device_tokens'
      AND column_name = 'user_id'
      AND column_default LIKE '%auth.uid()%'
  ) THEN
    RAISE WARNING 'device_tokens.user_id DEFAULT not set correctly';
  END IF;

  RAISE NOTICE 'Security hardening migration completed successfully';
END
$$;

COMMIT;

-- ============================================================
-- NOTES
-- ============================================================

-- 1. DEFAULT auth.uid() eliminates client dependency on passing user IDs
-- 2. RLS policies enforce auth.uid() for all operations (CRUD symmetry)
-- 3. DELETE permissions now mirror INSERT permissions (security parity)
-- 4. SECURITY DEFINER functions (like generate_invite_token) bypass RLS but still use auth.uid()
-- 5. This prevents timing issues where user context might be undefined on client
-- 6. Spoofing prevention: Client cannot pass arbitrary user_id values
