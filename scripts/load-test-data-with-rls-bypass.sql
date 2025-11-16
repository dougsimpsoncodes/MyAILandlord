-- Load Test Data with RLS Bypass
-- This script temporarily disables RLS to load test data
-- Should only be used for development/testing purposes

-- Ensure required types exist (using DO block for compatibility)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('tenant', 'landlord');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_priority') THEN
        CREATE TYPE request_priority AS ENUM ('low', 'medium', 'high', 'urgent');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
        CREATE TYPE request_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
    END IF;
END $$;

-- Temporarily disable RLS for data loading
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE properties DISABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_property_links DISABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests DISABLE ROW LEVEL SECURITY;

-- Clear existing test data first
DELETE FROM maintenance_requests WHERE id IN (
  '11111111-0001-0001-0001-000000000001',
  '22222222-0002-0002-0002-000000000002',
  '33333333-0003-0003-0003-000000000003',
  '44444444-0004-0004-0004-000000000004',
  '55555555-0005-0005-0005-000000000005',
  '66666666-0006-0006-0006-000000000006',
  '77777777-0007-0007-0007-000000000007',
  '88888888-0008-0008-0008-000000000008'
);

DELETE FROM tenant_property_links WHERE id IN (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'dddddddd-dddd-dddd-dddd-dddddddddddd'
);

DELETE FROM properties WHERE id IN (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
);

DELETE FROM profiles WHERE id IN (
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333'
);

-- Insert test profiles
INSERT INTO profiles (id, clerk_user_id, role, name, email, created_at, updated_at) VALUES
('11111111-1111-1111-1111-111111111111', 'tenant_sarah_001', 'tenant', 'Sarah Johnson', 'sarah.johnson@example.com', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),
('22222222-2222-2222-2222-222222222222', 'tenant_michael_002', 'tenant', 'Michael Chen', 'michael.chen@example.com', NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days'),
('33333333-3333-3333-3333-333333333333', 'landlord_john_001', 'landlord', 'John Smith', 'john.smith@example.com', NOW() - INTERVAL '90 days', NOW() - INTERVAL '90 days');

-- Insert test properties
INSERT INTO properties (id, name, address, user_id, property_type, unit, bedrooms, bathrooms, created_at, updated_at) VALUES
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Sunset Apartments Unit 4B', '123 Sunset Boulevard, Unit 4B, Los Angeles, CA 90210', '33333333-3333-3333-3333-333333333333', 'apartment', '4B', 2, 1, NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Downtown Loft 12A', '456 Main Street, Unit 12A, Los Angeles, CA 90012', '33333333-3333-3333-3333-333333333333', 'apartment', '12A', 1, 1, NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days');

-- Insert tenant property links
INSERT INTO tenant_property_links (id, tenant_id, property_id, unit_number, is_active, created_at, updated_at) VALUES
('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '4B', true, NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days'),
('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '12A', true, NOW() - INTERVAL '60 days', NOW() - INTERVAL '60 days');

-- Insert maintenance requests
INSERT INTO maintenance_requests (id, tenant_id, property_id, title, description, priority, status, area, asset, issue_type, created_at, updated_at) VALUES
('11111111-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Kitchen Faucet Leak', 'Kitchen faucet is leaking constantly and making strange noises when turned on. Water pressure seems low and water is dripping into the cabinet below.', 'medium', 'pending', 'Kitchen', 'Sink', 'Plumbing Issue', NOW(), NOW()),
('22222222-0002-0002-0002-000000000002', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Bathroom Exhaust Fan Noise', 'Bathroom exhaust fan making loud buzzing and grinding noises. Sometimes stops working completely. Fan has been noisy for about a week.', 'low', 'pending', 'Bathroom', 'Exhaust Fan', 'Electrical Issue', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
('33333333-0003-0003-0003-000000000003', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'AC Not Cooling Properly', 'Air conditioning unit not cooling properly. Takes hours to cool down the apartment. AC was serviced 6 months ago but performance has declined.', 'high', 'in_progress', 'Living Room', 'AC Unit', 'HVAC Issue', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day'),
('44444444-0004-0004-0004-000000000004', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Refrigerator Not Cooling', 'Refrigerator making loud humming noises and not keeping food cold enough. Food is spoiling. Temperature reads 50°F instead of 35°F.', 'high', 'pending', 'Kitchen', 'Refrigerator', 'Appliance Issue', NOW() - INTERVAL '12 hours', NOW() - INTERVAL '12 hours'),
('55555555-0005-0005-0005-000000000005', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Toilet Running Constantly', 'Toilet in main bathroom running constantly and water level seems low. Fixed last week - toilet flapper was warped and needed replacement.', 'medium', 'completed', 'Bathroom', 'Toilet', 'Plumbing Issue', NOW() - INTERVAL '1 week', NOW() - INTERVAL '3 days'),
('66666666-0006-0006-0006-000000000006', '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'EMERGENCY: Sparking Outlet', 'Power outlet in bedroom sparking when plugs are inserted. SAFETY ISSUE - outlet sparked when I plugged in phone charger. Unplugged everything for safety.', 'urgent', 'in_progress', 'Bedroom', 'Power Outlet', 'Electrical Issue', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour'),
('77777777-0007-0007-0007-000000000007', '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Front Door Lock Sticking', 'Front door lock sticking and difficult to open with key. Lock has been getting harder to turn over the past month.', 'low', 'pending', 'Entrance', 'Door Lock', 'General Maintenance', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
('88888888-0008-0008-0008-000000000008', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Low Shower Pressure', 'Shower pressure very low and water takes long time to heat up. Issue started about 2 weeks ago. Morning showers are especially problematic.', 'medium', 'pending', 'Bathroom', 'Shower', 'Plumbing Issue', NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days');

-- Re-enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_property_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;

-- Display summary
SELECT 'Test data loaded successfully!' AS message;
SELECT 'Profiles: ' || COUNT(*) || ' records' AS summary FROM profiles WHERE clerk_user_id LIKE '%_00%';
SELECT 'Properties: ' || COUNT(*) || ' records' AS summary FROM properties WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
SELECT 'Tenant Links: ' || COUNT(*) || ' records' AS summary FROM tenant_property_links WHERE id IN ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'dddddddd-dddd-dddd-dddd-dddddddddddd');
SELECT 'Maintenance Requests: ' || COUNT(*) || ' records' AS summary FROM maintenance_requests WHERE id IN (
  '11111111-0001-0001-0001-000000000001',
  '22222222-0002-0002-0002-000000000002',
  '33333333-0003-0003-0003-000000000003',
  '44444444-0004-0004-0004-000000000004',
  '55555555-0005-0005-0005-000000000005',
  '66666666-0006-0006-0006-000000000006',
  '77777777-0007-0007-0007-000000000007',
  '88888888-0008-0008-0008-000000000008'
);