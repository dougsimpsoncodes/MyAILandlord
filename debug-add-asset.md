# Debug: Add Asset Not Saving

## Problem
When clicking "Add Asset" button on AddAssetScreen, nothing happens. No success alert, no error alert, no navigation.

## Environment
- React Native / Expo web app
- Supabase database with RLS enabled
- Authentication via Supabase Auth

## Console Output (from browser)
```
📦 ===== handleSave CALLED =====
📦 State values:
📦   propertyId: 5648caf8-c3e8-4094-af77-d0fe223e7cb3
📦   draftId: undefined
📦   areaId: 4974bcd9-dc5b-4ea2-b5f6-7f4301450a77
📦   isParamsLoaded: true
📦   assetName: Fridge
📦 All validations passed, starting save...
📦 Created asset object: {
  "id": "asset_1765465096459",
  "areaId": "4974bcd9-dc5b-4ea2-b5f6-7f4301450a77",
  "name": "Fridge",
  "assetType": "other",
  "category": "Other",
  "condition": "good",
  "photos": ["blob:..."],
  "isActive": true
}
📦 MODE: EXISTING PROPERTY - saving to database
📦 Calling propertyAreasService.addAsset with propertyId: 5648caf8-c3e8-4094-af77-d0fe223e7cb3
📦 ===== handleSave COMPLETE =====
```

**Missing logs between "Calling propertyAreasService.addAsset" and "handleSave COMPLETE":**
- No "Asset saved to database successfully"
- No "DATABASE ERROR"
- No error caught at all

## Database Schema (from migration file)
```sql
CREATE TABLE IF NOT EXISTS property_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    area_id UUID NOT NULL REFERENCES property_areas(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('appliance', 'fixture', 'system', 'structure', 'furniture', 'other')),
    category TEXT NOT NULL,
    -- ... other columns
);

-- RLS Policy
CREATE POLICY "Users can insert assets for their properties" ON property_assets
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM properties
            WHERE properties.id = property_assets.property_id
            AND properties.user_id = auth.uid()
        )
    );
```

## Relevant Code

### AddAssetScreen.tsx - handleSave function
```typescript
const handleSave = async () => {
  // ... validation passes ...

  if (propertyId) {
    console.log('📦 MODE: EXISTING PROPERTY - saving to database');
    console.log('📦 Calling propertyAreasService.addAsset with propertyId:', propertyId);
    try {
      const savedAsset = await propertyAreasService.addAsset(propertyId, newAsset);
      console.log('📦 Asset saved to database successfully:', savedAsset);
      Alert.alert('Success', 'Asset added successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (dbError: any) {
      console.error('📦 DATABASE ERROR:', dbError);
      Alert.alert('Database Error', `Failed to save: ${dbError?.message}`);
    }
    return;
  }
  // ...
};
```

### propertyAreasService.ts - addAsset function
```typescript
async addAsset(propertyId: string, asset: InventoryItem): Promise<InventoryItem> {
  try {
    const dbAsset = appAssetToDbAsset(asset, propertyId);
    const { data, error } = await supabase
      .from('property_assets')
      .insert(dbAsset)
      .select()
      .single();

    if (error) {
      log.error('Failed to add asset', { propertyId, error: error.message });
      throw error;
    }

    return dbAssetToAppAsset(data as DbPropertyAsset);
  } catch (error) {
    log.error('Error in addAsset', { error: String(error) });
    throw error;
  }
}
```

### appAssetToDbAsset function (recently modified)
```typescript
function appAssetToDbAsset(asset: InventoryItem, propertyId: string): Omit<DbPropertyAsset, 'id' | 'created_at' | 'updated_at'> {
  return {
    // id removed - let database generate UUID
    area_id: asset.areaId,
    property_id: propertyId,
    name: asset.name,
    asset_type: asset.assetType,
    category: asset.category,
    // ... other fields
  };
}
```

## Key Questions
1. Why does the await not wait for the Promise to resolve/reject?
2. Why is no error being caught despite the inner try-catch?
3. Is Supabase returning something unusual that bypasses normal Promise behavior?
4. Could RLS be silently failing without throwing?

## Things Already Tried
1. Added extensive console.log debugging
2. Wrapped database call in separate try-catch
3. Fixed asset ID from string to letting DB generate UUID
4. Verified propertyId and areaId are valid UUIDs from database

## Files to Check
- `/src/screens/landlord/AddAssetScreen.tsx`
- `/src/services/supabase/propertyAreasService.ts`
- `/supabase/migrations/20250816_fix_property_schema.sql`
