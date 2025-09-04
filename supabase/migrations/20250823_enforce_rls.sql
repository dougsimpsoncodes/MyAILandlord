-- Enable RLS on all relevant tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_property_links ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if present
DROP POLICY IF EXISTS "profiles_isolation" ON profiles;
DROP POLICY IF EXISTS "properties_landlord" ON properties;
DROP POLICY IF EXISTS "properties_tenant" ON properties;
DROP POLICY IF EXISTS "maintenance_isolation" ON maintenance_requests;

-- Profiles: self-access only based on Clerk user id in JWT sub
CREATE POLICY "profiles_isolation" ON profiles
  FOR ALL USING (
    auth.jwt() IS NOT NULL AND
    auth.jwt() ->> 'sub' IS NOT NULL AND
    auth.jwt() ->> 'sub' = clerk_user_id
  );

-- Properties: landlords see owned
CREATE POLICY "properties_landlord" ON properties
  FOR ALL TO authenticated
  USING (
    auth.jwt() IS NOT NULL AND auth.jwt() ->> 'sub' IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.clerk_user_id = auth.jwt() ->> 'sub'
      AND profiles.id = properties.landlord_id
      AND profiles.role = 'landlord'
    )
  );

-- Properties: tenants can select linked properties
CREATE POLICY "properties_tenant" ON properties
  FOR SELECT TO authenticated
  USING (
    auth.jwt() IS NOT NULL AND auth.jwt() ->> 'sub' IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM tenant_property_links tpl
      JOIN profiles p ON p.id = tpl.tenant_id
      WHERE p.clerk_user_id = auth.jwt() ->> 'sub'
      AND tpl.property_id = properties.id
      AND tpl.is_active = true
    )
  );

-- Maintenance: tenants see own, landlords see their properties' requests
CREATE POLICY "maintenance_isolation" ON maintenance_requests
  FOR ALL TO authenticated
  USING (
    auth.jwt() IS NOT NULL AND auth.jwt() ->> 'sub' IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.clerk_user_id = auth.jwt() ->> 'sub'
        AND profiles.id = maintenance_requests.tenant_id
      )
      OR
      EXISTS (
        SELECT 1 FROM properties p
        JOIN profiles prof ON prof.id = p.landlord_id
        WHERE prof.clerk_user_id = auth.jwt() ->> 'sub'
        AND p.id = maintenance_requests.property_id
      )
    )
  );
