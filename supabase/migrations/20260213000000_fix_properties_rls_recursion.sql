-- Fix infinite recursion in properties SELECT RLS policy.
--
-- Root cause:
-- - properties SELECT policy checks tenant links
-- - tenant_property_links policies check properties
-- This creates a recursive policy evaluation loop on properties (seen during INSERT ... RETURNING).
--
-- Approach:
-- - Use a SECURITY DEFINER helper that checks tenant links without re-entering properties RLS.
-- - Recreate a single non-recursive properties SELECT policy.

BEGIN;

CREATE OR REPLACE FUNCTION public.can_read_property_as_linked_tenant(p_property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tenant_property_links tpl
    WHERE tpl.property_id = p_property_id
      AND tpl.tenant_id = auth.uid()
      AND tpl.is_active = true
  );
$$;

REVOKE ALL ON FUNCTION public.can_read_property_as_linked_tenant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_read_property_as_linked_tenant(uuid) TO authenticated;

-- Remove all legacy properties SELECT policies that may coexist.
DROP POLICY IF EXISTS properties_select_own_or_linked ON public.properties;
DROP POLICY IF EXISTS properties_select ON public.properties;
DROP POLICY IF EXISTS properties_select_own ON public.properties;
DROP POLICY IF EXISTS "Users can read own properties" ON public.properties;
DROP POLICY IF EXISTS "Users can read properties" ON public.properties;
DROP POLICY IF EXISTS "Users can view their own properties" ON public.properties;

CREATE POLICY properties_select_own_or_linked
  ON public.properties
  FOR SELECT
  TO authenticated
  USING (
    COALESCE(user_id, landlord_id) = auth.uid()
    OR public.can_read_property_as_linked_tenant(id)
  );

COMMIT;
