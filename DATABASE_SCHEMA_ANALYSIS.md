# Database Schema Analysis Report

## Critical Issue Identified: Schema Mismatch

### Problem Summary
The app expects a **Property Inventory System** schema but the database has a **Tenant Communication System** schema deployed. This causes property submission failures.

### App Requirements vs Deployed Schema

#### App Expects (PropertyData interface + supabase-dev-setup.sql)
```sql
CREATE TABLE properties (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),  -- Direct auth reference
    name TEXT NOT NULL,
    address JSONB NOT NULL,  -- Complex address: {line1, line2, city, state, zipCode}
    property_type TEXT NOT NULL CHECK (property_type IN ('apartment', 'house', 'condo', 'townhouse')),
    unit TEXT,
    bedrooms INTEGER DEFAULT 0,
    bathrooms DECIMAL(2,1) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Currently Deployed (supabase-schema.sql)
```sql
CREATE TABLE properties (
    id UUID PRIMARY KEY,
    landlord_id UUID REFERENCES profiles(id),  -- References profiles table
    name TEXT NOT NULL,
    address TEXT NOT NULL,  -- Simple text, not JSONB
    description TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Missing Fields in Deployed Schema
1. `property_type` - Property category (apartment, house, etc.)
2. `unit` - Unit/apartment number
3. `bedrooms` - Number of bedrooms (INTEGER)
4. `bathrooms` - Number of bathrooms (DECIMAL)
5. `address` structure - Currently TEXT instead of JSONB
6. `user_id` vs `landlord_id` - Different foreign key relationship

### Supporting Tables Missing
The app also expects these tables that are missing:
- `property_areas` - Room/area definitions with photos and inventory status
- `property_assets` - Detailed asset inventory with condition tracking

### Error Evidence
Property submission fails with errors like:
- `Could not find the 'bathrooms' column`
- `Could not find the 'bedrooms' column`
- `Could not find the 'property_type' column`

### Recommendation
**IMMEDIATE ACTION REQUIRED:** Deploy the correct property inventory schema to fix the Add Property functionality.

Two schemas exist in the codebase:
1. `supabase-schema.sql` - Tenant communication (currently deployed)
2. `supabase-dev-setup.sql` - Property inventory (needed by app)

### Next Steps
1. Create migration to transform current schema
2. Add missing columns to properties table
3. Create property_areas and property_assets tables
4. Update RLS policies for new schema
5. Test property creation end-to-end