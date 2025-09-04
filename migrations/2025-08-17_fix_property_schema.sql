-- Migration to fix the property schema

BEGIN;

-- Disable RLS on the properties table to allow for schema changes
ALTER TABLE public.properties DISABLE ROW LEVEL SECURITY;

-- 1. Add new columns to the properties table
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS property_type TEXT CHECK (property_type IN ('apartment', 'house', 'condo', 'townhouse')),
ADD COLUMN IF NOT EXISTS unit TEXT,
ADD COLUMN IF NOT EXISTS bedrooms INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS bathrooms DECIMAL(2,1) DEFAULT 0;

-- 2. Add a temporary address_jsonb column
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS address_jsonb JSONB;

-- 3. Create a function to migrate address data from TEXT to JSONB
CREATE OR REPLACE FUNCTION migrate_address_to_jsonb()
RETURNS VOID AS $$
DECLARE
  prop RECORD;
BEGIN
  FOR prop IN SELECT id, address FROM public.properties LOOP
    UPDATE public.properties
    SET address_jsonb = jsonb_build_object('line1', prop.address, 'line2', '', 'city', '', 'state', '', 'zipCode', '')
    WHERE id = prop.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 4. Run the migration function
SELECT migrate_address_to_jsonb();

-- 5. Drop the old address column and rename the new one
ALTER TABLE public.properties
DROP COLUMN IF EXISTS address;
ALTER TABLE public.properties
RENAME COLUMN address_jsonb TO address;

-- 6. Add the user_id column
ALTER TABLE public.properties
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- 7. Backfill user_id from the profiles table
UPDATE public.properties p
SET user_id = (SELECT clerk_user_id FROM public.profiles pr WHERE pr.id = p.landlord_id);

-- 8. Drop the old landlord_id, description, and image_url columns
ALTER TABLE public.properties
DROP COLUMN IF EXISTS landlord_id,
DROP COLUMN IF EXISTS description,
DROP COLUMN IF EXISTS image_url;

-- 9. Create the property_areas table
CREATE TABLE IF NOT EXISTS public.property_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT, -- e.g., 'bedroom', 'kitchen', 'bathroom'
    photos TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Create the property_assets table
CREATE TABLE IF NOT EXISTS public.property_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    area_id UUID REFERENCES public.property_areas(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT, -- e.g., 'refrigerator', 'oven', 'dishwasher'
    condition TEXT, -- e.g., 'new', 'good', 'fair', 'poor'
    photos TEXT[],
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Update RLS policies
-- Drop existing policies first
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.properties;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.properties;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.properties;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.properties;

-- Create new policies
CREATE POLICY "Enable read access for authenticated users" ON public.properties
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.properties
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Enable update for users based on user_id" ON public.properties
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Enable delete for users based on user_id" ON public.properties
FOR DELETE USING (auth.uid() = user_id);

-- Enable RLS on the new tables
ALTER TABLE public.property_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users" ON public.property_areas
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.property_areas
FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.properties WHERE id = property_id));

CREATE POLICY "Enable read access for authenticated users" ON public.property_assets
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert for authenticated users" ON public.property_assets
FOR INSERT WITH CHECK (auth.uid() = (SELECT user_id FROM public.properties WHERE id = property_id));

-- Re-enable RLS on the properties table
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

COMMIT;
