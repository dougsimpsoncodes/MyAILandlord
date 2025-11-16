# Troubleshooting Report: Profile Sync & Login Issues

**Date:** 2025-11-14
**Status:** 🔴 BLOCKED - Cannot complete user onboarding
**Priority:** HIGH - Blocking E2E testing

---

## Problem Summary

Users can authenticate with Clerk successfully, but the app fails to sync their profile to Supabase, causing a redirect loop that prevents access to the application.

**Symptoms:**
1. Login appears successful (Clerk authentication works)
2. User gets redirected to `/signup` instead of dashboard
3. `useProfileSync` error in console (empty error object)
4. **No Supabase API requests are made** (confirmed via Network tab)
5. User stuck in infinite redirect loop

---

## Environment

- **App:** React Native Web (Expo)
- **Auth:** Clerk (pk_test_ZHJpdmVuLWFsaWVuLTE1...)
- **Database:** Supabase (https://zxqhxjuwmkxevhkpqfzf.supabase.co)
- **Server:** localhost:8082
- **Test User:** test-landlord+clerk_test@myailandlord.com

---

## Steps to Reproduce

1. Start app: `npx expo start --web --port 8082`
2. Navigate to: http://localhost:8082
3. Click "Sign In"
4. Enter credentials:
   - Email: `test-landlord+clerk_test@myailandlord.com`
   - Password: `MyAI2025!Landlord#Test`
5. Click "Sign In" button
6. **Expected:** User redirected to role selection or dashboard
7. **Actual:** User redirected back to `/signup`, stuck in loop

---

## Error Messages

### Console Errors

```
🔄 useProfileSync starting...
▸ Object { isLoaded: false, isSignedIn: undefined, userId: undefined }

🔄 useProfileSync: waiting for auth...
▸ Object { isLoaded: false, isSignedIn: undefined, hasUser: false }

🔄 useProfileSync starting...
▸ Object { isLoaded: true, isSignedIn: true, userId: "user_35Uk6a3U0yYMlLmarCg3OoWXvnJ" }

🔴 🔄 useProfileSync error: Object { }
```

### Key Observations

1. **Clerk auth works:** `isSignedIn: true`, `userId` present
2. **Error object is empty:** `Object { }` (no error details)
3. **No intermediate logs:** Missing these expected logs:
   - "🔄 useProfileSync: syncing profile for..."
   - "🔄 useProfileSync: existing profile:"
   - "🔄 useProfileSync: API not ready yet"
4. **No Supabase requests:** Network tab shows **zero** requests to `supabase.co`

---

## Code Analysis

### useProfileSync.ts (lines 20-70)

The hook appears to fail at one of these points:

```typescript
// Line 24-28: Token check
const t = await getToken()
if (!t) {
  log.warn('🔄 useProfileSync: no token available'); // NOT LOGGED
  return;
}

// Line 37-40: API check
if (!api) {
  log.warn('🔄 useProfileSync: API not ready yet') // NOT LOGGED
  return;
}

// Line 41: First API call
const ex = await api.getUserProfile() // NEVER REACHED
```

**Theory:** Either:
- Token retrieval fails silently
- API client (`api`) is `null`/`undefined`
- Code throws before reaching API calls

---

## Diagnostic Results

### ✅ Environment Variables Loaded

```javascript
console.log(process.env.EXPO_PUBLIC_SUPABASE_URL)
// Output: "https://zxqhxjuwmkxevhkpqfzf.supabase.co" ✓

console.log(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY)
// Output: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." ✓
```

### ❌ No Supabase Network Requests

**Network Tab Filter:** `supabase`
**Result:** 0 requests

**Expected:** Should see requests to:
- `https://zxqhxjuwmkxevhkpqfzf.supabase.co/rest/v1/profiles`

### ✅ Clerk Requests Present

Multiple requests to `driven-alien-15.clerk.accounts.dev` succeeding (200, 201)

---

## AppNavigator State

From console logs:

```
🧭 AppNavigator state:
{
  isSignedIn: true,       ✓ Clerk auth working
  userRole: null,         ✗ Role not set (profile sync failed)
  isLoading: false,
  roleLoading: false,
  hasUser: true
}

🧭 Navigation decision:
{
  shouldShowMainStack: null,  ✗ Cannot determine navigation
  isInviteLink: false,
  isSignedIn: true,
  hasRole: false,             ✗ No role → redirects to signup
  initialUrl: "http://localhost:8082/"
}
```

**Problem:** `userRole: null` because `useProfileSync` failed to:
1. Create profile in Supabase
2. Set role in context

---

## What We've Tried

### ✅ Verified Clerk Setup
- Test users created in Clerk Dashboard
- Emails verified
- Passwords set and confirmed
- Login succeeds (session created)

### ✅ Verified Environment
- `.env.test` contains correct credentials
- Environment variables loaded in browser
- Supabase URL and anon key present

### ✅ Server Restart
- Killed all Expo processes
- Restarted `npx expo start --web --port 8082`
- Problem persists

### ✅ Browser Cache Cleared
- Hard refresh (Cmd+Shift+R)
- Session cleared
- Problem persists

---

## Critical Questions

### 1. Why is the API client not initialized?

**Evidence:**
- No Supabase requests in Network tab
- No "API not ready yet" log message
- Code never reaches `api.getUserProfile()`

**Possible causes:**
- API context provider not wrapping components correctly
- API client initialization failing silently
- Token retrieval failing before API call

### 2. Why is the error object empty?

```typescript
catch (error) {
  log.error('🔄 useProfileSync error:', error as any);
}
```

**Logged as:** `Object { }`

**Possible causes:**
- Error being thrown as non-Error object
- Early return before error details set
- Silent failure in async code

### 3. Where is the token check failing?

```typescript
const t = await getToken()
if (!t) {
  log.warn('🔄 useProfileSync: no token available');
  return;
}
```

**We don't see this warning**, so either:
- Token IS being retrieved (but API still fails)
- Code throws before this point

---

## Files Involved

### Primary
- `src/hooks/useProfileSync.ts` - Profile sync hook (FAILING HERE)
- `src/contexts/ApiContext.tsx` - API client provider
- `src/services/api/client.ts` - API client initialization
- `src/navigation/AppNavigator.tsx` - Navigation logic

### Related
- `src/clients/ClerkSupabaseClient.ts` - Clerk+Supabase integration
- `src/services/supabase/client.ts` - Supabase client setup

---

## Next Steps for Investigation

### Priority 1: Check API Client Initialization

```javascript
// In browser console, after login
console.log(window.__API_CLIENT__)  // Does it exist?
```

### Priority 2: Add Debug Logging

Add to `useProfileSync.ts` line 24:

```typescript
const t = await getToken()
console.log('🔍 DEBUG: Token retrieved:', !!t, t?.substring(0, 20))
```

Add to line 37:

```typescript
console.log('🔍 DEBUG: API client:', !!api, typeof api)
if (!api) {
  log.warn('🔄 useProfileSync: API not ready yet')
  return;
}
```

### Priority 3: Check Error Object

Change line 65-67:

```typescript
catch (error) {
  console.log('🔍 DEBUG: Error type:', typeof error, error)
  console.log('🔍 DEBUG: Error constructor:', error?.constructor?.name)
  console.log('🔍 DEBUG: Error keys:', Object.keys(error || {}))
  log.error('🔄 useProfileSync error:', error as any);
}
```

---

## Expected Behavior (Working Flow)

1. User logs in via Clerk → Session created ✓
2. `useProfileSync` hook runs
3. Gets Clerk token ✓
4. Calls `api.getUserProfile()` ✗ FAILS HERE
5. If no profile exists, calls `api.createUserProfile()` ✗ NEVER REACHED
6. Sets `userRole` in context ✗ NEVER REACHED
7. Navigation shows dashboard ✗ NEVER REACHED

**Currently stuck at step 4.**

---

## Request for Help

**Main question:** Why is the Supabase API client not making any requests?

**Sub-questions:**
1. How is the API client initialized in this codebase?
2. Is there a context provider that needs to be checked?
3. Could RLS policies be blocking requests (though we'd see 403 errors)?
4. Is there a way to verify the API client is actually instantiated?

**Ideal outcome:**
- Identify why no Supabase requests are made
- Get profile sync working
- Allow users to complete onboarding

---

## Additional Context

- **Testing motivation:** Setting up E2E tests with Playwright
- **Tests created:** 160+ tests ready to run
- **Blocker:** Cannot test beyond login without profile sync working
- **Timeline:** Need resolution to proceed with testing

---

**Generated:** 2025-11-14
**Reporter:** Working with AI assistant
**Environment:** macOS, Chrome, localhost development
