-- Add onboarding_completed field to profiles table
-- This tracks whether a user has completed the onboarding flow

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.onboarding_completed IS 'Tracks whether user has completed the onboarding flow';

-- Update existing users to mark onboarding as complete (they already went through old flow)
UPDATE public.profiles
SET onboarding_completed = true
WHERE onboarding_completed IS NULL OR onboarding_completed = false;
