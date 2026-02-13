-- Fix properties RLS policy to allow tenants to read properties they're linked to
--
-- PROBLEM: Current policy only allows property owners (user_id = auth.uid()) to read properties.
-- When tenants query tenant_property_links with nested properties relation, RLS blocks it.
--
-- SOLUTION: Allow SELECT if user is either:
--   1. The property owner (user_id = auth.uid()), OR
--   2. A tenant linked to the property (EXISTS in tenant_property_links)

BEGIN;

-- Drop existing SELECT policy
DROP POLICY IF EXISTS properties_select_own ON public.properties;

-- Create new SELECT policy that allows both owners and linked tenants
CREATE POLICY properties_select_own_or_linked
  ON public.properties
  FOR SELECT
  TO public
  USING (
    -- Owner can read their own properties
    user_id = auth_uid_compat()
    OR
    -- Tenants can read properties they're linked to
    EXISTS (
      SELECT 1
      FROM public.tenant_property_links tpl
      WHERE tpl.property_id = properties.id
        AND tpl.tenant_id = auth_uid_compat()
        AND tpl.is_active = true
    )
  );

COMMIT;
