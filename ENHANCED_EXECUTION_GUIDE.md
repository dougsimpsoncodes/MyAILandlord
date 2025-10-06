# Enhanced RLS Fix Execution Guide

## Tightened, Safe Execution Plan

Based on your excellent refinements, this guide provides a surgical, test-first approach to fix the RLS maintenance request creation issue.

## Phase 1: High-Signal Diagnosis (MANDATORY FIRST)

### Step 1: Run Enhanced Triage
Execute `quick-triage.sql` in Supabase SQL Editor to identify the exact failure mode:

```sql
-- Run all 7 tests in quick-triage.sql
-- Look for any CRITICAL status results
```

**Expected Results:**
- **JWT Analysis**: Should show `PASS: JWT and role look good`
- **Profiles Self-Visibility**: Should show `PASS: Tenant can see their profile`
- **Tenant Property Links Visibility**: Should show `PASS: Active link exists and visible`

### Step 2: Interpret Triage Results
Based on CRITICAL/FAIL results, determine fix path:

| Triage Result | Root Cause | Fix Required |
|---------------|------------|-------------|
| JWT Analysis CRITICAL | Supabase JWKS config wrong | Fix JWT config before policies |
| Role mismatch CRITICAL | TO authenticated conflicts | Apply STEP 2 of minimal fix |
| Profiles visibility CRITICAL | RLS blocks subqueries | Apply STEP 1 of minimal fix |
| Property links CRITICAL | Missing active link | Create tenant_property_links first |
| Restrictive policies found | Policies AND together | Remove restrictive policies |

## Phase 2: Surgical Fix Application

### Apply Only Needed Sections
Execute sections of `minimal-rls-fix.sql` based on triage:

#### If JWT is NULL (CRITICAL):
**STOP** - Fix Supabase JWT verification for Clerk first:
- Check JWKS URL in Supabase settings
- Verify Clerk issuer configuration

#### If Subquery Visibility Failed (CRITICAL):
```sql
-- Apply STEP 1 from minimal-rls-fix.sql
-- Fixes profiles and tenant_property_links SELECT policies
```

#### If Role Mapping Issues:
```sql  
-- Apply STEP 2 from minimal-rls-fix.sql
-- Removes TO authenticated, creates role-agnostic policies
```

#### If Property Visibility Issues:
```sql
-- Apply STEP 3 from minimal-rls-fix.sql
-- Fixes properties SELECT policy
```

### Apply Complete Fix (Only if Multiple Issues):
```sql
-- Run entire minimal-rls-fix.sql if multiple CRITICAL issues found
```

## Phase 3: Validation

### Step 1: Re-run Triage
Execute `quick-triage.sql` again - all should show PASS.

### Step 2: Predicate Test
The fix includes built-in verification:
- Should show `SUCCESS: Both checks pass - maintenance request creation should work`

### Step 3: App Test
Test maintenance request creation in the app:
- Should succeed with 200 response
- No more 403 RLS violations

## Edge Cases Handled

### ✅ Role Mapping Mismatches
- Removes all `TO authenticated` clauses
- Makes policies role-agnostic (predicate-only)

### ✅ Subquery RLS Visibility
- Ensures tenant can see their own `profiles` row
- Ensures tenant can see their own `tenant_property_links` rows
- Without this, policy subqueries fail silently

### ✅ Policy Conflicts  
- Drops ALL existing maintenance_requests policies
- Creates clean, 1-per-purpose policies
- Detects and warns about restrictive policies

### ✅ Column Constraint Issues
- Checks for `tenant_clerk_id` columns that could cause WITH CHECK failures
- Provides warnings about potential INSERT mismatches

### ✅ Security Gaps
- Removes any open `USING (true)` policies on properties table
- Maintains proper tenant isolation

## Common Failure Modes Addressed

### "Should Work But Doesn't"
1. **JWT Present But Policies Don't Apply**: Fixed by removing TO authenticated
2. **Policy Looks Right But Fails**: Fixed by ensuring subquery visibility
3. **Multiple Policies Conflict**: Fixed by drop-all-then-recreate approach
4. **Restrictive Policy Hidden**: Detected and flagged in triage

### Post-Fix Validation Checklist

- [ ] `quick-triage.sql` shows all PASS
- [ ] Policy summary shows no restrictive policies
- [ ] Properties table has no open policies
- [ ] Maintenance request creation works in app
- [ ] Proper tenant isolation maintained

## Execution Time
- **Triage**: ~2 minutes
- **Fix Application**: ~3 minutes  
- **Validation**: ~2 minutes
- **Total**: ~7 minutes (vs hours of debugging)

## Safety Features
- ✅ JWT access check before modifying policies
- ✅ Warnings for potential column constraint issues
- ✅ Built-in post-fix verification
- ✅ Policy summary to catch edge cases
- ✅ Maintains security boundaries

This approach eliminates the "trial and error" cycle by identifying the exact issue first, then applying only the necessary fixes.