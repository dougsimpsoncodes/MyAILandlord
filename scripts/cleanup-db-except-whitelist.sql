-- ============================================================================
-- Script: Cleanup Database Except Whitelisted Users
-- Description: Deletes all users and related data EXCEPT specified emails
-- Usage: Update the WHITELIST array, then run with psql
-- ============================================================================

DO $$
DECLARE
  v_whitelist TEXT[] := ARRAY[
    'landlord@test.com',
    'g@a.com'
    -- Add more emails here as needed
  ];
  v_deleted_users INTEGER := 0;
  v_deleted_profiles INTEGER := 0;
  v_deleted_properties INTEGER := 0;
  v_deleted_links INTEGER := 0;
  v_deleted_messages INTEGER := 0;
  v_deleted_requests INTEGER := 0;
  v_deleted_invites INTEGER := 0;
BEGIN
  RAISE NOTICE 'Starting cleanup - keeping users: %', array_to_string(v_whitelist, ', ');

  -- Delete in correct order to respect foreign key constraints

  -- 1. Delete invite_code_attempts (references profiles)
  DELETE FROM public.invite_code_attempts
  WHERE user_id NOT IN (
    SELECT id FROM public.profiles WHERE email = ANY(v_whitelist)
  );
  RAISE NOTICE 'Deleted invite_code_attempts for non-whitelisted users';

  -- 2. Delete messages (references profiles as sender/recipient)
  DELETE FROM public.messages
  WHERE sender_id NOT IN (
    SELECT id FROM public.profiles WHERE email = ANY(v_whitelist)
  )
  OR recipient_id NOT IN (
    SELECT id FROM public.profiles WHERE email = ANY(v_whitelist)
  );
  GET DIAGNOSTICS v_deleted_messages = ROW_COUNT;
  RAISE NOTICE 'Deleted % messages', v_deleted_messages;

  -- 3. Delete maintenance_requests (references tenant_property_links)
  DELETE FROM public.maintenance_requests
  WHERE tenant_id NOT IN (
    SELECT id FROM public.profiles WHERE email = ANY(v_whitelist)
  );
  GET DIAGNOSTICS v_deleted_requests = ROW_COUNT;
  RAISE NOTICE 'Deleted % maintenance requests', v_deleted_requests;

  -- 4. Delete property_assets (references property_areas → properties → profiles)
  DELETE FROM public.property_assets
  WHERE property_id IN (
    SELECT id FROM public.properties
    WHERE landlord_id NOT IN (
      SELECT id FROM public.profiles WHERE email = ANY(v_whitelist)
    )
  );
  RAISE NOTICE 'Deleted property_assets for non-whitelisted landlords';

  -- 5. Delete property_areas (references properties → profiles)
  DELETE FROM public.property_areas
  WHERE property_id IN (
    SELECT id FROM public.properties
    WHERE landlord_id NOT IN (
      SELECT id FROM public.profiles WHERE email = ANY(v_whitelist)
    )
  );
  RAISE NOTICE 'Deleted property_areas for non-whitelisted landlords';

  -- 6. Delete tenant_property_links (references both tenant and property)
  DELETE FROM public.tenant_property_links
  WHERE tenant_id NOT IN (
    SELECT id FROM public.profiles WHERE email = ANY(v_whitelist)
  )
  OR property_id IN (
    SELECT id FROM public.properties
    WHERE landlord_id NOT IN (
      SELECT id FROM public.profiles WHERE email = ANY(v_whitelist)
    )
  );
  GET DIAGNOSTICS v_deleted_links = ROW_COUNT;
  RAISE NOTICE 'Deleted % tenant_property_links', v_deleted_links;

  -- 7. Delete invites (references properties and profiles)
  -- First clear accepted_by foreign key
  UPDATE public.invites
  SET accepted_by = NULL
  WHERE accepted_by NOT IN (
    SELECT id FROM public.profiles WHERE email = ANY(v_whitelist)
  );

  DELETE FROM public.invites
  WHERE property_id IN (
    SELECT id FROM public.properties
    WHERE landlord_id NOT IN (
      SELECT id FROM public.profiles WHERE email = ANY(v_whitelist)
    )
  )
  OR created_by NOT IN (
    SELECT id FROM public.profiles WHERE email = ANY(v_whitelist)
  );
  GET DIAGNOSTICS v_deleted_invites = ROW_COUNT;
  RAISE NOTICE 'Deleted % invites', v_deleted_invites;

  -- 8. Delete properties (references profiles as landlord_id)
  DELETE FROM public.properties
  WHERE landlord_id NOT IN (
    SELECT id FROM public.profiles WHERE email = ANY(v_whitelist)
  );
  GET DIAGNOSTICS v_deleted_properties = ROW_COUNT;
  RAISE NOTICE 'Deleted % properties', v_deleted_properties;

  -- 9. Delete profiles (references auth.users)
  DELETE FROM public.profiles
  WHERE email NOT IN (
    SELECT unnest(v_whitelist)
  );
  GET DIAGNOSTICS v_deleted_profiles = ROW_COUNT;
  RAISE NOTICE 'Deleted % profiles', v_deleted_profiles;

  -- 10. Delete auth.users (final step)
  DELETE FROM auth.users
  WHERE email NOT IN (
    SELECT unnest(v_whitelist)
  );
  GET DIAGNOSTICS v_deleted_users = ROW_COUNT;
  RAISE NOTICE 'Deleted % auth users', v_deleted_users;

  -- Summary
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Cleanup complete!';
  RAISE NOTICE 'Deleted: % users, % profiles, % properties, % links, % messages, % requests, % invites',
    v_deleted_users, v_deleted_profiles, v_deleted_properties,
    v_deleted_links, v_deleted_messages, v_deleted_requests, v_deleted_invites;
  RAISE NOTICE 'Kept users: %', array_to_string(v_whitelist, ', ');
  RAISE NOTICE '====================================';
END $$;

-- Verify remaining users
SELECT
  u.email,
  p.name,
  p.role,
  (SELECT COUNT(*) FROM properties WHERE landlord_id = p.id) as properties_owned,
  (SELECT COUNT(*) FROM tenant_property_links WHERE tenant_id = p.id) as properties_linked
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
ORDER BY u.created_at;
