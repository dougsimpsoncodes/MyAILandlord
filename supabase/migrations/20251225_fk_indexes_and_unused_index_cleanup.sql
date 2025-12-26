-- Purpose: Address Supabase linter INFO findings
-- - Add covering indexes for foreign keys (0001_unindexed_foreign_keys)
-- - Drop known unused indexes (0005_unused_index)

BEGIN;

-- =============================
-- Covering indexes for invites
-- =============================
CREATE INDEX IF NOT EXISTS idx_invites_property_id ON public.invites(property_id);
CREATE INDEX IF NOT EXISTS idx_invites_created_by ON public.invites(created_by);
CREATE INDEX IF NOT EXISTS idx_invites_accepted_by ON public.invites(accepted_by);

-- =============================
-- Covering index for messages
-- =============================
CREATE INDEX IF NOT EXISTS idx_messages_property_id ON public.messages(property_id);

-- ==============================================
-- Covering indexes for tenant_property_links FKs
-- ==============================================
-- Some columns may be optional; only create if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenant_property_links' AND column_name = 'invited_by'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_tpl_invited_by ON public.tenant_property_links(invited_by)';
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenant_property_links' AND column_name = 'landlord_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_tpl_landlord_id ON public.tenant_property_links(landlord_id)';
  END IF;
END $$;

-- =============================
-- Drop unused/duplicate indexes
-- =============================
-- Invites
DROP INDEX IF EXISTS public.idx_invites_cleanup;
DROP INDEX IF EXISTS public.idx_invites_rate_limit;
DROP INDEX IF EXISTS public.idx_invites_token_hash;

-- Property assets
DROP INDEX IF EXISTS public.idx_property_assets_condition;
DROP INDEX IF EXISTS public.idx_property_assets_warranty_end;

-- Properties
DROP INDEX IF EXISTS public.idx_properties_code;

-- Tenant property links (legacy names)
DROP INDEX IF EXISTS public.idx_tenant_property_links_tenant_id;
DROP INDEX IF EXISTS public.idx_tenant_property_links_active;

-- Maintenance + rate limits
DROP INDEX IF EXISTS public.idx_maintenance_requests_status;
DROP INDEX IF EXISTS public.idx_rate_limits_updated;

COMMIT;

