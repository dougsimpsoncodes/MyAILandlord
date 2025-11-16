-- Quick script to switch your current user to tenant role for testing
-- Replace 'YOUR_CLERK_ID' with your actual Clerk user ID

-- First, check your current profile
SELECT id, clerk_user_id, name, role, email 
FROM profiles 
WHERE email = 'YOUR_EMAIL_HERE';  -- Replace with your email

-- Update your role to tenant
UPDATE profiles 
SET role = 'tenant'
WHERE email = 'YOUR_EMAIL_HERE';  -- Replace with your email

-- Verify the change
SELECT id, clerk_user_id, name, role, email 
FROM profiles 
WHERE email = 'YOUR_EMAIL_HERE';  -- Replace with your email

-- Note: You can switch back to landlord later by running:
-- UPDATE profiles SET role = 'landlord' WHERE email = 'YOUR_EMAIL_HERE';