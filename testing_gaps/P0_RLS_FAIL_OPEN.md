## [SEVERITY: CRITICAL] RLS Policies Fail Open if JWT `sub` is Null

**File**: `supabase/migrations/20250823_enforce_rls.sql`
**Issue**: The RLS policies do not handle the case where the `sub` claim in the JWT is null. If the `sub` claim is null, the policies will fail open, allowing any authenticated user to access the data.
**Impact**: This could lead to a major data leak, as any authenticated user could access all the data in the database.
**Reproduction**: N/A
**Fix**: The RLS policies should be modified to handle the case where the `sub` claim is null. The policies should deny access if the `sub` claim is null.

**Code Example**:
```sql
-- The current implementation fails open if the sub claim is null
CREATE POLICY "profiles_isolation" ON profiles
  FOR ALL USING (auth.jwt() ->> 'sub' = clerk_user_id);

-- The corrected implementation should deny access if the sub claim is null
CREATE POLICY "profiles_isolation" ON profiles
  FOR ALL USING ((auth.jwt() ->> 'sub') IS NOT NULL AND auth.jwt() ->> 'sub' = clerk_user_id);
```
