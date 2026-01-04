-- Fix: Add address auto-fill to properties_owner_fill trigger function
-- This ensures the `address` field is automatically populated from `address_jsonb`
-- when a property is created or updated.

CREATE OR REPLACE FUNCTION public.properties_owner_fill()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
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

  -- Auto-fill address from address_jsonb if address is empty
  IF (NEW.address IS NULL OR NEW.address = '') AND NEW.address_jsonb IS NOT NULL THEN
    NEW.address := public.address_text_from_jsonb(NEW.address_jsonb, NEW.unit);
  END IF;

  RETURN NEW;
END;
$$;

-- Backfill any existing properties with empty address but populated address_jsonb
UPDATE public.properties
SET address = public.address_text_from_jsonb(address_jsonb, unit)
WHERE (address IS NULL OR address = '')
AND address_jsonb IS NOT NULL;
