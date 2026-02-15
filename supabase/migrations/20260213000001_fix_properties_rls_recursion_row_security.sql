-- Harden recursion fix: force helper execution outside RLS to avoid policy cycles.

BEGIN;

CREATE OR REPLACE FUNCTION public.can_read_property_as_linked_tenant(p_property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
SET row_security = off
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

DROP POLICY IF EXISTS properties_select_own_or_linked ON public.properties;

CREATE POLICY properties_select_own_or_linked
  ON public.properties
  FOR SELECT
  TO authenticated
  USING (
    COALESCE(user_id, landlord_id) = auth.uid()
    OR public.can_read_property_as_linked_tenant(id)
  );

COMMIT;
