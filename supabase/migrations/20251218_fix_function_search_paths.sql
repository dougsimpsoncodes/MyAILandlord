-- Migration: Fix function search_path security issue
-- This addresses the Supabase linter warning "function_search_path_mutable"
-- Setting search_path = '' prevents search_path manipulation attacks

-- 1. set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 2a. set_app_user_id (uuid version)
CREATE OR REPLACE FUNCTION public.set_app_user_id(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM set_config('app.user_id', p_user_id::text, true);
END;
$$;

-- 2b. set_app_user_id (text version - legacy)
CREATE OR REPLACE FUNCTION public.set_app_user_id(user_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_id, false);
END;
$$;

-- 3. get_current_user_profile
CREATE OR REPLACE FUNCTION public.get_current_user_profile()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN (
    SELECT to_jsonb(p.*)
    FROM public.profiles p
    WHERE p.id = auth.uid()
  );
END;
$$;

-- 4. auth_uid_compat
CREATE OR REPLACE FUNCTION public.auth_uid_compat()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- With Supabase Auth, auth.uid() returns the user's UUID directly
  RETURN auth.uid();
END;
$$;

-- 5. notify_push_on_insert (trigger function for push notifications)
CREATE OR REPLACE FUNCTION public.notify_push_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Notify the push notification channel
  PERFORM pg_notify('push_notifications', json_build_object(
    'table', TG_TABLE_NAME,
    'type', TG_OP,
    'record', row_to_json(NEW)
  )::text);
  RETURN NEW;
END;
$$;

-- 6. validate_property_code (matches actual schema with extended return type)
DROP FUNCTION IF EXISTS public.validate_property_code(text, uuid);

CREATE OR REPLACE FUNCTION public.validate_property_code(input_code text, tenant_id uuid)
RETURNS TABLE(property_id uuid, property_name text, property_address text, is_multi_unit boolean, wifi_network text, wifi_password text, success boolean, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    prop_record RECORD;
    input_tenant_id UUID := tenant_id;  -- Alias to avoid ambiguity
    existing_link_id UUID;
BEGIN
    -- Validate tenant_id exists in profiles
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = input_tenant_id) THEN
        RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, FALSE, NULL::TEXT, NULL::TEXT, FALSE, 'Tenant profile not found'::TEXT;
        RETURN;
    END IF;

    -- Find property by code
    SELECT p.id, p.name, p.address, p.allow_tenant_signup, p.code_expires_at, p.wifi_network AS wifi_net, p.wifi_password AS wifi_pass
    INTO prop_record
    FROM public.properties p
    WHERE p.property_code = upper(input_code);

    IF prop_record.id IS NULL THEN
        RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, FALSE, NULL::TEXT, NULL::TEXT, FALSE, 'Invalid property code'::TEXT;
        RETURN;
    END IF;

    -- Check if code is expired
    IF prop_record.code_expires_at IS NOT NULL AND prop_record.code_expires_at < NOW() THEN
        RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, FALSE, NULL::TEXT, NULL::TEXT, FALSE, 'Property code has expired'::TEXT;
        RETURN;
    END IF;

    -- Check if tenant signup is allowed
    IF NOT prop_record.allow_tenant_signup THEN
        RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, FALSE, NULL::TEXT, NULL::TEXT, FALSE, 'Tenant signup not allowed for this property'::TEXT;
        RETURN;
    END IF;

    -- Check if tenant is already linked to this property
    SELECT tpl.id INTO existing_link_id
    FROM public.tenant_property_links tpl
    WHERE tpl.tenant_id = input_tenant_id AND tpl.property_id = prop_record.id AND tpl.is_active = true;

    IF existing_link_id IS NOT NULL THEN
        RETURN QUERY SELECT NULL::UUID, NULL::TEXT, NULL::TEXT, FALSE, NULL::TEXT, NULL::TEXT, FALSE, 'You are already linked to this property'::TEXT;
        RETURN;
    END IF;

    -- Return property info
    RETURN QUERY SELECT
        prop_record.id,
        prop_record.name,
        prop_record.address,
        (SELECT COUNT(*) > 1 FROM public.tenant_property_links tpl2 WHERE tpl2.property_id = prop_record.id)::BOOLEAN,
        prop_record.wifi_net,
        prop_record.wifi_pass,
        TRUE,
        'Property code validated successfully'::TEXT;
END;
$$;

-- 7. get_auth_jwt_sub
CREATE OR REPLACE FUNCTION public.get_auth_jwt_sub()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.jwt()->>'sub';
$$;

-- 8. link_tenant_to_property
CREATE OR REPLACE FUNCTION public.link_tenant_to_property(input_code text, tenant_id uuid, unit_number text DEFAULT NULL::text)
RETURNS TABLE(link_id uuid, success boolean, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    prop_record RECORD;
    input_tenant_id UUID := tenant_id;  -- Alias to avoid ambiguity
    new_link_id UUID;
BEGIN
    -- Validate the property code first
    SELECT vpc.property_id INTO prop_record
    FROM public.validate_property_code(input_code, input_tenant_id) vpc
    WHERE vpc.success = true;

    IF prop_record.property_id IS NULL THEN
        -- Return the error from validation
        RETURN QUERY
        SELECT NULL::uuid, vpc.success, vpc.error_message
        FROM public.validate_property_code(input_code, input_tenant_id) vpc;
        RETURN;
    END IF;

    -- Create the tenant-property link
    INSERT INTO public.tenant_property_links (tenant_id, property_id, unit_number, status)
    VALUES (input_tenant_id, prop_record.property_id, unit_number, 'active')
    RETURNING id INTO new_link_id;

    RETURN QUERY SELECT new_link_id, true, NULL::text;
EXCEPTION
    WHEN unique_violation THEN
        RETURN QUERY SELECT NULL::uuid, false, 'Already linked to this property'::text;
    WHEN OTHERS THEN
        RETURN QUERY SELECT NULL::uuid, false, SQLERRM::text;
END;
$$;

-- 9. set_tenant_link_landlord_id
CREATE OR REPLACE FUNCTION public.set_tenant_link_landlord_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Get the landlord_id from the property
  SELECT landlord_id INTO NEW.landlord_id
  FROM public.properties
  WHERE id = NEW.property_id;

  RETURN NEW;
END;
$$;

-- 10. properties_owner_fill
CREATE OR REPLACE FUNCTION public.properties_owner_fill()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Set landlord_id to the authenticated user if not provided
  IF NEW.landlord_id IS NULL THEN
    NEW.landlord_id := auth.uid();
  END IF;

  -- Also set user_id for backwards compatibility
  IF NEW.user_id IS NULL THEN
    NEW.user_id := auth.uid();
  END IF;

  RETURN NEW;
END;
$$;

-- 11. create_test_user_if_not_exists
CREATE OR REPLACE FUNCTION public.create_test_user_if_not_exists(p_email text, p_password text, p_name text, p_role text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Check if user already exists
  SELECT id INTO v_user_id FROM auth.users WHERE email = p_email;

  IF v_user_id IS NOT NULL THEN
    RAISE NOTICE 'User % already exists with id %', p_email, v_user_id;

    -- Update profile if role changed (cast to user_role enum)
    UPDATE public.profiles
    SET role = p_role::public.user_role, name = p_name, updated_at = NOW()
    WHERE id = v_user_id;

    RETURN v_user_id;
  END IF;

  -- Create new user via Supabase admin
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p_email,
    crypt(p_password, gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '',
    ''
  ) RETURNING id INTO v_user_id;

  -- Create profile with role cast to enum
  INSERT INTO public.profiles (id, email, name, role, created_at, updated_at)
  VALUES (v_user_id, p_email, p_name, p_role::public.user_role, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE SET role = p_role::public.user_role, name = p_name, updated_at = NOW();

  RAISE NOTICE 'Created user % with id % and role %', p_email, v_user_id, p_role;

  RETURN v_user_id;
END;
$$;

-- 12. address_text_from_jsonb
CREATE OR REPLACE FUNCTION public.address_text_from_jsonb(j jsonb, unit text DEFAULT NULL::text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT trim(both ' ' from concat_ws(
    ', ',
    nullif(concat_ws(' ',
      coalesce(j->>'line1',''),
      case when coalesce(unit,'')<>'' and coalesce(j->>'line2','')='' then 'Unit '||unit else '' end
    ),''),
    nullif(j->>'line2',''),
    nullif(concat_ws(', ',
      nullif(j->>'city',''),
      nullif(j->>'state',''),
      nullif(j->>'zipCode','')
    ),'')
  ));
$$;

-- 13. handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'landlord'
  );
  RETURN NEW;
END;
$$;

-- Add comment documenting the security fix
COMMENT ON FUNCTION public.set_updated_at() IS 'Sets updated_at timestamp. search_path secured.';
COMMENT ON FUNCTION public.set_app_user_id(uuid) IS 'Sets app.user_id for RLS context. search_path secured.';
COMMENT ON FUNCTION public.set_app_user_id(text) IS 'Sets app.current_user_id for RLS context (legacy). search_path secured.';
COMMENT ON FUNCTION public.get_current_user_profile() IS 'Gets current user profile. search_path secured.';
COMMENT ON FUNCTION public.auth_uid_compat() IS 'Compatibility wrapper for auth.uid(). search_path secured.';
COMMENT ON FUNCTION public.validate_property_code(text, uuid) IS 'Validates property invite code. search_path secured.';
COMMENT ON FUNCTION public.get_auth_jwt_sub() IS 'Gets JWT subject claim. search_path secured.';
COMMENT ON FUNCTION public.link_tenant_to_property(text, uuid, text) IS 'Links tenant to property via invite code. search_path secured.';
COMMENT ON FUNCTION public.set_tenant_link_landlord_id() IS 'Sets landlord_id on tenant links. search_path secured.';
COMMENT ON FUNCTION public.properties_owner_fill() IS 'Auto-fills property owner fields. search_path secured.';
COMMENT ON FUNCTION public.create_test_user_if_not_exists(text, text, text, text) IS 'Creates test user for E2E testing. search_path secured.';
COMMENT ON FUNCTION public.address_text_from_jsonb(jsonb, text) IS 'Formats address from JSONB. search_path secured.';
COMMENT ON FUNCTION public.handle_new_user() IS 'Trigger: Creates profile for new auth user. search_path secured.';
COMMENT ON FUNCTION public.notify_push_on_insert() IS 'Trigger: Notifies push channel on insert. search_path secured.';
