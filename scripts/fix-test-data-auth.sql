-- Fix Test Data Authentication Mismatch
-- This script updates test data to work with your real Clerk user ID
-- 
-- IMPORTANT: Replace 'YOUR_REAL_CLERK_ID' with your actual Clerk user ID
-- You can find it by:
-- 1. Opening the app console
-- 2. Running: console.log(user?.id)
-- 3. Or checking Clerk Dashboard for your user

-- Step 1: First, let's check what we're working with
SELECT 'Current Test Data Status:' as info;
SELECT COUNT(*) as test_profiles FROM profiles WHERE clerk_user_id LIKE '%_00%';
SELECT COUNT(*) as test_properties FROM properties WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
SELECT COUNT(*) as test_requests FROM maintenance_requests WHERE property_id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

-- Step 2: Update the landlord profile to use your real Clerk ID
-- REPLACE 'YOUR_REAL_CLERK_ID' with your actual ID (e.g., 'user_2okJh...')
BEGIN;

-- Update the test landlord profile
UPDATE profiles 
SET clerk_user_id = 'YOUR_REAL_CLERK_ID'  -- <-- REPLACE THIS!
WHERE id = '33333333-3333-3333-3333-333333333333'
  AND role = 'landlord';

-- Verify the update
SELECT 'Updated Profile:' as info;
SELECT id, clerk_user_id, role, name, email 
FROM profiles 
WHERE id = '33333333-3333-3333-3333-333333333333';

-- Step 3: Update properties to use the correct user_id
-- This uses the auth_uid_compat() function to convert your Clerk ID to UUID
UPDATE properties 
SET user_id = public.clerk_id_to_uuid('YOUR_REAL_CLERK_ID')  -- <-- REPLACE THIS TOO!
WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

-- Verify property updates
SELECT 'Updated Properties:' as info;
SELECT id, name, user_id, landlord_id 
FROM properties 
WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

COMMIT;

-- Step 4: Verify everything works
SELECT 'Test Data Should Now Be Visible!' as info;
SELECT 'You should see 2 properties and 8 maintenance requests in the app' as next_steps;

-- Optional: Create a proper RLS test query
-- This simulates what the app sees with your JWT token
DO $$ 
DECLARE
  clerk_id text := 'YOUR_REAL_CLERK_ID';  -- <-- REPLACE THIS AS WELL!
  computed_uuid uuid;
BEGIN
  -- Compute the UUID from Clerk ID
  computed_uuid := public.clerk_id_to_uuid(clerk_id);
  
  -- Check what properties would be visible
  RAISE NOTICE 'Properties visible to %: %', 
    clerk_id,
    (SELECT COUNT(*) FROM properties WHERE user_id = computed_uuid);
  
  -- Check maintenance requests through property relationship
  RAISE NOTICE 'Maintenance requests visible: %',
    (SELECT COUNT(*) 
     FROM maintenance_requests mr
     WHERE mr.property_id IN (
       SELECT id FROM properties WHERE user_id = computed_uuid
     ));
END $$;

-- Rollback instructions (if needed)
-- If something goes wrong, you can restore the original test data:
/*
BEGIN;
UPDATE profiles 
SET clerk_user_id = 'landlord_john_001'
WHERE id = '33333333-3333-3333-3333-333333333333';

UPDATE properties 
SET user_id = '33333333-3333-3333-3333-333333333333'
WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
COMMIT;
*/