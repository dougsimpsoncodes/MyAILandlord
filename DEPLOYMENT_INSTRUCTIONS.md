# Database Migration Deployment Instructions

## URGENT: Apply Schema Migration to Fix "Add Property" Button

The "Add Property" button fails because the database schema doesn't match the app requirements. Follow these steps to deploy the fix:

### Option 1: Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**
   - Visit https://supabase.com/dashboard
   - Navigate to your project: `My AI Landlord`
   - Go to SQL Editor

2. **Run the Migration**
   - Copy the entire contents of: `supabase/migrations/20250816_fix_property_schema.sql`
   - Paste into Supabase SQL Editor
   - Click "Run" to execute the migration

3. **Verify Migration Success**
   - Check that new columns exist in properties table:
     - `property_type`, `unit`, `bedrooms`, `bathrooms`, `user_id`, `address_jsonb`
   - Verify new tables exist:
     - `property_areas`, `property_assets`

### Option 2: Supabase CLI (If you have DB password)

```bash
# Set your database password when prompted
npx supabase db push
```

### What This Migration Does

1. **Adds Missing Columns** to properties table:
   - `property_type` (apartment, house, condo, townhouse)
   - `unit` (unit/apartment number)
   - `bedrooms` (integer)
   - `bathrooms` (decimal)
   - `user_id` (references auth.users)
   - `address_jsonb` (complex address structure)

2. **Creates New Tables**:
   - `property_areas` - Room/area definitions
   - `property_assets` - Asset inventory tracking

3. **Updates Security Policies**:
   - RLS policies for new tables
   - Updates properties policies to use `user_id`

4. **Preserves Existing Data**:
   - Creates `properties_backup` table
   - Keeps old columns for rollback safety

### After Migration

1. **Test Property Creation**:
   - Try adding a property through the app
   - The "Add Property" button should now work

2. **Verify Data**:
   - Check that existing properties are preserved
   - Confirm new properties save with all fields

### Rollback (If Needed)

If migration causes issues:
```sql
-- Restore from backup
DROP TABLE properties;
ALTER TABLE properties_backup RENAME TO properties;
```

### Next Steps After Migration

1. Test property creation end-to-end
2. Verify all property fields save correctly  
3. Check that property areas and assets work
4. Remove debug buttons from PropertyReviewScreen

## Support

If you encounter any issues:
1. Check Supabase logs for errors
2. Verify JWT authentication is working
3. Confirm all environment variables are set