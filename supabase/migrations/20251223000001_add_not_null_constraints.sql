-- Add NOT NULL Constraints to User Tracking Columns
-- Date: 2025-12-23
-- Purpose: Enforce user_id/created_by population after backfill verification
-- Prerequisite: All existing rows have non-NULL values (verified)

BEGIN;

-- ============================================================
-- STEP 1: Add NOT NULL Constraints
-- ============================================================

-- Properties table: user_id must be non-NULL
ALTER TABLE public.properties
  ALTER COLUMN user_id SET NOT NULL;

-- Invite tokens table: created_by must be non-NULL
ALTER TABLE public.invite_tokens
  ALTER COLUMN created_by SET NOT NULL;

-- Device tokens table: user_id must be non-NULL
-- Note: This table may be empty, but constraint still applies
ALTER TABLE public.device_tokens
  ALTER COLUMN user_id SET NOT NULL;

-- ============================================================
-- STEP 2: Verification
-- ============================================================

DO $$
BEGIN
  -- Verify properties.user_id is NOT NULL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'properties'
      AND column_name = 'user_id'
      AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'properties.user_id NOT NULL constraint not set';
  END IF;

  -- Verify invite_tokens.created_by is NOT NULL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invite_tokens'
      AND column_name = 'created_by'
      AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'invite_tokens.created_by NOT NULL constraint not set';
  END IF;

  -- Verify device_tokens.user_id is NOT NULL
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'device_tokens'
      AND column_name = 'user_id'
      AND is_nullable = 'NO'
  ) THEN
    RAISE EXCEPTION 'device_tokens.user_id NOT NULL constraint not set';
  END IF;

  RAISE NOTICE 'All NOT NULL constraints successfully applied';
END
$$;

COMMIT;

-- ============================================================
-- NOTES
-- ============================================================

-- 1. Combined with DEFAULT auth.uid(), this fully enforces server-side user tracking
-- 2. Client cannot create records without authenticated session
-- 3. NULL values rejected at database level (defense in depth)
