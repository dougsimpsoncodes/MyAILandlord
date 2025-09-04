-- Temporarily disable RLS for testing
-- WARNING: Only use this in development!

-- Check current RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'properties', 'maintenance_requests', 'tenant_property_links');

-- Temporarily disable RLS on key tables
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE properties DISABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_property_links DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('profiles', 'properties', 'maintenance_requests', 'tenant_property_links');

-- Now REST API calls should work without authentication
SELECT 'RLS temporarily disabled for testing. Remember to re-enable!' AS warning;