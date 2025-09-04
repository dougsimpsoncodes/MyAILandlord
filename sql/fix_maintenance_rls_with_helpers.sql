-- Drops and recreates maintenance_requests policies using helper functions based on auth.jwt().
-- Requires sql/maintenance_rls_helpers.sql to be applied first.

DROP POLICY IF EXISTS "maintenance_read_access" ON public.maintenance_requests;
DROP POLICY IF EXISTS "maintenance_create_access" ON public.maintenance_requests;
DROP POLICY IF EXISTS "maintenance_update_access" ON public.maintenance_requests;
DROP POLICY IF EXISTS "maintenance_delete_access" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Users can read maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Tenants can create maintenance requests" ON public.maintenance_requests;
DROP POLICY IF EXISTS "Users can update maintenance requests" ON public.maintenance_requests;

-- Read: tenants read own; landlords read requests for their properties
CREATE POLICY "maintenance_read_access" ON public.maintenance_requests
  FOR SELECT TO authenticated
  USING (
    public.is_tenant_self(tenant_id) OR public.is_landlord_for_property(property_id)
  );

-- Create: tenant creates only for properties they are actively linked to
CREATE POLICY "maintenance_create_access" ON public.maintenance_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_tenant_self(tenant_id) AND public.tenant_has_active_link(property_id)
  );

-- Update: same actors as read
CREATE POLICY "maintenance_update_access" ON public.maintenance_requests
  FOR UPDATE TO authenticated
  USING (
    public.is_tenant_self(tenant_id) OR public.is_landlord_for_property(property_id)
  )
  WITH CHECK (
    public.is_tenant_self(tenant_id) OR public.is_landlord_for_property(property_id)
  );

-- Delete: landlords for their properties
CREATE POLICY "maintenance_delete_access" ON public.maintenance_requests
  FOR DELETE TO authenticated
  USING (
    public.is_landlord_for_property(property_id)
  );

