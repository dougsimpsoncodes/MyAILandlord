-- Switch Doug's account to tenant role for testing
-- This uses your actual Clerk ID from our previous work

-- First, check your current profile
SELECT id, clerk_user_id, name, role, email 
FROM profiles 
WHERE clerk_user_id = 'user_2okJhL5vUsqTPu34tbUqkPJLjHR';

-- Update your role to tenant
UPDATE profiles 
SET role = 'tenant'
WHERE clerk_user_id = 'user_2okJhL5vUsqTPu34tbUqkPJLjHR';

-- Verify the change
SELECT id, clerk_user_id, name, role, email 
FROM profiles 
WHERE clerk_user_id = 'user_2okJhL5vUsqTPu34tbUqkPJLjHR';

-- To switch back to landlord later, run:
-- UPDATE profiles SET role = 'landlord' WHERE clerk_user_id = 'user_2okJhL5vUsqTPu34tbUqkPJLjHR';