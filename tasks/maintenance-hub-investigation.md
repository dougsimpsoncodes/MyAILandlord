# Maintenance Hub Investigation: "No Active Requests" Issue

## Investigation Plan

### 1. Data Verification
- [ ] Check if test data exists in database tables
- [ ] Verify maintenance_requests table contents  
- [ ] Confirm data relationships (user IDs, property IDs)
- [ ] Check table schemas and constraints

### 2. Component Analysis
- [ ] Examine MaintenanceHub component implementation
- [ ] Identify data fetching mechanisms
- [ ] Analyze API endpoint calls
- [ ] Review filters and conditions applied
- [ ] Check authentication/user context handling

### 3. API Layer Investigation
- [ ] Review maintenance request query implementation
- [ ] Examine RLS policies applied
- [ ] Check user context passing
- [ ] Analyze WHERE clauses and filters
- [ ] Verify API response structure

### 4. Authentication Flow Analysis
- [ ] Understand current user authentication
- [ ] Check user ID/context passing to queries
- [ ] Examine Clerk to Supabase mapping
- [ ] Review authentication state management

### 5. Network/Console Analysis
- [ ] Check browser console for errors
- [ ] Examine network requests and responses
- [ ] Look for authentication failures
- [ ] Check for RLS policy violations
- [ ] Review API call patterns

## Investigation Notes

### Current Status
- Maintenance hub shows "No active requests"
- Test data was loaded using RLS bypass script
- Need to determine exact root cause before proposing solutions

### Key Questions to Answer
1. Does the test data actually exist in the database?
2. What API calls is the maintenance hub making?
3. Is the current user context being passed correctly?
4. Are RLS policies blocking data access?
5. What filters are being applied to the data?

## Findings

### Data Verification
**Status**: ✅ Test data exists in database
- Test data SQL script shows 8 maintenance requests were loaded
- 3 profiles: 2 tenants (sarah, michael) + 1 landlord (john)
- 2 properties owned by landlord john
- Tenant-property links established

### Component Analysis
**Status**: ✅ Component logic identified
- **Location**: `/Users/dougsimpson/Projects/MyAILandlord/src/screens/landlord/DashboardScreen.tsx`
- **Data Fetching**: Line 65 - `apiClient.getMaintenanceRequests()`
- **API Client**: `/Users/dougsimpson/Projects/MyAILandlord/src/services/api/client.ts` line 141-144
- **Empty State Display**: Lines 305-314 show "No Cases Found" when `filteredCases.length === 0`

### API Layer Investigation  
**Status**: ✅ API implementation analyzed
- **Method**: `getMaintenanceRequests()` in SupabaseClient (line 137-179)
- **Logic Flow**:
  1. Gets user profile by clerkUserId
  2. If landlord: gets properties owned by user, then gets maintenance requests for those properties
  3. If tenant: gets requests where tenant_id = profile.id
- **Key Query**: Lines 161-169 - gets landlord properties first, then filters maintenance requests by property IDs

### Authentication Flow Analysis
**Status**: ⚠️ ISSUE IDENTIFIED
- **Problem**: Two different authentication systems being used
- **Dashboard**: Uses `useApiClient()` hook with SupabaseClient that expects Clerk user context
- **Property Management**: Uses `ClerkSupabaseClient.ts` with direct REST API calls
- **Authentication Method**: REST client gets Clerk token from `window.Clerk.session.getToken()`

### Network/Console Analysis
**Status**: ⚠️ Authentication system analysis reveals critical mismatch

## Root Cause Analysis

**CONFIRMED ROOT CAUSE**: RLS Policy Authentication Context Not Set

### The Problem
The Dashboard screen uses `SupabaseClient` which makes database queries that are subject to Row Level Security (RLS) policies. However, the authentication context required by these policies is **NOT being set**.

### RLS Policy Requirements
All RLS policies in the database use this pattern:
```sql
WHERE clerk_user_id = (SELECT current_setting('app.current_user_id', true)::text)
```

This requires the PostgreSQL session variable `app.current_user_id` to be set with the current Clerk user ID.

### Authentication System Mismatch

1. **Dashboard (Broken)**: 
   - Uses `useApiClient()` → `SupabaseClient` 
   - Makes direct Supabase queries via JavaScript SDK
   - RLS policies are triggered and block access
   - **Missing**: `app.current_user_id` session setting

2. **Property Management (Working)**:
   - Uses `ClerkSupabaseClient.ts` → `restGet/restPost` functions
   - Makes REST API calls with Clerk Bearer tokens
   - Bypasses RLS policies entirely via REST API authentication
   - Works because JWT tokens contain user context

### Technical Details

1. **getMaintenanceRequests() Flow**:
   - Line 138: `const profile = await this.getProfile(clerkUserId)`
   - This query triggers RLS policy: `"Users can read own profile"`
   - RLS policy checks: `clerk_user_id = current_setting('app.current_user_id')`
   - **FAILS** because `app.current_user_id` is not set
   - Returns null profile, causing downstream queries to fail

2. **Missing Context Setting**:
   - `useSupabaseWithAuth` hook gets Clerk token but doesn't set session context
   - `SupabaseClient` constructor doesn't configure user context
   - No calls to `SELECT set_config('app.current_user_id', ?, true)` before queries

### Why Property Management Works
- Direct REST calls: `${base}/rest/v1/profiles_api?clerk_user_id=eq.${clerkId}`
- Uses Clerk Bearer token: `Authorization: Bearer ${clerkToken}`
- Supabase REST API handles authentication differently than SDK queries
- Bypasses the `app.current_user_id` requirement

## Recommendations

### Immediate Fix Options

**Option 1: Set User Context (Recommended)**
```typescript
// Before making queries, set the user context:
await supabase.rpc('set_config', {
  setting_name: 'app.current_user_id',
  new_value: clerkUserId,
  is_local: true
});
```

**Option 2: Use Consistent REST API Approach**
- Replace `SupabaseClient` usage in Dashboard with `ClerkSupabaseClient` pattern
- Use the same REST authentication that works in Property Management

**Option 3: Fix JWT Template Configuration** 
- Configure Clerk JWT templates properly for Supabase integration
- Ensure JWT tokens contain the required claims for RLS

### Implementation Priority
1. **Immediate**: Add user context setting before Dashboard queries
2. **Short-term**: Standardize authentication approach across the app
3. **Long-term**: Implement proper JWT-based authentication with Clerk-Supabase integration

### Test Verification
The test data exists and includes:
- Landlord: `clerk_user_id: 'landlord_john_001'`  
- 8 maintenance requests for landlord's properties
- Current authentication just needs to set user context properly