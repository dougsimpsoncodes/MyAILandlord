# Production Readiness Checklist - MyAILandlord

**Status**: 🔴 **NOT READY FOR PRODUCTION**
**Last Updated**: 2025-01-25

---

## Critical Blockers 🚨

### 1. RLS (Row Level Security) Not Verified
**Priority**: CRITICAL
**Risk**: Data security breach - tenants may access other tenants' data

**Current Status**:
- ❌ RLS tests failing/skipped (require real auth)
- ❌ Tenant data isolation not verified
- ❌ Cross-tenant access prevention not tested

**Required Actions**:
1. Set up test credentials:
   ```bash
   export LANDLORD_EMAIL="test-landlord@myailandlord.com"
   export LANDLORD_PASSWORD="YourSecurePassword123!"
   export TENANT_EMAIL="test-tenant@myailandlord.com"
   export TENANT_PASSWORD="YourSecurePassword123!"
   ```

2. Verify Supabase RLS policies:
   ```sql
   -- Check RLS is enabled on all tables
   SELECT schemaname, tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public' AND rowsecurity = false;

   -- Should return NO rows (all tables should have RLS enabled)
   ```

3. Test RLS enforcement:
   ```bash
   # Remove mock auth and run RLS tests
   npx playwright test e2e/access-control/tenant-rls.spec.ts --project=chromium
   ```

4. Manual verification:
   - Create 2 properties as Landlord A
   - Create 1 property as Landlord B
   - Sign up as Tenant C, link to Landlord A Property 1
   - Sign up as Tenant D, link to Landlord B Property 1
   - **Verify**: Tenant C CANNOT see Landlord B's properties
   - **Verify**: Tenant C CANNOT see Landlord A Property 2 (not linked)
   - **Verify**: Landlord A CANNOT see Landlord B's data

---

### 2. Authentication Not Fully Tested
**Priority**: CRITICAL
**Risk**: Users may not be able to sign up, log in, or access the app

**Current Status**:
- ✅ Auth UI screens tested (login, signup, role selection)
- ❌ Real Clerk authentication not tested
- ❌ Session persistence not verified
- ❌ OAuth flows not tested
- ❌ Email verification not tested

**Required Actions**:
1. Configure Clerk test environment
2. Create test users in Clerk
3. Run auth tests without mock:
   ```bash
   # Start server with real auth
   npx expo start --web --port 8082

   # Run auth tests
   npx playwright test e2e/auth/ --project=chromium
   ```

4. Manual testing:
   - Sign up new user with email/password
   - Verify email verification flow
   - Log out and log back in
   - Test OAuth with Google/Apple (if enabled)
   - Verify session persists across browser restarts
   - Test "Forgot Password" flow

---

### 3. Data Persistence Not Verified
**Priority**: CRITICAL
**Risk**: Data may not be saved correctly to Supabase

**Current Status**:
- ✅ UI flows tested (forms work, navigation works)
- ❌ Actual Supabase data persistence not verified
- ❌ Property creation may not save to database
- ❌ Maintenance requests may not save
- ❌ User profiles may not sync

**Required Actions**:
1. Test property creation with real database:
   ```bash
   # Check Supabase connection
   echo $EXPO_PUBLIC_SUPABASE_URL
   echo $EXPO_PUBLIC_SUPABASE_ANON_KEY

   # Run property creation test
   npx playwright test e2e/real-user-property-creation.spec.ts --project=chromium

   # Verify in Supabase dashboard:
   # - Check properties table has new entry
   # - Check property_units table (if applicable)
   # - Check all fields are populated
   ```

2. Manual verification:
   - Create a property through UI
   - Go to Supabase dashboard
   - Verify property exists in `properties` table
   - Verify all fields match UI input
   - Create maintenance request
   - Verify in `maintenance_requests` table

---

### 4. API Integration Failures
**Priority**: HIGH
**Risk**: Core features may not work

**Current Status**:
- ❌ Maintenance API fetch test failing
- ❌ Auth error handling test failing
- ✅ Error handling test passing

**Required Actions**:
1. Check API endpoints exist:
   ```bash
   # Test maintenance requests endpoint
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        https://YOUR_SUPABASE_URL/rest/v1/maintenance_requests

   # Should return 200 OK
   ```

2. Fix API integration tests:
   ```bash
   npx playwright test e2e/api-integration.spec.ts --project=chromium --debug
   ```

3. Verify:
   - API endpoints are configured correctly
   - Supabase REST API is enabled
   - Authentication tokens are valid
   - CORS is configured for your domain

---

## High Priority Issues ⚠️

### 5. File Upload Not Tested
**Priority**: HIGH
**Risk**: Image uploads may fail

**Required Actions**:
1. Run file upload tests:
   ```bash
   npx playwright test e2e/uploads/file-upload-flows.spec.ts --project=chromium
   ```

2. Manual testing:
   - Upload property photos
   - Upload maintenance request images
   - Upload asset photos
   - Verify files appear in Supabase Storage
   - Test file size limits
   - Test invalid file types

---

### 6. Real-time Features Not Tested
**Priority**: MEDIUM
**Risk**: Notifications and live updates may not work

**Required Actions**:
1. Test real-time subscriptions:
   ```bash
   npx playwright test e2e/realtime/realtime-features.spec.ts --project=chromium
   ```

2. Manual testing:
   - Open app in 2 browser windows
   - Create maintenance request as tenant
   - Verify landlord sees update in real-time
   - Update maintenance status as landlord
   - Verify tenant sees update in real-time

---

### 7. Clerk → Supabase JWT Integration
**Priority**: CRITICAL
**Risk**: Authentication may not work with Supabase

**Current Status**:
- ❌ Not verified that Clerk JWTs work with Supabase
- ❌ Not verified that user_id mapping works
- ❌ Not verified that RLS can read Clerk user_id from JWT

**Required Actions**:
1. Verify JWT configuration:
   - Check Supabase JWT secret matches Clerk
   - Verify custom claims are configured
   - Test JWT can be decoded by Supabase

2. Test user_id mapping:
   ```sql
   -- In Supabase, run:
   SELECT auth.uid(); -- Should return Clerk user ID
   ```

3. Manual verification:
   - Sign up as new user
   - Check `profiles` table has entry with correct `user_id`
   - Verify `user_id` matches Clerk user ID
   - Create property as this user
   - Verify property.owner_id = profiles.user_id

---

## Testing Commands

### Run All Critical Tests
```bash
# 1. Start server with real auth
npx expo start --web --port 8082

# 2. Set test credentials
export LANDLORD_EMAIL="test-landlord@myailandlord.com"
export LANDLORD_PASSWORD="your-password"
export TENANT_EMAIL="test-tenant@myailandlord.com"
export TENANT_PASSWORD="your-password"

# 3. Run critical test suite
npx playwright test e2e/access-control/ e2e/auth/ e2e/api-integration.spec.ts --project=chromium

# 4. Run property creation with real data
npx playwright test e2e/real-user-property-creation.spec.ts --project=chromium

# 5. Verify data in Supabase dashboard
```

### Verify Supabase Configuration
```bash
# Test Supabase connection
curl https://YOUR_PROJECT.supabase.co/rest/v1/ \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Should return 200 OK with API info
```

### Check RLS Policies
```sql
-- Connect to Supabase SQL Editor and run:

-- 1. Check RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- 2. List all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';

-- 3. Test tenant isolation
-- As Tenant A (use their JWT):
SELECT * FROM properties; -- Should only see properties linked to this tenant
SELECT * FROM maintenance_requests; -- Should only see their own requests
```

---

## Manual Testing Checklist

### Authentication Flow
- [ ] Sign up new user (email/password)
- [ ] Verify email (if required)
- [ ] Select role (tenant/landlord)
- [ ] Log out
- [ ] Log back in
- [ ] Test "Forgot Password"
- [ ] Test OAuth (Google/Apple if enabled)
- [ ] Verify session persists after browser restart

### Landlord Flow
- [ ] Create new property (8-step wizard)
- [ ] Verify property appears in list
- [ ] Verify property saved to Supabase
- [ ] Edit property details
- [ ] Upload property photos
- [ ] Generate tenant invite code
- [ ] View maintenance requests
- [ ] Update maintenance status
- [ ] Send to vendor

### Tenant Flow
- [ ] Enter property code
- [ ] Link to property
- [ ] View property details
- [ ] Submit maintenance request
- [ ] Upload issue photos
- [ ] View maintenance status
- [ ] Send message to landlord
- [ ] Cannot see other properties (RLS test)

### Data Isolation (CRITICAL)
- [ ] Create Landlord A with Property 1 & 2
- [ ] Create Landlord B with Property 3
- [ ] Create Tenant C, link to Property 1
- [ ] Create Tenant D, link to Property 3
- [ ] **Verify**: Tenant C sees ONLY Property 1
- [ ] **Verify**: Tenant C cannot access Property 2 via URL
- [ ] **Verify**: Tenant C cannot access Property 3 via URL
- [ ] **Verify**: Landlord A sees ONLY Properties 1 & 2
- [ ] **Verify**: Landlord A cannot access Property 3

---

## Production Deployment Checklist

### Before Deploying
- [ ] All RLS tests passing
- [ ] All auth tests passing
- [ ] All API integration tests passing
- [ ] Manual testing completed
- [ ] Data isolation verified
- [ ] Performance testing done
- [ ] Security audit completed

### Environment Variables
```bash
# Required for production:
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-key

# For testing:
LANDLORD_EMAIL=test-landlord@example.com
LANDLORD_PASSWORD=secure-password
TENANT_EMAIL=test-tenant@example.com
TENANT_PASSWORD=secure-password
```

### Supabase Configuration
- [ ] RLS enabled on all tables
- [ ] RLS policies tested and working
- [ ] JWT secret configured
- [ ] Storage buckets configured
- [ ] API rate limits set
- [ ] Realtime enabled
- [ ] Backups configured

### Clerk Configuration
- [ ] Production instance created
- [ ] JWT template configured for Supabase
- [ ] OAuth providers configured (if using)
- [ ] Email templates customized
- [ ] Webhook endpoints configured

---

## Status Summary

| Category | Status | Blockers |
|----------|--------|----------|
| **UI Tests** | ✅ PASSING | None |
| **Property Creation** | ✅ PASSING | None |
| **Authentication** | ⚠️ PARTIAL | Need real auth testing |
| **RLS / Data Isolation** | ❌ FAILING | Critical - must fix |
| **API Integration** | ❌ FAILING | Need investigation |
| **Data Persistence** | ❌ NOT TESTED | Need verification |
| **File Uploads** | ❌ NOT TESTED | Need testing |
| **Real-time** | ❌ NOT TESTED | Need testing |

---

## Next Steps

### Immediate (Do First)
1. **Fix RLS** - Most critical security issue
2. **Test real auth** - Verify users can actually log in
3. **Verify data saves** - Confirm data persists to Supabase
4. **Fix API tests** - Ensure core features work

### Before Launch
5. Complete all manual testing
6. Run full test suite with real backend
7. Security audit
8. Performance testing
9. User acceptance testing

---

## Contact for Help

If you need assistance:
- Supabase RLS: https://supabase.com/docs/guides/auth/row-level-security
- Clerk Integration: https://clerk.com/docs/integrations/databases/supabase
- Playwright Testing: https://playwright.dev/docs/intro

---

**Remember**: Do NOT launch until all critical issues are resolved and verified!
