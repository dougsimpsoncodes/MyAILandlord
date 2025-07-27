-- ================================
-- PROPERTY INVENTORY SYSTEM SCHEMA
-- ================================

-- Properties table (if not exists)
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address JSONB NOT NULL, -- Multi-field address structure
    property_type TEXT NOT NULL CHECK (property_type IN ('apartment', 'house', 'condo', 'townhouse')),
    unit TEXT,
    bedrooms INTEGER DEFAULT 0,
    bathrooms DECIMAL(2,1) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Property areas table
CREATE TABLE IF NOT EXISTS property_areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Property assets/inventory table
CREATE TABLE IF NOT EXISTS property_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_properties_user_id ON properties(user_id);
CREATE INDEX IF NOT EXISTS idx_property_areas_property_id ON property_areas(property_id);
CREATE INDEX IF NOT EXISTS idx_property_assets_area_id ON property_assets(area_id);
CREATE INDEX IF NOT EXISTS idx_property_assets_property_id ON property_assets(property_id);
CREATE INDEX IF NOT EXISTS idx_property_assets_condition ON property_assets(condition);
CREATE INDEX IF NOT EXISTS idx_property_assets_warranty_end ON property_assets(warranty_end_date);

-- Row Level Security Policies
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_assets ENABLE ROW LEVEL SECURITY;

-- Properties policies
CREATE POLICY "Users can view their own properties" ON properties
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own properties" ON properties
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own properties" ON properties
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own properties" ON properties
    FOR DELETE USING (auth.uid() = user_id);

-- Property areas policies
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

-- Property assets policies
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

-- Temporary development settings
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
-- Re-enable after initial user setup: ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;