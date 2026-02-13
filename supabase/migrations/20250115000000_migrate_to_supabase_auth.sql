-- Migration: Migrate profiles to Supabase Auth (replace clerk_user_id with id referencing auth.users)
-- WARNING: Review before applying to production.

-- 1) Drop dependent views/policies if exist
DROP VIEW IF EXISTS profiles_view CASCADE;
DROP VIEW IF EXISTS profiles_api CASCADE;
DO $$ BEGIN
  DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
  DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
  DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
  DROP POLICY IF EXISTS profiles_delete_own ON public.profiles;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- 2) Keep legacy clerk_user_id for compatibility with historical migrations.
-- Many later migrations still reference this column.
DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS clerk_user_id TEXT;
EXCEPTION WHEN undefined_table THEN NULL; END $$;

UPDATE public.profiles
SET clerk_user_id = id::text
WHERE clerk_user_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_clerk_user_id
  ON public.profiles(clerk_user_id);

-- 3) Add FK to auth.users(id)
DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4) Auto-profile trigger on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, clerk_user_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'landlord',
    NEW.id::text
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5) Unique email index
CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
