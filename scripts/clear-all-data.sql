-- Clear all data from all tables in proper order (respecting foreign key constraints)

-- Disable RLS temporarily for cleanup
ALTER TABLE maintenance_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE properties DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE property_invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE invite_links DISABLE ROW LEVEL SECURITY;

-- Clear data from all tables
DELETE FROM maintenance_requests;
DELETE FROM tenants;
DELETE FROM property_invitations;
DELETE FROM invite_links;
DELETE FROM properties;
DELETE FROM profiles;

-- Re-enable RLS
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_links ENABLE ROW LEVEL SECURITY;

-- Show counts to verify
SELECT 'profiles' as table_name, COUNT(*) as count FROM profiles
UNION ALL
SELECT 'properties', COUNT(*) FROM properties
UNION ALL
SELECT 'tenants', COUNT(*) FROM tenants
UNION ALL
SELECT 'property_invitations', COUNT(*) FROM property_invitations
UNION ALL
SELECT 'invite_links', COUNT(*) FROM invite_links
UNION ALL
SELECT 'maintenance_requests', COUNT(*) FROM maintenance_requests
ORDER BY table_name;