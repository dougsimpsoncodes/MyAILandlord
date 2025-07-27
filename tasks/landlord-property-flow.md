# Landlord Property Setup Flow

## Overview
Create a comprehensive property setup system that allows landlords to inventory their properties with detailed area and asset information, enabling intelligent maintenance request routing and AI-powered support.

## User Flow Design

### 1. Property Creation Entry Points
- **From Property Management screen**: "Add New Property" button
- **From empty state**: When landlord has no properties
- **From home screen**: Quick action if no properties exist

### 2. Property Setup Wizard (Multi-Step)

#### Step 1: Basic Property Info
- Property name/address
- Property type (apartment, house, condo, etc.)
- Unit number (if applicable)
- Property photos (exterior, interior overview)
- Basic details (bedrooms, bathrooms, sq ft)

#### Step 2: Area Inventory
- Pre-populated common areas based on property type:
  - Kitchen
  - Living Room
  - Master Bedroom
  - Bathroom(s)
  - Laundry Room
  - Garage/Parking
  - Outdoor/Patio
- Ability to add custom areas
- Photo upload for each area

#### Step 3: Asset Inventory by Area
For each area, landlord can add:
- **Kitchen**: Refrigerator, stove, oven, dishwasher, garbage disposal, faucet, cabinets
- **Bathroom**: Toilet, shower, bathtub, sink, faucet, exhaust fan
- **Living/Bedrooms**: HVAC vents, windows, doors, ceiling fans, outlets
- **Laundry**: Washer, dryer, utility sink
- **General**: Flooring, lighting, walls, outlets

#### Step 4: Asset Details
For each asset:
- Brand/model (optional)
- Installation date/age
- Warranty info
- Maintenance notes
- Photos

#### Step 5: Tenant Assignment (Optional)
- Add tenant contact info
- Send property access invitation
- Set move-in date

## Technical Implementation

### Database Schema Extensions
```sql
-- Properties table (already exists, may need updates)
properties (
  id, landlord_id, name, address, type, 
  bedrooms, bathrooms, sq_ft, photos, created_at
)

-- New tables needed:
property_areas (
  id, property_id, name, area_type, photos, created_at
)

property_assets (
  id, property_area_id, name, asset_type, brand, model, 
  installation_date, warranty_info, notes, photos, created_at
)
```

### UI Components Needed
1. **Property Setup Wizard**: Multi-step form component
2. **Area Manager**: Add/edit areas with photos
3. **Asset Inventory**: Asset list with quick-add templates
4. **Photo Upload**: Camera/gallery integration
5. **Progress Indicator**: Show completion status

## Benefits for Maintenance Requests

### For Tenants
- **Smart Dropdowns**: Area/asset selections populated from property inventory
- **Accurate Reporting**: Easier to specify exact location and asset
- **Visual References**: Photos help identify correct items

### For Landlords  
- **Complete Context**: Know exactly what asset needs attention
- **Maintenance History**: Track repairs per specific asset
- **Vendor Coordination**: Provide detailed asset info to contractors
- **Preventive Maintenance**: Schedule based on asset age/type

### For AI Assistant
- **Better Analysis**: Understand specific property layout and assets
- **Intelligent Suggestions**: Recommend solutions based on asset type/age
- **Contextual Help**: Provide asset-specific troubleshooting

## Implementation Priority

### Phase 1 (MVP)
1. Basic property creation form
2. Simple area selection (kitchen, bathroom, bedroom, living room)
3. Basic asset inventory (major appliances and fixtures)
4. Photo upload capability

### Phase 2 (Enhanced)
1. Custom area creation
2. Detailed asset information (brand, model, warranty)
3. Asset condition tracking
4. Maintenance scheduling

### Phase 3 (Advanced)
1. QR code generation for assets
2. Maintenance history per asset
3. Preventive maintenance alerts
4. Integration with vendor management

## Next Steps
1. Create property setup wizard screens
2. Implement area and asset management
3. Update maintenance request flow to use property inventory
4. Test complete landlord-to-tenant workflow