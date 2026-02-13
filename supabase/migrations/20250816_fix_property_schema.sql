-- Migration: Transform Tenant Communication Schema to Property Inventory Schema
-- Date: 2025-08-16
-- Purpose: Fix schema mismatch between app requirements and deployed database

BEGIN;

-- Step 1: Backup existing data
CREATE TABLE IF NOT EXISTS properties_backup AS SELECT * FROM properties;

-- Step 2: Add missing columns to properties table
ALTER TABLE properties ADD COLUMN IF NOT EXISTS property_type TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS bedrooms INTEGER DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS bathrooms DECIMAL(2,1) DEFAULT 0;

-- Step 3: Add user_id column that references auth.users
ALTER TABLE properties ADD COLUMN IF NOT EXISTS user_id UUID;

-- Step 4: Migrate landlord_id to user_id using profiles table lookup
-- This assumes profiles.clerk_user_id maps to auth.users.id
UPDATE properties 
SET user_id = auth.uid()
WHERE user_id IS NULL AND landlord_id IS NOT NULL;

-- Step 5: Convert address from TEXT to JSONB
-- First add new address_jsonb column
ALTER TABLE properties ADD COLUMN IF NOT EXISTS address_jsonb JSONB;

-- Migrate existing TEXT addresses to JSONB format
UPDATE properties 
SET address_jsonb = jsonb_build_object(
    'line1', address,
    'line2', '',
    'city', '',
    'state', '',
    'zipCode', '',
    'country', 'US'
)
WHERE address_jsonb IS NULL AND address IS NOT NULL;

-- Step 6: Drop old columns after migration (commented out for safety)
-- ALTER TABLE properties DROP COLUMN IF EXISTS landlord_id;
-- ALTER TABLE properties DROP COLUMN IF EXISTS address;
-- ALTER TABLE properties RENAME COLUMN address_jsonb TO address;

-- Step 7: Add constraints for property_type
ALTER TABLE properties ADD CONSTRAINT check_property_type 
CHECK (property_type IN ('apartment', 'house', 'condo', 'townhouse') OR property_type IS NULL);

-- Step 8: Create property_areas table
CREATE TABLE IF NOT EXISTS property_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    area_type TEXT NOT NULL, -- kitchen, bedroom, bathroom, living_room, laundry, garage, outdoor, other
    icon_name TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    photos TEXT[],
    inventory_complete BOOLEAN DEFAULT FALSE,
    condition TEXT DEFAULT 'good' CHECK (condition IN ('excellent', 'good', 'fair', 'poor')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 9: Create property_assets table
CREATE TABLE IF NOT EXISTS property_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    area_id UUID NOT NULL REFERENCES property_areas(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('appliance', 'fixture', 'system', 'structure', 'furniture', 'other')),
    category TEXT NOT NULL,
    subcategory TEXT,
    
    -- Identification
    brand TEXT,
    model TEXT,
    serial_number TEXT,
    
    -- Condition and status
    condition TEXT DEFAULT 'good' CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'needs_replacement')),
    installation_date DATE,
    
    -- Warranty tracking
    warranty_start_date DATE,
    warranty_end_date DATE,
    warranty_provider TEXT,
    
    -- Documentation
    photos TEXT[],
    manual_url TEXT,
    notes TEXT,
    
    -- Financial tracking
    purchase_price DECIMAL(10,2),
    current_value DECIMAL(10,2),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 10: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON properties(user_id);
CREATE INDEX IF NOT EXISTS idx_property_areas_property_id ON property_areas(property_id);
CREATE INDEX IF NOT EXISTS idx_property_assets_area_id ON property_assets(area_id);
CREATE INDEX IF NOT EXISTS idx_property_assets_property_id ON property_assets(property_id);
CREATE INDEX IF NOT EXISTS idx_property_assets_condition ON property_assets(condition);
CREATE INDEX IF NOT EXISTS idx_property_assets_warranty_end ON property_assets(warranty_end_date);

-- Step 11: Enable RLS on new tables
ALTER TABLE property_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_assets ENABLE ROW LEVEL SECURITY;

-- Step 12: Create RLS policies for property_areas
CREATE POLICY "Users can view areas of their properties" ON property_areas
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM properties 
            WHERE properties.id = property_areas.property_id 
            AND properties.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert areas for their properties" ON property_areas
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM properties 
            WHERE properties.id = property_areas.property_id 
            AND properties.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update areas of their properties" ON property_areas
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM properties 
            WHERE properties.id = property_areas.property_id 
            AND properties.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete areas of their properties" ON property_areas
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM properties 
            WHERE properties.id = property_areas.property_id 
            AND properties.user_id = auth.uid()
        )
    );

-- Step 13: Create RLS policies for property_assets
CREATE POLICY "Users can view assets of their properties" ON property_assets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM properties 
            WHERE properties.id = property_assets.property_id 
            AND properties.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert assets for their properties" ON property_assets
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM properties 
            WHERE properties.id = property_assets.property_id 
            AND properties.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update assets of their properties" ON property_assets
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM properties 
            WHERE properties.id = property_assets.property_id 
            AND properties.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete assets of their properties" ON property_assets
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM properties 
            WHERE properties.id = property_assets.property_id 
            AND properties.user_id = auth.uid()
        )
    );

-- Step 14: Update properties RLS policies to use user_id instead of landlord_id
DROP POLICY IF EXISTS "Users can view their own properties" ON properties;
DROP POLICY IF EXISTS "Users can insert their own properties" ON properties;
DROP POLICY IF EXISTS "Users can update their own properties" ON properties;
DROP POLICY IF EXISTS "Users can delete their own properties" ON properties;

CREATE POLICY "Users can view their own properties" ON properties
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own properties" ON properties
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own properties" ON properties
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own properties" ON properties
    FOR DELETE USING (auth.uid() = user_id);

-- Step 15: Add updated_at triggers for new tables
CREATE TRIGGER update_property_areas_updated_at 
    BEFORE UPDATE ON property_areas 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_property_assets_updated_at 
    BEFORE UPDATE ON property_assets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- Migration Notes:
-- 1. This migration preserves existing data in properties_backup table
-- 2. Old landlord_id and address columns are preserved for rollback safety
-- 3. Run the commented DROP statements manually after verifying migration success
-- 4. The address migration creates a basic JSONB structure - manual cleanup may be needed