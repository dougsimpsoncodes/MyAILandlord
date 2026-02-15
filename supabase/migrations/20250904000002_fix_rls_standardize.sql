-- Follow-up migration for RLS standardization.
-- The canonical policy rebuild is applied in 20250904000000_consolidate_rls.sql.
-- Keep this migration lightweight and idempotent to avoid policy churn.

-- Ensure invite preview view exists and is publicly readable.
DROP VIEW IF EXISTS public.property_invite_info;
CREATE OR REPLACE VIEW public.property_invite_info AS
SELECT id, name, address, property_type, created_at
FROM public.properties;

GRANT SELECT ON public.property_invite_info TO anon;
GRANT SELECT ON public.property_invite_info TO authenticated;
