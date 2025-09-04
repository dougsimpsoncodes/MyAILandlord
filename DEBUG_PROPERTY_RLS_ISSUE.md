# Property RLS Issue Debug Report

## Problem Description

The PropertyInviteAcceptScreen is failing to fetch property details when users access invite links. The screen loads correctly via deep linking, but cannot retrieve property information to display to users.

### Error Details
```
ERROR  Error fetching property: [Error: Property not found]
LOG  🔗 Extracted property ID from URL: 433fbcc9-b2ce-4870-8eef-bb52c273b60c
```

### Root Cause
The PropertyInviteAcceptScreen (lines 121-125) is attempting to query the `properties` table using an anonymous Supabase client:

```typescript
const { data, error } = await supabase
  .from('properties')
  .select('id, name, address, property_type')
  .eq('id', propertyId)
  .single();
```

However, Row Level Security (RLS) policies on the `properties` table are blocking anonymous access, causing the query to fail with "Property not found" errors.

## Current Flow
1. User clicks invite link: `exp://192.168.0.14:8081/--/invite?property=433fbcc9-b2ce-4870-8eef-bb52c273b60c`
2. Deep linking works ✓ - PropertyInviteAcceptScreen loads
3. Property ID extraction works ✓ - Correctly extracts `433fbcc9-b2ce-4870-8eef-bb52c273b60c`
4. Property details fetch fails ❌ - RLS blocks anonymous access

## Attempted Solutions

### Solution 1: Created Public Property View Migration
**File:** `/Users/dougsimpson/Projects/MyAILandlord/supabase/migrations/20250904_create_public_property_view.sql`

```sql
CREATE OR REPLACE VIEW public_property_invite_info AS
SELECT 
  id,
  name,
  address,
  property_type,
  created_at
FROM properties;

ALTER TABLE public_property_invite_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous property invite preview" ON public_property_invite_info
FOR SELECT 
TO anon
USING (true);
```

**Status:** Created but not applied - Docker/Supabase CLI issues

### Solution 2: Attempted Database Connection
**Command Tried:** `psql "$DATABASE_URL" -f create-public-property-view.sql`
**Outcome:** Failed - no local PostgreSQL server running

**Command Tried:** `npx supabase db reset`
**Outcome:** Failed - Docker daemon not running

### Solution 3: Attempted Supabase Specialist Agent
**Action:** Called supabase-specialist agent to handle RLS migration and code updates
**Outcome:** Agent call interrupted/failed

## Required Actions

### 1. Apply Database Migration
The migration file exists and needs to be applied to create the public view:
- File: `/Users/dougsimpson/Projects/MyAILandlord/supabase/migrations/20250904_create_public_property_view.sql`
- Purpose: Create `public_property_invite_info` view with anonymous SELECT access

### 2. Update Application Code
File: `/Users/dougsimpson/Projects/MyAILandlord/src/screens/tenant/PropertyInviteAcceptScreen.tsx`

**Current code (lines 121-125):**
```typescript
const { data, error } = await supabase
  .from('properties')
  .select('id, name, address, property_type')
  .eq('id', propertyId)
  .single();
```

**Needed change:**
```typescript
const { data, error } = await supabase
  .from('public_property_invite_info')
  .select('id, name, address, property_type')
  .eq('id', propertyId)
  .single();
```

### 3. Test Anonymous Access
After applying migration and code changes, verify:
- Anonymous users can query `public_property_invite_info` view
- PropertyInviteAcceptScreen displays property details correctly
- No security vulnerabilities introduced

## Technical Context

### Environment
- React Native with Expo
- Supabase backend with RLS enabled
- Clerk authentication
- Property ID being tested: `433fbcc9-b2ce-4870-8eef-bb52c273b60c`

### Security Considerations
The public view approach is production-safe because:
- Only exposes basic property info (id, name, address, property_type, created_at)
- No sensitive data like landlord info, tenant details, or internal IDs
- Follows principle of least privilege for invite previews

### Current Status
- Deep linking: ✅ Working
- Property ID extraction: ✅ Working  
- Property details fetch: ❌ Blocked by RLS
- Migration file: ✅ Ready but not applied
- Code fix: ✅ Identified but not implemented

## Next Steps
1. Apply the migration to create the public view
2. Update PropertyInviteAcceptScreen to use the public view
3. Test the complete invite flow end-to-end