-- Seed two deterministic test properties for the most recently updated landlord profile.
-- Idempotent: if the QA names already exist for that landlord, no new rows are inserted.

DO $$
DECLARE
  v_landlord_id UUID;
  v_stamp TEXT := to_char(now(), 'YYYYMMDDHH24MISS');
BEGIN
  SELECT p.id
  INTO v_landlord_id
  FROM public.profiles p
  WHERE p.role = 'landlord'
  ORDER BY COALESCE(p.updated_at, p.created_at) DESC NULLS LAST
  LIMIT 1;

  IF v_landlord_id IS NULL THEN
    RAISE EXCEPTION 'No landlord profile found to seed test properties';
  END IF;

  INSERT INTO public.properties (
    landlord_id,
    user_id,
    name,
    address,
    address_jsonb,
    property_type,
    bedrooms,
    bathrooms,
    description,
    allow_tenant_signup,
    code_expires_at
  )
  SELECT
    v_landlord_id,
    v_landlord_id,
    'QA Property A ' || v_stamp,
    '101 QA Lane, Los Angeles, CA 90001',
    jsonb_build_object(
      'line1', '101 QA Lane',
      'line2', '',
      'city', 'Los Angeles',
      'state', 'CA',
      'zipCode', '90001',
      'country', 'US'
    ),
    'house',
    3,
    2.5,
    'Seeded QA property A for invite-flow testing',
    true,
    now() + interval '90 days'
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.properties
    WHERE landlord_id = v_landlord_id
      AND name LIKE 'QA Property A %'
  );

  INSERT INTO public.properties (
    landlord_id,
    user_id,
    name,
    address,
    address_jsonb,
    property_type,
    bedrooms,
    bathrooms,
    description,
    allow_tenant_signup,
    code_expires_at
  )
  SELECT
    v_landlord_id,
    v_landlord_id,
    'QA Property B ' || v_stamp,
    '202 QA Avenue, San Diego, CA 92101',
    jsonb_build_object(
      'line1', '202 QA Avenue',
      'line2', '',
      'city', 'San Diego',
      'state', 'CA',
      'zipCode', '92101',
      'country', 'US'
    ),
    'condo',
    2,
    1.5,
    'Seeded QA property B for invite-flow testing',
    true,
    now() + interval '90 days'
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.properties
    WHERE landlord_id = v_landlord_id
      AND name LIKE 'QA Property B %'
  );

  RAISE NOTICE 'Seeded QA properties for landlord %', v_landlord_id;
END;
$$;
