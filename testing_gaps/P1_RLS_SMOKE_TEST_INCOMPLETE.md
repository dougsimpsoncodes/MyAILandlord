## [SEVERITY: HIGH] RLS Smoke Test is Incomplete

**File**: `scripts/ci/rls-smoke.js`
**Issue**: The RLS smoke test is incomplete and does not provide adequate coverage of the RLS policies.
**Impact**: The current smoke test could miss critical RLS bypass vulnerabilities, which could lead to data leaks between users.
**Reproduction**: N/A
**Fix**: The RLS smoke test should be expanded to cover all tables with RLS policies, all types of access (read, write), and all user roles (tenant, landlord).

**Code Example**:
```javascript
// The current smoke test only checks for read access on the `properties` table between two tenants.
// It should be expanded to check for:
// - Read/write access on all tables with RLS policies.
// - Tenant/tenant, landlord/landlord, and tenant/landlord isolation.
```
