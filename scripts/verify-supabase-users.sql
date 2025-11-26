-- Verify Test Users in Supabase
-- Run this in Supabase SQL Editor to check if test users exist and are properly configured

-- 1. Check if users exist
SELECT
  id,
  email,
  email_confirmed_at,
  created_at,
  raw_user_meta_data->>'role' as user_role,
  raw_app_meta_data->>'provider' as auth_provider
FROM auth.users
WHERE email IN (
  'test-landlord@myailandlord.com',
  'test-tenant@myailandlord.com'
)
ORDER BY email;

-- 2. Check if emails are confirmed (should have timestamps, not NULL)
SELECT
  email,
  CASE
    WHEN email_confirmed_at IS NOT NULL THEN '✅ Confirmed'
    ELSE '❌ Not Confirmed'
  END as email_status,
  email_confirmed_at
FROM auth.users
WHERE email IN (
  'test-landlord@myailandlord.com',
  'test-tenant@myailandlord.com'
)
ORDER BY email;

-- 3. Count total test users
SELECT COUNT(*) as test_user_count
FROM auth.users
WHERE email LIKE '%@myailandlord.com'
  AND email LIKE 'test-%';

-- Expected output:
-- - 2 users found
-- - Both emails confirmed
-- - Landlord has role: 'landlord'
-- - Tenant has role: 'tenant'
