# Authentication Architecture - Critical Findings

**Date**: 2025-01-25
**Status**: 🔴 **BLOCKING ISSUE IDENTIFIED**

---

## Critical Discovery

**The application uses Supabase Authentication, NOT Clerk.**

### Evidence

1. **App.tsx (Line 4)**:
   ```typescript
   import { SupabaseAuthProvider } from './src/context/SupabaseAuthContext';
   ```

2. **SupabaseAuthContext.tsx (Lines 35-61)**:
   ```typescript
   export const SupabaseAuthProvider: React.FC = ({ children }) => {
     const authDisabled = process.env.EXPO_PUBLIC_AUTH_DISABLED === '1';

     // If auth is disabled, use dev user
     if (authDisabled) {
       const devUser: AppUser = {
         id: 'dev_user_1',
         name: 'Dev',
         email: 'dev@example.com',
       };
       setUser(devUser);
       return;
     }

     // Use Supabase Auth
     supabase.auth.getSession().then(({ data: { session } }) => {
       setSession(session);
       if (session?.user) {
         setUser(mapSupabaseUserToAppUser(session.user));
       }
     });
   };
   ```

3. **No Clerk Integration Found**:
   - No `ClerkProvider` in App.tsx
   - No `@clerk/clerk-expo` imports anywhere in src/
   - No Clerk UI components

### The Problem

**Test Infrastructure vs. Application Reality**:

| Component | Expected (Tests) | Actual (App) |
|-----------|------------------|--------------|
| **Auth Provider** | Clerk | Supabase Auth |
| **Login Method** | `clerk.signIn()` | `supabase.auth.signInWithPassword()` |
| **Signup Method** | `clerk.signUp()` | `supabase.auth.signUp()` |
| **Session Management** | Clerk Sessions | Supabase Sessions |
| **UI Components** | Clerk prebuilt components | Custom React Native screens |
| **Test Credentials** | `.env.test` has `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Should have Supabase credentials |

### Impact on Testing

1. **RLS Tests Failing**:
   - `e2e/access-control/tenant-rls.spec.ts` uses `AuthHelper.loginWithEmail()`
   - `AuthHelper` searches for Clerk UI: `input[name="emailAddress"]`
   - These Clerk components don't exist in the app
   - Tests timeout looking for non-existent elements

2. **Auth Helper Mismatch**:
   - `e2e/helpers/auth-helper.ts` is written for Clerk
   - Methods like `signUpWithEmail()` expect Clerk's prebuilt form components
   - Needs complete rewrite for Supabase Auth

3. **Environment Configuration**:
   - `.env.test` has Clerk key: `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - Should only need Supabase credentials (already configured)

---

## Architecture Decision: Which Auth System?

### Option 1: Continue with Supabase Auth (RECOMMENDED)

**Pros**:
- ✅ Already fully integrated
- ✅ Works with existing Supabase RLS policies
- ✅ JWT tokens automatically work with RLS
- ✅ No additional third-party dependencies
- ✅ Simpler architecture
- ✅ All backend (RLS, database) already configured for Supabase

**Cons**:
- ❌ Need to rewrite test auth helpers
- ❌ Need custom UI screens for auth (already done)

**What Needs to Change**:
1. Rewrite `e2e/helpers/auth-helper.ts` for Supabase
2. Update `.env.test` to remove Clerk references
3. Update RLS tests to use Supabase auth methods
4. Test users must be created in Supabase (not Clerk)

### Option 2: Switch to Clerk (NOT RECOMMENDED)

**Pros**:
- ✅ Tests already written for Clerk
- ✅ Prebuilt UI components
- ✅ OAuth providers easier to configure

**Cons**:
- ❌ Massive code changes required
- ❌ Need to integrate Clerk with Supabase RLS
- ❌ More complex JWT configuration
- ❌ Additional third-party dependency
- ❌ Need to migrate all existing Supabase auth code

**What Needs to Change**:
1. Install `@clerk/clerk-expo`
2. Replace `SupabaseAuthProvider` with `ClerkProvider`
3. Configure Clerk JWT template for Supabase
4. Update all auth-related code throughout the app
5. Configure Supabase to accept Clerk JWTs
6. Migrate any existing user data

---

## Recommended Path Forward

**Continue with Supabase Auth** and fix the test infrastructure:

### Immediate Actions

1. **Create Supabase Auth Helper**:
   - Rewrite `e2e/helpers/auth-helper.ts` to use Supabase Auth API
   - Use `supabase.auth.signInWithPassword()` instead of Clerk UI
   - Use `supabase.auth.signUp()` for user creation

2. **Create Test Users in Supabase**:
   - Create landlord user: `test-landlord+clerk_test@myailandlord.com`
   - Create tenant user: `test-tenant+clerk_test@myailandlord.com`
   - Verify email addresses (disable email confirmation for test env)

3. **Update Test Configuration**:
   - Remove Clerk references from `.env.test`
   - Keep only Supabase credentials
   - Update `LANDLORD_EMAIL`/`LANDLORD_PASSWORD` to be Supabase users

4. **Update RLS Tests**:
   - Replace Clerk-based auth flows with Supabase auth
   - Use programmatic API calls instead of UI interactions for login
   - Focus on API-level RLS testing

### Why This Approach

1. **Minimal Code Changes**: Only test infrastructure needs updating
2. **Already Working**: Supabase auth is fully functional in the app
3. **RLS Integration**: Supabase Auth + Supabase RLS is the simplest setup
4. **No Migration**: No need to migrate existing users or data
5. **Faster**: Can fix and test within hours, not days

---

## Current Test Failure Analysis

### Test: `tenant-rls.spec.ts` Line 66

```typescript
await landlordAuth.loginWithEmail(landlordCreds.email, landlordCreds.password);
```

**What Happens**:
1. `AuthHelper.loginWithEmail()` calls `page.goto('/')`
2. Waits for Clerk login form: `input[name="emailAddress"]`
3. **Timeout**: Clerk form doesn't exist
4. Test fails after 10 seconds

**What Should Happen**:
1. Call Supabase API directly: `supabase.auth.signInWithPassword({ email, password })`
2. Get session token
3. Set token in browser's localStorage
4. Navigate to app (already authenticated)
5. Verify login by checking for dashboard/properties screen

---

## Next Steps

1. ✅ Document findings (this file)
2. Create `SupabaseAuthHelper` class for E2E tests
3. Create test users in Supabase dashboard
4. Update RLS tests to use new helper
5. Run tests and verify RLS policies work

---

## Questions for Product Owner

1. **Was Clerk ever intended to be used?**
   - If yes, when was the decision made to use Supabase instead?
   - If no, why do test configs reference Clerk?

2. **Should we keep Clerk references in case of future migration?**
   - Or should we clean them up entirely?

3. **Are there any plans to add OAuth (Google, Apple)?**
   - Supabase supports this natively
   - Would not require Clerk

---

## Conclusion

**The RLS tests are failing because they expect Clerk authentication, but the app uses Supabase authentication.**

This is not a bug in the app - the app's authentication is correctly implemented with Supabase. This is a mismatch between test infrastructure and application architecture.

**Recommendation**: Update the test infrastructure to match the application's use of Supabase Auth. This is faster, simpler, and maintains consistency with the existing backend architecture.

**Estimated Effort**: 2-4 hours to create Supabase auth helper and update RLS tests.

**Priority**: HIGH - Blocks all real authentication testing and RLS verification.
