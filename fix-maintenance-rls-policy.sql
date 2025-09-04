-- Fix maintenance_requests RLS policies to properly validate tenant-property relationships

-- Drop the current overly broad policy
DROP POLICY IF EXISTS "maintenance_isolation" ON maintenance_requests;

-- Create separate policies for different operations

-- Tenants and landlords can read maintenance requests they're associated with
CREATE POLICY "maintenance_read_access" ON maintenance_requests
  FOR SELECT TO authenticated
  USING (
    auth.jwt() IS NOT NULL AND auth.jwt() ->> 'sub' IS NOT NULL AND (
      -- Tenants can read their own maintenance requests
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.clerk_user_id = auth.jwt() ->> 'sub'
        AND profiles.id = maintenance_requests.tenant_id
      )
      OR
      -- Landlords can read requests for their properties
      EXISTS (
        SELECT 1 FROM properties p
        JOIN profiles prof ON prof.id = p.landlord_id
        WHERE prof.clerk_user_id = auth.jwt() ->> 'sub'
        AND p.id = maintenance_requests.property_id
      )
    )
  );

-- Tenants can create maintenance requests ONLY for properties they're linked to
CREATE POLICY "maintenance_create_access" ON maintenance_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.jwt() IS NOT NULL AND auth.jwt() ->> 'sub' IS NOT NULL AND
    -- Validate tenant_id matches current user's profile
    tenant_id IN (
      SELECT id FROM profiles 
      WHERE clerk_user_id = auth.jwt() ->> 'sub'
      AND role = 'tenant'
    )
    AND
    -- Validate property_id is in the tenant's active property links
    property_id IN (
      SELECT property_id FROM tenant_property_links tpl
      JOIN profiles p ON p.id = tpl.tenant_id
      WHERE p.clerk_user_id = auth.jwt() ->> 'sub'
      AND tpl.is_active = true
    )
  );

-- Tenants can update their own maintenance requests, landlords can update requests for their properties
CREATE POLICY "maintenance_update_access" ON maintenance_requests
  FOR UPDATE TO authenticated
  USING (
    auth.jwt() IS NOT NULL AND auth.jwt() ->> 'sub' IS NOT NULL AND (
      -- Tenants can update their own requests
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.clerk_user_id = auth.jwt() ->> 'sub'
        AND profiles.id = maintenance_requests.tenant_id
      )
      OR
      -- Landlords can update requests for their properties
      EXISTS (
        SELECT 1 FROM properties p
        JOIN profiles prof ON prof.id = p.landlord_id
        WHERE prof.clerk_user_id = auth.jwt() ->> 'sub'
        AND p.id = maintenance_requests.property_id
      )
    )
  )
  WITH CHECK (
    auth.jwt() IS NOT NULL AND auth.jwt() ->> 'sub' IS NOT NULL AND (
      -- Tenants can update their own requests
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.clerk_user_id = auth.jwt() ->> 'sub'
        AND profiles.id = maintenance_requests.tenant_id
      )
      OR
      -- Landlords can update requests for their properties
      EXISTS (
        SELECT 1 FROM properties p
        JOIN profiles prof ON prof.id = p.landlord_id
        WHERE prof.clerk_user_id = auth.jwt() ->> 'sub'
        AND p.id = maintenance_requests.property_id
      )
    )
  );

-- Landlords can delete maintenance requests for their properties
CREATE POLICY "maintenance_delete_access" ON maintenance_requests
  FOR DELETE TO authenticated
  USING (
    auth.jwt() IS NOT NULL AND auth.jwt() ->> 'sub' IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM properties p
      JOIN profiles prof ON prof.id = p.landlord_id
      WHERE prof.clerk_user_id = auth.jwt() ->> 'sub'
      AND p.id = maintenance_requests.property_id
    )
  );