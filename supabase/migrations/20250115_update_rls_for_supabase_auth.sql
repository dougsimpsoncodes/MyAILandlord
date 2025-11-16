-- Migration: Update RLS to use auth.uid()

-- Drop existing policies for rewritten tables
DO $$ BEGIN
  DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
  DROP POLICY IF EXISTS profiles_insert_own ON public.profiles;
  DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
  DROP POLICY IF EXISTS profiles_delete_own ON public.profiles;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- Profiles policies
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_delete_own ON public.profiles
  FOR DELETE TO authenticated
  USING (id = auth.uid());

-- Example: messages table policies (update as needed per schema)
-- Allow users to see messages they sent or received
DO $$ BEGIN
  DROP POLICY IF EXISTS messages_select_own ON public.messages;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY messages_select_own ON public.messages
  FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

