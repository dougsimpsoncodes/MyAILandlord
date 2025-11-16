# Seed Data Guide for E2E Testing
**Creating sample data for dashboard and workflow tests**

## Overview

Some E2E tests require sample data to properly test features like:
- Maintenance dashboard (viewing requests)
- Filtering and sorting
- Property management
- Request workflows

This guide helps you create that test data.

## Prerequisites

- ✅ Test users created (see TEST_USER_SETUP_GUIDE.md)
- ✅ Test users have selected roles (landlord/tenant)
- ✅ Access to Supabase Dashboard

## Quick Method: Via Supabase Dashboard

### Step 1: Get Clerk User IDs

1. **Open Clerk Dashboard:**
   - Go to https://dashboard.clerk.com
   - Navigate to Users
   - Click on `test-landlord@myailandlord.com`
   - **Copy the User ID** (starts with `user_...`)
   - Do the same for `test-tenant@myailandlord.com`

2. **Find Profile IDs in Supabase:**
   - Go to https://app.supabase.com
   - Select your project
   - Go to SQL Editor
   - Run this query:

```sql
SELECT
  id as profile_id,
  clerk_user_id,
  email,
  role
FROM profiles
WHERE email IN (
  'test-landlord@myailandlord.com',
  'test-tenant@myailandlord.com'
);
```

   - **Copy both profile_id values**

### Step 2: Run Seed Script

1. **Update the seed script:**
   - Open `scripts/seed-test-data.sql`
   - Replace these lines (near line 35):

```sql
DECLARE
  landlord_clerk_id TEXT := 'REPLACE_WITH_LANDLORD_CLERK_USER_ID';
  tenant_clerk_id TEXT := 'REPLACE_WITH_TENANT_CLERK_USER_ID';
```

   - With your actual Clerk user IDs:

```sql
DECLARE
  landlord_clerk_id TEXT := 'user_2abc123...'; -- Your landlord's clerk_user_id
  tenant_clerk_id TEXT := 'user_2def456...';   -- Your tenant's clerk_user_id
```

2. **Run the script:**
   - In Supabase SQL Editor
   - Copy the entire content of `scripts/seed-test-data.sql`
   - Paste and click "Run"

3. **Verify success:**
   - You should see:
     ```
     Test data seeded successfully!
     Properties created: 2
     Maintenance requests created: 8
       - Pending: 3
       - In Progress: 2
       - Resolved: 3
     ```

### Step 3: Verify Data

Check that data was created:

```sql
-- Check properties
SELECT * FROM properties
WHERE landlord_id IN (
  SELECT id FROM profiles WHERE email = 'test-landlord@myailandlord.com'
);

-- Check maintenance requests
SELECT
  mr.title,
  mr.status,
  mr.priority,
  p.name as property_name
FROM maintenance_requests mr
JOIN properties p ON mr.property_id = p.id
WHERE mr.landlord_id IN (
  SELECT id FROM profiles WHERE email = 'test-landlord@myailandlord.com'
);
```

Expected results:
- 2 properties
- 8 maintenance requests (3 pending, 2 in progress, 3 resolved)

## Alternative: Manual Data Entry

If you prefer to create data manually:

### Create Property

```sql
INSERT INTO properties (
  id,
  landlord_id,
  name,
  address,
  city,
  state,
  zip_code,
  property_type,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM profiles WHERE email = 'test-landlord@myailandlord.com'),
  'Test Property',
  '123 Main St',
  'San Francisco',
  'CA',
  '94102',
  'house',
  NOW(),
  NOW()
);
```

### Create Maintenance Request

```sql
INSERT INTO maintenance_requests (
  id,
  property_id,
  tenant_id,
  landlord_id,
  title,
  description,
  status,
  priority,
  category,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  (SELECT id FROM properties WHERE name = 'Test Property' LIMIT 1),
  (SELECT id FROM profiles WHERE email = 'test-tenant@myailandlord.com'),
  (SELECT id FROM profiles WHERE email = 'test-landlord@myailandlord.com'),
  'Test Request',
  'This is a test maintenance request for E2E testing',
  'pending',
  'medium',
  'general',
  NOW(),
  NOW()
);
```

## What Data Gets Created

The seed script creates:

### Properties (2)
1. **Test Property 1**
   - Address: 123 Main St, San Francisco, CA 94102
   - Type: House

2. **Test Apartment Complex**
   - Address: 456 Oak Ave, Oakland, CA 94601
   - Type: Apartment

### Maintenance Requests (8)

**Pending (3):**
1. Leaky Faucet in Kitchen (Medium priority)
2. Broken Window in Bedroom (High priority)
3. HVAC Not Heating (Urgent priority)

**In Progress (2):**
1. Dishwasher Not Draining (Medium priority)
2. Garage Door Stuck (High priority)

**Resolved (3):**
1. Light Bulb Replacement (Low priority)
2. Clogged Sink (Medium priority)
3. Smoke Detector Beeping (High priority)

## Testing With Seed Data

After seeding data, tests can:

1. **Dashboard Tests:**
   - See maintenance requests listed
   - Filter by status (All, Pending, In Progress, Resolved)
   - View request counts in stat cards

2. **Workflow Tests:**
   - Click on requests to view details
   - Update request status
   - Add notes or photos

3. **Filter/Sort Tests:**
   - Sort by date, priority, status
   - Search by title or description

## Cleaning Up Test Data

To remove all test data:

```sql
-- Delete maintenance requests
DELETE FROM maintenance_requests
WHERE landlord_id IN (
  SELECT id FROM profiles
  WHERE email = 'test-landlord@myailandlord.com'
);

-- Delete properties
DELETE FROM properties
WHERE landlord_id IN (
  SELECT id FROM profiles
  WHERE email = 'test-landlord@myailandlord.com'
);
```

## Re-seeding Data

If tests modify data and you want fresh data:

1. Run cleanup script above
2. Run seed script again

Or use this combined script:

```sql
-- Clean and re-seed in one go
DO $$
DECLARE
  landlord_id UUID;
BEGIN
  -- Get landlord profile ID
  SELECT id INTO landlord_id
  FROM profiles
  WHERE email = 'test-landlord@myailandlord.com';

  -- Clean up old data
  DELETE FROM maintenance_requests WHERE landlord_id = landlord_id;
  DELETE FROM properties WHERE landlord_id = landlord_id;

  -- Re-seed (paste seed script here)

END $$;
```

## Troubleshooting

### Issue: "Profile not found"

**Cause:** Test user hasn't completed onboarding

**Solution:**
1. Log into app as test-landlord@myailandlord.com
2. Complete role selection
3. Verify profile exists in Supabase

### Issue: "Foreign key constraint violation"

**Cause:** Profile IDs don't match

**Solution:**
1. Re-run the query in Step 1 to get correct IDs
2. Update seed script with actual values
3. Run seed script again

### Issue: "Permission denied"

**Cause:** RLS policies blocking insert

**Solution:**
This shouldn't happen with SQL Editor (bypasses RLS), but if it does:
1. Check you're running in SQL Editor (not via app)
2. Verify you're using Supabase service role
3. Check RLS policies allow inserts for these tables

## Expected Test Impact

**Before seed data:**
- Dashboard tests: 0/11 passing
- Filter tests: 0/3 passing
- Workflow tests: 2/8 passing

**After seed data:**
- Dashboard tests: 8-10/11 passing
- Filter tests: 3/3 passing
- Workflow tests: 6-8/8 passing

**Overall improvement:** +15-20% pass rate

## Quick Reference

```bash
# After seeding data, run tests:
npm run test:e2e:maintenance

# Or full suite:
npm run test:e2e:full

# View results:
npx playwright show-report
```

---

**Created:** 2025-11-14
**Last Updated:** 2025-11-14
**Next:** Create test users → Seed data → Run tests!
