# Test Data Loading Instructions

Due to Row Level Security (RLS) policies in your Supabase database, the test data cannot be loaded directly from JavaScript using the anon key. Here are your options:

## Option 1: Use Supabase SQL Editor (Recommended)

1. Go to your Supabase dashboard: https://supabase.com/dashboard
2. Navigate to your project: `zxqhxjuwmkxevhkpqfzf`
3. Go to the SQL Editor tab
4. Copy and paste the contents of `scripts/load-test-data-with-rls-bypass.sql`
5. Click "Run" to execute the script

This will:
- Temporarily disable RLS
- Load test data for profiles, properties, tenant links, and maintenance requests
- Re-enable RLS
- Provide a summary of loaded data

## Option 2: Get Service Role Key

If you have access to your Supabase service role key:

1. Add it to your `.env` file:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```
2. Modify the script to use the service role key instead of anon key
3. Run the script with Node.js

## Option 3: Temporary RLS Disable (SQL Editor)

If you want to run the JavaScript script, you can temporarily disable RLS:

1. In Supabase SQL Editor, run:
   ```sql
   ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
   ALTER TABLE properties DISABLE ROW LEVEL SECURITY;
   ALTER TABLE tenant_property_links DISABLE ROW LEVEL SECURITY;
   ALTER TABLE maintenance_requests DISABLE ROW LEVEL SECURITY;
   ```

2. Run the JavaScript script:
   ```bash
   node scripts/load-real-test-data.js
   ```

3. Re-enable RLS in SQL Editor:
   ```sql
   ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
   ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
   ALTER TABLE tenant_property_links ENABLE ROW LEVEL SECURITY;
   ALTER TABLE maintenance_requests ENABLE ROW LEVEL SECURITY;
   ```

## Test Data Summary

The test data includes:

### Profiles (3 users):
- **Sarah Johnson** (tenant) - `tenant_sarah_001`
- **Michael Chen** (tenant) - `tenant_michael_002`  
- **John Smith** (landlord) - `landlord_john_001`

### Properties (2 properties):
- **Sunset Apartments Unit 4B** - 2bed/1bath apartment
- **Downtown Loft 12A** - 1bed/1bath apartment

### Tenant Links:
- Sarah Johnson → Sunset Apartments Unit 4B
- Michael Chen → Downtown Loft 12A

### Maintenance Requests (4 requests):
- Kitchen Faucet Leak (Sarah, medium priority, pending)
- Bathroom Exhaust Fan Noise (Sarah, low priority, pending)
- AC Not Cooling Properly (Sarah, high priority, in_progress)
- EMERGENCY: Sparking Outlet (Michael, urgent priority, in_progress)

## Verification

After loading the data, you can verify it was loaded correctly by checking your Supabase dashboard tables or running:

```sql
SELECT 'Profiles: ' || COUNT(*) FROM profiles WHERE clerk_user_id LIKE '%_00%';
SELECT 'Properties: ' || COUNT(*) FROM properties WHERE name LIKE '%Sunset%' OR name LIKE '%Downtown%';
SELECT 'Maintenance: ' || COUNT(*) FROM maintenance_requests WHERE title LIKE '%Faucet%' OR title LIKE '%Fan%' OR title LIKE '%AC%' OR title LIKE '%Outlet%';
```

All counts should return numbers greater than 0.

## Issues Fixed

1. ✅ **UUID Format**: Fixed invalid UUID formats in maintenance_requests
2. ✅ **Priority Values**: Changed 'emergency' to 'urgent' to match schema
3. ✅ **Status Values**: Changed 'resolved' to 'completed' to match schema
4. ✅ **Schema Compatibility**: Added missing user_role type definition
5. ✅ **RLS Bypass**: Created SQL script that temporarily disables RLS for data loading

## Security Note

⚠️ **IMPORTANT**: These scripts temporarily disable RLS for data loading. This should only be used in development/testing environments, never in production.