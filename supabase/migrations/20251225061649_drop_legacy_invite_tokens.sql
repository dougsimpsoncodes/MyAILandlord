-- Drop legacy tokenized invites system (invite_tokens + legacy RPCs)
-- Keep the newer simple invites system (public.invites + create_invite/validate_invite/accept_invite)
-- Review before running in production.

BEGIN;

-- Drop legacy RPCs if they exist (signatures may vary; include common forms)
DROP FUNCTION IF EXISTS public.generate_invite_token(uuid, integer, integer);
DROP FUNCTION IF EXISTS public.generate_invite_token(uuid, int4, int4);
DROP FUNCTION IF EXISTS public.validate_invite_token(text);
DROP FUNCTION IF EXISTS public.accept_invite_token(text, uuid);

-- Drop legacy table (and dependent objects) if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invite_tokens') THEN
    EXECUTE 'DROP TABLE public.invite_tokens CASCADE';
  END IF;
END
$$;

COMMIT;

-- Notes:
-- - This migration removes the Dec 21 tokenized invites system.
-- - The Dec 24 simple invites system remains (public.invites + create_invite/validate_invite/accept_invite).
-- - Ensure no remaining application code references the legacy RPCs before applying.
