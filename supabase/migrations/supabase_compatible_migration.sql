-- SUPABASE SQL EDITOR COMPATIBLE MIGRATION
-- Copy and paste this into Supabase SQL Editor

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Update properties table
ALTER TABLE public.properties
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS property_type text,
  ADD COLUMN IF NOT EXISTS unit text,
  ADD COLUMN IF NOT EXISTS bedrooms integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bathrooms numeric(2,1) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS address_jsonb jsonb;

ALTER TABLE public.properties
  ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Add constraint (will skip if exists)
ALTER TABLE public.properties
  ADD CONSTRAINT check_property_type
  CHECK (property_type IN ('apartment','house','condo','townhouse'));

-- Migrate existing data
UPDATE public.properties
SET address_jsonb = jsonb_build_object(
  'line1', address,
  'line2', '',
  'city', '',
  'state', '',
  'zipCode', '',
  'country', 'US'
)
WHERE address_jsonb IS NULL AND address IS NOT NULL;

UPDATE public.properties
SET user_id = landlord_id
WHERE user_id IS NULL AND landlord_id IS NOT NULL;

-- Create property_areas table
CREATE TABLE IF NOT EXISTS public.property_areas (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  area_type text NOT NULL,
  icon_name text,
  is_default boolean DEFAULT false,
  photos text[],
  inventory_complete boolean DEFAULT false,
  condition text DEFAULT 'good',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add area condition constraint (will skip if exists)
ALTER TABLE public.property_areas
  ADD CONSTRAINT check_area_condition
  CHECK (condition IN ('excellent','good','fair','poor'));

-- Create property_assets table
CREATE TABLE IF NOT EXISTS public.property_assets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  area_id uuid NOT NULL REFERENCES public.property_areas(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  name text NOT NULL,
  asset_type text NOT NULL,
  category text NOT NULL,
  subcategory text,
  brand text,
  model text,
  serial_number text,
  condition text DEFAULT 'good',
  installation_date date,
  warranty_start_date date,
  warranty_end_date date,
  warranty_provider text,
  photos text[],
  manual_url text,
  notes text,
  purchase_price numeric(10,2),
  current_value numeric(10,2),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add asset condition constraint (will skip if exists)
ALTER TABLE public.property_assets
  ADD CONSTRAINT check_asset_condition
  CHECK (condition IN ('excellent','good','fair','poor','needs_replacement'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON public.properties(user_id);
CREATE INDEX IF NOT EXISTS idx_property_areas_property_id ON public.property_areas(property_id);
CREATE INDEX IF NOT EXISTS idx_property_assets_area_id ON public.property_assets(area_id);
CREATE INDEX IF NOT EXISTS idx_property_assets_property_id ON public.property_assets(property_id);
CREATE INDEX IF NOT EXISTS idx_property_assets_condition ON public.property_assets(condition);
CREATE INDEX IF NOT EXISTS idx_property_assets_warranty_end ON public.property_assets(warranty_end_date);

-- Enable RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_assets ENABLE ROW LEVEL SECURITY;

-- Properties RLS policies
DROP POLICY IF EXISTS properties_select_own ON public.properties;
CREATE POLICY properties_select_own ON public.properties 
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS properties_insert_own ON public.properties;
CREATE POLICY properties_insert_own ON public.properties 
  FOR INSERT WITH CHECK (auth.uid() = COALESCE(user_id, auth.uid()));

DROP POLICY IF EXISTS properties_update_own ON public.properties;
CREATE POLICY properties_update_own ON public.properties 
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS properties_delete_own ON public.properties;
CREATE POLICY properties_delete_own ON public.properties 
  FOR DELETE USING (auth.uid() = user_id);

-- Property areas RLS policies
DROP POLICY IF EXISTS property_areas_select_own ON public.property_areas;
CREATE POLICY property_areas_select_own ON public.property_areas 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_areas.property_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS property_areas_crud_own ON public.property_areas;
CREATE POLICY property_areas_crud_own ON public.property_areas 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_areas.property_id AND p.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_areas.property_id AND p.user_id = auth.uid())
  );

-- Property assets RLS policies
DROP POLICY IF EXISTS property_assets_select_own ON public.property_assets;
CREATE POLICY property_assets_select_own ON public.property_assets 
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_assets.property_id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS property_assets_crud_own ON public.property_assets;
CREATE POLICY property_assets_crud_own ON public.property_assets 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_assets.property_id AND p.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.properties p WHERE p.id = property_assets.property_id AND p.user_id = auth.uid())
  );

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

-- Create triggers
DROP TRIGGER IF EXISTS trg_properties_updated_at ON public.properties;
CREATE TRIGGER trg_properties_updated_at 
  BEFORE UPDATE ON public.properties 
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_property_areas_updated_at ON public.property_areas;
CREATE TRIGGER trg_property_areas_updated_at 
  BEFORE UPDATE ON public.property_areas 
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_property_assets_updated_at ON public.property_assets;
CREATE TRIGGER trg_property_assets_updated_at 
  BEFORE UPDATE ON public.property_assets 
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();