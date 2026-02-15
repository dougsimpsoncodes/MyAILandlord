-- Drop legacy v1 invite constraint that conflicts with v2 schema
--
-- Root cause: 20251224000000 (v1) created the invites table with:
--   CONSTRAINT invite_delivery_method CHECK ((invite_code IS NOT NULL) OR (email IS NOT NULL))
--
-- Then 20251224000001 (v2) redesigned the schema to use token_hash/token_salt/intended_email
-- instead of invite_code/email. But CREATE TABLE IF NOT EXISTS was a no-op (table existed),
-- so v2 only added columns. The v1 constraint was never dropped, causing:
--   "new row for relation invites violates check constraint invite_delivery_method"
-- on every INSERT because v2's create_invite never sets invite_code or email.

-- Drop the incompatible v1 constraint
ALTER TABLE public.invites DROP CONSTRAINT IF EXISTS invite_delivery_method;

-- Also drop the v1 trigger that references columns no longer used
-- (it already does nothing — the v2 replacement just logs a NOTICE)
DROP TRIGGER IF EXISTS on_invite_created ON public.invites;
