# RLS Self-Test Guide

## Step 1: Run Hardened Migration

Copy and paste this entire block into Supabase SQL Editor and execute:

```sql
-- [The hardened_schema_migration.sql content goes here]
-- See: supabase/migrations/hardened_schema_migration.sql
```

## Step 2: Quick RLS Self-Test

Replace `<UID>` with a real auth.users.id from your Clerk authentication:

```sql
-- Set test user context (replace <UID> with real user ID)
select set_config('request.jwt.claims', json_build_object('sub','<UID>')::text, true);

-- Test RLS policies
select count(*) from public.properties where user_id = auth.uid();
select count(*) from public.property_areas a join public.properties p on p.id=a.property_id and p.user_id=auth.uid();
select count(*) from public.property_assets s join public.properties p on p.id=s.property_id and p.user_id=auth.uid();
```

## Step 3: Find Your User ID

To get your Clerk user ID for testing:

### Option A: From App Console
1. Open browser dev tools
2. Go to your app and log in
3. Check console for user object containing `id`

### Option B: From Supabase Auth
```sql
-- See all authenticated users
select * from auth.users limit 10;
```

### Option C: From Profiles Table
```sql
-- See profile mappings
select clerk_user_id, email from public.profiles;
```

## Step 4: Test Property Creation

After migration:
1. Go to your app
2. Navigate to Add Property flow
3. Fill out property details
4. Click "Add Property" button
5. Should succeed without column errors

## Expected Results

### Before Migration:
- ❌ "Could not find the 'bathrooms' column"
- ❌ "Could not find the 'bedrooms' column" 
- ❌ Property submission fails

### After Migration:
- ✅ Property saves successfully
- ✅ All fields (bedrooms, bathrooms, property_type, etc.) work
- ✅ User can only see their own properties
- ✅ RLS properly isolates user data

## Troubleshooting

### If Insert Fails:
1. Check user is authenticated (not anonymous)
2. Verify JWT contains valid `sub` claim
3. Ensure RLS policies allow insert for authenticated users

### If Select Returns 0:
1. User may not have any properties yet (normal)
2. Or user_id mismatch between properties and auth.uid()

### Common Issues:
- **Service Role Bypass**: Don't test with service role key, use actual user session
- **JWT Format**: Ensure Clerk JWT format matches Supabase expectations
- **Column Names**: Old queries may reference `address` instead of `address_jsonb`

## Migration Safety

This migration is idempotent and safe to re-run:
- Uses `IF NOT EXISTS` for all schema changes
- Preserves existing data in original columns
- Adds new columns alongside old ones
- No data loss during transition