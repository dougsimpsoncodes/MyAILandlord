-- Create test property for landlord
DO $$
DECLARE
  v_landlord_id UUID;
  v_property_id UUID;
BEGIN
  -- Get the landlord user
  SELECT id INTO v_landlord_id FROM auth.users WHERE email = 'landlord@test.com' LIMIT 1;

  IF v_landlord_id IS NULL THEN
    RAISE EXCEPTION 'Landlord user not found';
  END IF;

  -- Delete existing test properties
  DELETE FROM public.properties WHERE landlord_id = v_landlord_id;

  -- Create a test property
  INSERT INTO public.properties (
    landlord_id,
    user_id,
    name,
    address,
    property_type
  ) VALUES (
    v_landlord_id,
    v_landlord_id,  -- user_id same as landlord_id
    'Test Property',
    '123 Test St',
    'house'
  ) RETURNING id INTO v_property_id;

  RAISE NOTICE 'Created property: %', v_property_id;
END $$;
