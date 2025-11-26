-- Create Test Users in Supabase via SQL
-- Run this in Supabase Dashboard → SQL Editor

-- IMPORTANT: This requires access to the auth schema (service role permissions)
-- If you get permission errors, use the Node.js script instead or create users via Dashboard UI

BEGIN;

-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Delete existing test users if they exist (clean slate)
DELETE FROM auth.users
WHERE email IN (
  'test-landlord@myailandlord.com',
  'test-tenant@myailandlord.com',
  'test-landlord@myailandlord.com',
  'test-tenant+clerk_test@myailandlord.com'
);

-- Create Landlord Test User
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change_token_current,
  email_change_token_new
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test-landlord@myailandlord.com',
  crypt('MyAI2025!Landlord#Test', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"landlord","created_by":"sql-setup-script"}',
  now(),
  now(),
  '',
  '',
  ''
);

-- Create Tenant Test User
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change_token_current,
  email_change_token_new
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'test-tenant@myailandlord.com',
  crypt('MyAI2025!Tenant#Test', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"role":"tenant","created_by":"sql-setup-script"}',
  now(),
  now(),
  '',
  '',
  ''
);

COMMIT;

-- Verify users were created successfully
SELECT
  id,
  email,
  email_confirmed_at,
  raw_user_meta_data->>'role' as user_role,
  created_at
FROM auth.users
WHERE email IN (
  'test-landlord@myailandlord.com',
  'test-tenant+clerk_test@myailandlord.com'
)
ORDER BY email;

-- Expected output:
-- | id (UUID) | email | email_confirmed_at (timestamp) | user_role | created_at |
-- |-----------|-------|-------------------------------|-----------|------------|
-- | xxx-xxx   | test-landlord+clerk_test@... | 2025-01-25 ... | landlord  | 2025-01-25 ... |
-- | xxx-xxx   | test-tenant+clerk_test@...   | 2025-01-25 ... | tenant    | 2025-01-25 ... |
