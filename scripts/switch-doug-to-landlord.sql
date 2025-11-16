-- Switch Doug back to landlord role to test invite functionality

UPDATE profiles 
SET role = 'landlord'
WHERE clerk_user_id = 'user_2okJhL5vUsqTPu34tbUqkPJLjHR';

-- Verify the change
SELECT id, clerk_user_id, name, role, email 
FROM profiles 
WHERE clerk_user_id = 'user_2okJhL5vUsqTPu34tbUqkPJLjHR';