-- Fix maintenance_requests RLS policy for tenant creation
-- The issue is likely that the current policy is overly complex and may have
-- JWT token validation issues. Let's create a simpler, more reliable policy.

-- First, let's check what we're working with
SELECT 'Current Policies' as info;
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'maintenance_requests';

-- Drop existing maintenance request policies
DROP POLICY IF EXISTS "mr_select_tenant_or_landlord" ON maintenance_requests;
DROP POLICY IF EXISTS "mr_insert_tenant_own_property" ON maintenance_requests;
DROP POLICY IF EXISTS "mr_update_tenant_or_landlord" ON maintenance_requests;

-- Drop any legacy policies that might conflict
DROP POLICY IF EXISTS "maintenance_read_access" ON maintenance_requests;
DROP POLICY IF EXISTS "maintenance_create_access" ON maintenance_requests;
DROP POLICY IF EXISTS "maintenance_update_access" ON maintenance_requests;
DROP POLICY IF EXISTS "maintenance_delete_access" ON maintenance_requests;
DROP POLICY IF EXISTS "Users can read maintenance requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Tenants can create maintenance requests" ON maintenance_requests;
DROP POLICY IF EXISTS "Users can update maintenance requests" ON maintenance_requests;

-- Create simple, reliable policies
-- READ: Tenants see their own, landlords see their properties' requests
CREATE POLICY "maintenance_select_policy" ON maintenance_requests
  FOR SELECT 
  USING (
    -- Allow if JWT is present and matches tenant_id via profiles
    (auth.jwt() ->> 'sub' IS NOT NULL AND tenant_id IN (
      SELECT id FROM profiles 
      WHERE clerk_user_id = auth.jwt() ->> 'sub'
    ))
    OR
    -- Allow if JWT is present and user is landlord of the property
    (auth.jwt() ->> 'sub' IS NOT NULL AND property_id IN (
      SELECT p.id FROM properties p
      JOIN profiles prof ON prof.id = p.landlord_id
      WHERE prof.clerk_user_id = auth.jwt() ->> 'sub'
    ))
  );

-- INSERT: Tenants can create requests for properties they're linked to
CREATE POLICY "maintenance_insert_policy" ON maintenance_requests
  FOR INSERT 
  WITH CHECK (
    auth.jwt() ->> 'sub' IS NOT NULL 
    AND
    -- Tenant ID must belong to the current user
    tenant_id IN (
      SELECT id FROM profiles 
      WHERE clerk_user_id = auth.jwt() ->> 'sub' 
      AND role = 'tenant'
    )
    AND
    -- Property ID must be one the tenant has access to
    property_id IN (
      SELECT tpl.property_id 
      FROM tenant_property_links tpl
      JOIN profiles p ON p.id = tpl.tenant_id
      WHERE p.clerk_user_id = auth.jwt() ->> 'sub' 
      AND tpl.is_active = true
    )
  );

-- UPDATE: Both tenants (their own) and landlords (their properties) can update
CREATE POLICY "maintenance_update_policy" ON maintenance_requests
  FOR UPDATE 
  USING (
    auth.jwt() ->> 'sub' IS NOT NULL 
    AND (
      -- Tenant can update their own requests
      tenant_id IN (
        SELECT id FROM profiles 
        WHERE clerk_user_id = auth.jwt() ->> 'sub'
      )
      OR
      -- Landlord can update requests for their properties
      property_id IN (
        SELECT p.id FROM properties p
        JOIN profiles prof ON prof.id = p.landlord_id
        WHERE prof.clerk_user_id = auth.jwt() ->> 'sub'
      )
    )
  );

-- DELETE: Only landlords can delete maintenance requests for their properties
CREATE POLICY "maintenance_delete_policy" ON maintenance_requests
  FOR DELETE 
  USING (
    auth.jwt() ->> 'sub' IS NOT NULL 
    AND property_id IN (
      SELECT p.id FROM properties p
      JOIN profiles prof ON prof.id = p.landlord_id
      WHERE prof.clerk_user_id = auth.jwt() ->> 'sub'
      AND prof.role = 'landlord'
    )
  );

-- Verify policies are created
SELECT 'New Policies Created' as info;
SELECT policyname, cmd, with_check IS NOT NULL as has_with_check 
FROM pg_policies 
WHERE tablename = 'maintenance_requests'
ORDER BY cmd, policyname;