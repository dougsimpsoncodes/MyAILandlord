-- Migration: Remove Clerk and use Supabase Auth
-- This migration removes clerk_user_id and sets up the profiles table to use Supabase Auth

-- Step 1: Add a foreign key constraint from profiles.id to auth.users.id
-- (The id column already exists, we just need to ensure it references auth.users)
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_id_fkey
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Drop the clerk_user_id column (no longer needed)
ALTER TABLE profiles DROP COLUMN IF EXISTS clerk_user_id;

-- Step 3: Create a trigger to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'landlord' -- Default role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 4: Update the email column to be unique (important for Supabase Auth)
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);
