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

-- Profiles: users can only access their own profile
CREATE POLICY "profiles_isolation" ON profiles
  FOR ALL USING (auth.uid() = id);

-- Properties: landlords see/manage owned properties
-- Prefer properties.user_id (new schema), fallback to landlord_id (legacy schema).
CREATE POLICY "properties_landlord" ON properties
  FOR ALL TO authenticated
  USING (auth.uid() = COALESCE(user_id, landlord_id));

-- Properties: tenants can select linked properties
CREATE POLICY "properties_tenant" ON properties
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM tenant_property_links tpl
      JOIN profiles p ON p.id = tpl.tenant_id
      WHERE p.id = auth.uid()
      AND tpl.property_id = properties.id
      AND tpl.is_active = true
    )
  );

-- Maintenance: tenants see own requests, landlords see requests for their properties
CREATE POLICY "maintenance_isolation" ON maintenance_requests
  FOR ALL TO authenticated
  USING (
    maintenance_requests.tenant_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM properties p
      WHERE p.id = maintenance_requests.property_id
      AND auth.uid() = COALESCE(p.user_id, p.landlord_id)
    )
  );
