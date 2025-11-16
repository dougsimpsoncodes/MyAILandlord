-- Seed Test Data for E2E Testing
-- Run this in Supabase SQL Editor after creating test users

-- This script creates sample properties and maintenance requests
-- for testing the maintenance dashboard and related features

-- IMPORTANT: Replace these UUIDs with actual clerk_user_ids from your Clerk users
-- Find these in Clerk Dashboard → Users → click on user → copy User ID

-- Example:
-- Landlord User ID: user_123abc...
-- Tenant User ID: user_456def...

-- ============================================================================
-- STEP 1: Find your test user IDs
-- ============================================================================
-- Run this query first to find your test users' clerk_user_ids:

SELECT
  id as profile_id,
  clerk_user_id,
  email,
  role,
  full_name
FROM profiles
WHERE email IN (
  'test-landlord@myailandlord.com',
  'test-tenant@myailandlord.com'
);

-- Copy the clerk_user_id values and replace in variables below

-- ============================================================================
-- STEP 2: Set variables (REPLACE THESE!)
-- ============================================================================

-- Replace with actual Clerk user IDs from step 1
DO $$
DECLARE
  landlord_clerk_id TEXT := 'REPLACE_WITH_LANDLORD_CLERK_USER_ID'; -- e.g., 'user_2abc123...'
  tenant_clerk_id TEXT := 'REPLACE_WITH_TENANT_CLERK_USER_ID';     -- e.g., 'user_2def456...'
  landlord_profile_id UUID;
  tenant_profile_id UUID;
  property1_id UUID;
  property2_id UUID;
BEGIN

  -- Get profile IDs
  SELECT id INTO landlord_profile_id FROM profiles WHERE clerk_user_id = landlord_clerk_id;
  SELECT id INTO tenant_profile_id FROM profiles WHERE clerk_user_id = tenant_clerk_id;

  -- Create test properties
  INSERT INTO properties (id, landlord_id, name, address, city, state, zip_code, property_type, created_at, updated_at)
  VALUES
    (gen_random_uuid(), landlord_profile_id, 'Test Property 1', '123 Main St', 'San Francisco', 'CA', '94102', 'house', NOW(), NOW())
    RETURNING id INTO property1_id;

  INSERT INTO properties (id, landlord_id, name, address, city, state, zip_code, property_type, created_at, updated_at)
  VALUES
    (gen_random_uuid(), landlord_profile_id, 'Test Apartment Complex', '456 Oak Ave', 'Oakland', 'CA', '94601', 'apartment', NOW(), NOW())
    RETURNING id INTO property2_id;

  -- Create sample maintenance requests (various statuses for testing)
  INSERT INTO maintenance_requests (
    id,
    property_id,
    tenant_id,
    landlord_id,
    title,
    description,
    status,
    priority,
    category,
    created_at,
    updated_at
  ) VALUES
    -- New/Pending requests
    (gen_random_uuid(), property1_id, tenant_profile_id, landlord_profile_id, 'Leaky Faucet in Kitchen', 'The kitchen faucet has been dripping constantly for the past week. Water wastage is concerning.', 'pending', 'medium', 'plumbing', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
    (gen_random_uuid(), property1_id, tenant_profile_id, landlord_profile_id, 'Broken Window in Bedroom', 'Bedroom window won''t close properly, letting in cold air and noise.', 'pending', 'high', 'general', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day'),
    (gen_random_uuid(), property2_id, tenant_profile_id, landlord_profile_id, 'HVAC Not Heating', 'Heating system stopped working. Temperature dropping.', 'pending', 'urgent', 'hvac', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '3 hours'),

    -- In Progress requests
    (gen_random_uuid(), property1_id, tenant_profile_id, landlord_profile_id, 'Dishwasher Not Draining', 'Dishwasher leaves water at the bottom after cycle.', 'in_progress', 'medium', 'appliance', NOW() - INTERVAL '5 days', NOW() - INTERVAL '1 day'),
    (gen_random_uuid(), property2_id, tenant_profile_id, landlord_profile_id, 'Garage Door Stuck', 'Garage door opener not responding, door won''t open.', 'in_progress', 'high', 'general', NOW() - INTERVAL '4 days', NOW() - INTERVAL '2 days'),

    -- Resolved requests
    (gen_random_uuid(), property1_id, tenant_profile_id, landlord_profile_id, 'Light Bulb Replacement', 'Living room ceiling light burnt out.', 'resolved', 'low', 'electrical', NOW() - INTERVAL '10 days', NOW() - INTERVAL '8 days'),
    (gen_random_uuid(), property2_id, tenant_profile_id, landlord_profile_id, 'Clogged Sink', 'Bathroom sink draining very slowly.', 'resolved', 'medium', 'plumbing', NOW() - INTERVAL '15 days', NOW() - INTERVAL '12 days'),
    (gen_random_uuid(), property1_id, tenant_profile_id, landlord_profile_id, 'Smoke Detector Beeping', 'Smoke detector beeping indicating low battery.', 'resolved', 'high', 'safety', NOW() - INTERVAL '20 days', NOW() - INTERVAL '18 days');

  RAISE NOTICE 'Test data seeded successfully!';
  RAISE NOTICE 'Properties created: 2';
  RAISE NOTICE 'Maintenance requests created: 8';
  RAISE NOTICE '  - Pending: 3';
  RAISE NOTICE '  - In Progress: 2';
  RAISE NOTICE '  - Resolved: 3';

END $$;
