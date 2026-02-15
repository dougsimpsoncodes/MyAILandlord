-- Update test user email to match Resend sandbox allowed recipient
-- Resend sandbox (onboarding@resend.dev) can only send to: dougiefreshcodes@gmail.com
-- Test environment only — removes stale user data from previous test sessions.

DO $$
DECLARE
  v_old_user_id UUID;
  v_active_landlord_id UUID;
BEGIN
  -- Find the stale profile with dougiefreshcodes email
  SELECT id INTO v_old_user_id
  FROM public.profiles
  WHERE email = 'dougiefreshcodes@gmail.com'
  LIMIT 1;

  -- Find the active landlord (the one with properties from current session)
  -- Pick the most recently created one if multiple exist
  SELECT p.landlord_id INTO v_active_landlord_id
  FROM public.properties p
  ORDER BY p.created_at DESC
  LIMIT 1;

  -- If both exist and are different users, remove the stale one
  IF v_old_user_id IS NOT NULL AND v_active_landlord_id IS NOT NULL
     AND v_old_user_id != v_active_landlord_id THEN

    -- Clean up stale user's data (cascades handle most)
    DELETE FROM public.invites WHERE created_by = v_old_user_id;
    DELETE FROM public.properties WHERE landlord_id = v_old_user_id;
    DELETE FROM public.profiles WHERE id = v_old_user_id;
    DELETE FROM auth.users WHERE id = v_old_user_id;

    -- Now update the active landlord's email
    UPDATE public.profiles
    SET email = 'dougiefreshcodes@gmail.com'
    WHERE id = v_active_landlord_id;

    UPDATE auth.users
    SET email = 'dougiefreshcodes@gmail.com',
        raw_user_meta_data = raw_user_meta_data || '{"email": "dougiefreshcodes@gmail.com"}'::jsonb
    WHERE id = v_active_landlord_id;

    RAISE NOTICE 'Updated landlord % email to dougiefreshcodes@gmail.com (removed stale user %)',
      v_active_landlord_id, v_old_user_id;

  ELSIF v_old_user_id IS NOT NULL AND v_old_user_id = v_active_landlord_id THEN
    -- The active landlord already has the right email
    RAISE NOTICE 'Active landlord % already has dougiefreshcodes@gmail.com', v_active_landlord_id;

  ELSIF v_old_user_id IS NULL AND v_active_landlord_id IS NOT NULL THEN
    -- No conflict, just update
    UPDATE public.profiles
    SET email = 'dougiefreshcodes@gmail.com'
    WHERE id = v_active_landlord_id;

    UPDATE auth.users
    SET email = 'dougiefreshcodes@gmail.com',
        raw_user_meta_data = raw_user_meta_data || '{"email": "dougiefreshcodes@gmail.com"}'::jsonb
    WHERE id = v_active_landlord_id;

    RAISE NOTICE 'Updated landlord % email to dougiefreshcodes@gmail.com', v_active_landlord_id;
  ELSE
    RAISE NOTICE 'No landlord found to update';
  END IF;
END
$$;
