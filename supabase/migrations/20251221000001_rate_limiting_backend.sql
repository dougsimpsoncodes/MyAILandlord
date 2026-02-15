-- Rate Limiting Backend (Postgres-based)
-- Replaces in-memory Map with persistent rate limit tracking

-- ============================================================
-- Rate Limit Table
-- ============================================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Composite key for rate limiting
  limiter_key TEXT NOT NULL, -- e.g., 'accept-invite-token:192.168.1.1'

  -- Token bucket algorithm fields
  tokens INTEGER NOT NULL DEFAULT 30, -- Current token count
  last_refill TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Configuration (can vary per endpoint)
  max_tokens INTEGER NOT NULL DEFAULT 30,
  refill_rate INTEGER NOT NULL DEFAULT 30, -- tokens per window
  window_seconds INTEGER NOT NULL DEFAULT 60,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique index on limiter_key for fast lookup
CREATE UNIQUE INDEX idx_rate_limits_key ON public.rate_limits(limiter_key);

-- Index for cleanup (remove stale entries)
CREATE INDEX idx_rate_limits_updated ON public.rate_limits(updated_at);

-- ============================================================
-- Rate Limit Check Function (Atomic)
-- ============================================================

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_limiter_key TEXT,
  p_max_tokens INTEGER DEFAULT 30,
  p_refill_rate INTEGER DEFAULT 30,
  p_window_seconds INTEGER DEFAULT 60
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record RECORD;
  v_now TIMESTAMPTZ := NOW();
  v_elapsed_seconds NUMERIC;
  v_tokens_to_add INTEGER;
  v_new_token_count INTEGER;
  v_allowed BOOLEAN;
BEGIN
  -- Try to get existing rate limit record
  -- Use SELECT FOR UPDATE to prevent concurrent modification
  SELECT *
  INTO v_record
  FROM public.rate_limits
  WHERE limiter_key = p_limiter_key
  FOR UPDATE;

  IF NOT FOUND THEN
    -- First request - create entry with one token consumed
    INSERT INTO public.rate_limits (
      limiter_key,
      tokens,
      last_refill,
      max_tokens,
      refill_rate,
      window_seconds
    ) VALUES (
      p_limiter_key,
      p_max_tokens - 1, -- Consume one token
      v_now,
      p_max_tokens,
      p_refill_rate,
      p_window_seconds
    );

    RETURN json_build_object(
      'allowed', true,
      'remaining', p_max_tokens - 1,
      'reset_at', v_now + (p_window_seconds || ' seconds')::INTERVAL
    );
  END IF;

  -- Calculate elapsed time since last refill
  v_elapsed_seconds := EXTRACT(EPOCH FROM (v_now - v_record.last_refill));

  -- Calculate tokens to add based on refill rate
  v_tokens_to_add := FLOOR((v_elapsed_seconds / p_window_seconds) * p_refill_rate)::INTEGER;

  -- Calculate new token count (capped at max_tokens)
  v_new_token_count := LEAST(v_record.tokens + v_tokens_to_add, p_max_tokens);

  -- Check if request is allowed
  v_allowed := v_new_token_count > 0;

  IF v_allowed THEN
    -- Consume one token
    v_new_token_count := v_new_token_count - 1;

    -- Update record
    UPDATE public.rate_limits
    SET
      tokens = v_new_token_count,
      last_refill = CASE
        WHEN v_tokens_to_add > 0 THEN v_now
        ELSE last_refill
      END,
      updated_at = v_now
    WHERE limiter_key = p_limiter_key;

    RETURN json_build_object(
      'allowed', true,
      'remaining', v_new_token_count,
      'reset_at', v_now + (p_window_seconds || ' seconds')::INTERVAL
    );
  ELSE
    -- Rate limit exceeded
    RETURN json_build_object(
      'allowed', false,
      'remaining', 0,
      'reset_at', v_record.last_refill + (p_window_seconds || ' seconds')::INTERVAL,
      'retry_after_seconds', CEIL(p_window_seconds - v_elapsed_seconds)
    );
  END IF;
END;
$$;

-- Grant execute to service role only (called from Edge Functions)
REVOKE ALL ON FUNCTION public.check_rate_limit FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_rate_limit TO service_role;

-- ============================================================
-- Cleanup Function (Remove Stale Entries)
-- ============================================================

CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Delete entries not updated in 24 hours (stale)
  DELETE FROM public.rate_limits
  WHERE updated_at < NOW() - INTERVAL '24 hours';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN json_build_object(
    'deleted_count', v_deleted_count,
    'cleaned_at', NOW()
  );
END;
$$;

-- Schedule cleanup job (run daily at 4 AM UTC) when pg_cron is available
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'cron') THEN
    BEGIN
      PERFORM cron.schedule(
        'cleanup-rate-limits',
        '0 4 * * *',
        $job$SELECT public.cleanup_rate_limits();$job$
      );
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE NOTICE 'Skipping cron.schedule for cleanup_rate_limits: insufficient privilege';
    END;
  ELSE
    RAISE NOTICE 'Skipping cron.schedule for cleanup_rate_limits: cron schema not available';
  END IF;
END
$$;

-- ============================================================
-- Comments
-- ============================================================

COMMENT ON TABLE public.rate_limits IS 'Persistent rate limiting using token bucket algorithm';
COMMENT ON FUNCTION public.check_rate_limit IS 'Atomic rate limit check with token bucket refill (service role only)';
COMMENT ON FUNCTION public.cleanup_rate_limits IS 'Remove stale rate limit entries (>24 hours old)';
