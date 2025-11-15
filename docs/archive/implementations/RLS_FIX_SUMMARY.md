# RLS Fix Implementation Summary

## Issue Identified
Maintenance request creation failing with 403 RLS violation: `new row violates row-level security policy for table "maintenance_requests"`

## Root Cause Analysis
1. **Mixed authentication paradigms** - Found `auth.uid()`, `auth.jwt()`, and GUC patterns across codebase
2. **Client-side authentication issue** - `PropertyInviteAcceptScreen.tsx` was using global supabase client instead of authenticated client
3. **Maintenance request creation** - Already using authenticated client, so issue is in RLS policies

## Fixes Applied

### 1. Client-Side Fix ✅
**File**: `src/screens/tenant/PropertyInviteAcceptScreen.tsx`
- **Before**: `import { supabase } from '../../services/supabase/config';`
- **After**: `import { useSupabaseWithAuth } from '../../hooks/useSupabaseWithAuth';`
- **Added**: `const { supabase } = useSupabaseWithAuth();` in component

This ensures tenant property link creation uses authenticated client with proper JWT token.

### 2. RLS Migration Created ✅
**File**: `supabase/migrations/20250904_fix_rls_standardize.sql`
- Drops all existing conflicting policies
- Creates standardized `auth.jwt() ->> 'sub'` policies for all tables
- Specifically fixes maintenance_requests policies:
  - `mr_insert_tenant_own_property`: Allows tenants to create requests only for properties they have active links to
  - `mr_select_tenant_or_landlord`: Allows tenants to see their requests, landlords to see requests for their properties

### 3. SQL Diagnostics Created ✅  
**File**: `debug-rls-policies.sql`
- Checks which tables have RLS enabled
- Lists all current policies 
- Tests JWT access (`auth.jwt() ->> 'sub'`)
- Simulates the failing predicate for the specific user/property combination

## Critical Policies for Maintenance Requests

```sql
-- Allow tenant INSERT if they have active property link
CREATE POLICY mr_insert_tenant_own_property ON public.maintenance_requests
  FOR INSERT WITH CHECK (
    tenant_id IN (
      SELECT id FROM public.profiles WHERE clerk_user_id = auth.jwt() ->> 'sub' AND role = 'tenant'
    ) AND property_id IN (
      SELECT tpl.property_id FROM public.tenant_property_links tpl
      JOIN public.profiles p ON p.id = tpl.tenant_id
      WHERE p.clerk_user_id = auth.jwt() ->> 'sub' AND tpl.is_active = true
    )
  );
```

## Manual Steps to Complete Fix

### 1. Apply RLS Migration
Run the SQL in `supabase/migrations/20250904_fix_rls_standardize.sql` in Supabase SQL Editor

### 2. Verify Fix with Diagnostics
Run the SQL queries in `debug-rls-policies.sql` to verify:
- JWT access returns Clerk user ID (not null)
- Predicate simulation shows PASS for both tenant ID and property access checks

### 3. Test the App
- Navigate to maintenance request creation
- Submit a maintenance request as the failing tenant
- Should succeed with 200 response

## Expected Results After Fix
- ✅ Maintenance request creation succeeds for tenants with active property links
- ✅ All RLS policies use consistent `auth.jwt() ->> 'sub'` authentication 
- ✅ No more 403 RLS violations for authenticated operations
- ✅ Proper security isolation between tenants and properties

## Files Modified
- `src/screens/tenant/PropertyInviteAcceptScreen.tsx` - Fixed client usage
- `supabase/migrations/20250904_fix_rls_standardize.sql` - RLS standardization
- `debug-rls-policies.sql` - Diagnostic queries
- `rls-debug-report.md` - Original analysis
- `RLS_FIX_SUMMARY.md` - This summary

## Next Steps
1. Apply the SQL migration
2. Test maintenance request creation
3. Run full RLS test suite if needed
4. Monitor for any other 403 errors in production