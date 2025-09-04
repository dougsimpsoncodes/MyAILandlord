# Testing the Maintenance Request RLS Fix

## Summary of Changes Made

### 1. Fixed API Client Authentication Approach
**Problem**: The API client was using a SupabaseClient wrapper around the properly configured Supabase client from `useSupabaseWithAuth`, which interfered with JWT token transmission.

**Solution**: Modified `src/services/api/client.ts` to use the Supabase client directly from `useSupabaseWithAuth` hook instead of wrapping it.

**Key Changes**:
- Removed usage of `getSupabaseClient()` wrapper for maintenance request creation
- Used `supabaseClient` (from `useSupabaseWithAuth`) directly for INSERT and UPDATE operations  
- Added comprehensive debug logging to track JWT context and insertion data

### 2. Enhanced Debug Logging
Added detailed console logging to track:
- Profile information (id, clerk_user_id, role)
- Request data being inserted
- Success/failure status of database operations

## Testing Steps

### Prerequisites
1. User must be authenticated with Clerk
2. User must have a tenant profile in the database
3. User must have an active property link in `tenant_property_links` table
4. The property must exist in the `properties` table

### Test Process
1. Navigate to the maintenance request creation flow
2. Fill out a maintenance request form
3. Submit the request
4. Check browser console for debug logs:
   - Look for "DIRECT SUPABASE INSERT DEBUG" logs
   - Verify profile information is correct
   - Check that JWT tokens are being sent (no auth errors)

### Expected Behavior After Fix

**Success Case**:
- Console shows: "=== DIRECT SUPABASE INSERT SUCCESS ==="
- Request is created in database
- User sees success message
- Navigation to success screen

**RLS Policy Violation (should no longer occur)**:
- Error 42501: "new row violates row-level security policy"
- This should be resolved by using proper JWT token transmission

**Data Validation Errors (expected if data is invalid)**:
- Missing property link: "property_id not in tenant's active properties"
- Invalid tenant: "tenant_id doesn't match authenticated user"

### Debugging Common Issues

1. **JWT Token Not Sent**
   - Check that `useSupabaseWithAuth` is properly configured
   - Verify Clerk session is active and `getToken()` returns a valid token
   - Check browser network tab for Authorization header

2. **Property Link Missing**
   - Verify tenant has active link to the property in `tenant_property_links`
   - Check that `is_active = true` for the link

3. **Profile Issues**
   - Ensure user has a profile record with correct `clerk_user_id`
   - Verify profile has `role = 'tenant'`

## Files Modified
- `/src/services/api/client.ts` - Main fix for direct Supabase client usage
- `/src/services/supabase/client.ts` - Removed obsolete RLS context setting

## Next Steps if Issues Persist
1. Apply the updated RLS policies from `fix-maintenance-rls-policy.sql`
2. Set up proper test data using `setup-test-data.sql`
3. Create the JWT debug function using `test-jwt-debug.sql`

The core fix should resolve the RLS policy violation by ensuring JWT tokens are properly transmitted to Supabase for RLS policy evaluation.