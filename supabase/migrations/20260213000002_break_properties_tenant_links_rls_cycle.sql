-- Break RLS recursion cycle between properties and tenant_property_links.
--
-- Prior policies referenced each other via subqueries, which can recurse during
-- INSERT ... RETURNING on properties.

BEGIN;

-- Drop all existing policies on both tables to ensure no hidden recursive legacy policy remains.
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'properties'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.properties', pol.policyname);
  END LOOP;

  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'tenant_property_links'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.tenant_property_links', pol.policyname);
  END LOOP;
END $$;

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_property_links ENABLE ROW LEVEL SECURITY;

-- PROPERTIES
CREATE POLICY properties_select_own_or_linked
  ON public.properties
  FOR SELECT
  TO authenticated
  USING (
    COALESCE(user_id, landlord_id) = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.tenant_property_links tpl
      WHERE tpl.property_id = properties.id
        AND tpl.tenant_id = auth.uid()
        AND tpl.is_active = true
    )
  );

CREATE POLICY properties_insert_owner_landlord
  ON public.properties
  FOR INSERT
  TO authenticated
  WITH CHECK (
    COALESCE(user_id, landlord_id) = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'landlord'
    )
  );

CREATE POLICY properties_update_owner
  ON public.properties
  FOR UPDATE
  TO authenticated
  USING (COALESCE(user_id, landlord_id) = auth.uid())
  WITH CHECK (COALESCE(user_id, landlord_id) = auth.uid());

CREATE POLICY properties_delete_owner
  ON public.properties
  FOR DELETE
  TO authenticated
  USING (COALESCE(user_id, landlord_id) = auth.uid());

-- TENANT_PROPERTY_LINKS
-- Important: no subquery back to properties (prevents cycle).
CREATE POLICY tpl_select_self_or_landlord
  ON public.tenant_property_links
  FOR SELECT
  TO authenticated
  USING (
    tenant_id = auth.uid()
    OR landlord_id = auth.uid()
  );

CREATE POLICY tpl_insert_self_or_landlord
  ON public.tenant_property_links
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = auth.uid()
    OR landlord_id = auth.uid()
  );

CREATE POLICY tpl_update_landlord_only
  ON public.tenant_property_links
  FOR UPDATE
  TO authenticated
  USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());

CREATE POLICY tpl_delete_landlord_only
  ON public.tenant_property_links
  FOR DELETE
  TO authenticated
  USING (landlord_id = auth.uid());

COMMIT;
