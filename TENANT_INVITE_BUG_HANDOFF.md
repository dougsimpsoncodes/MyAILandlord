# Tenant Invite Flow Navigation Bug - RESOLVED

## Status: ✅ FIXED (January 3, 2026)

## Original Problem Statement

When an unauthenticated user opens a tenant invite link and taps "Sign Up & Accept", they should be taken to the new onboarding flow (`OnboardingNameScreen` - "What should we call you?"). Instead, they were being taken to the legacy `AuthScreen`.

## Expected Flow
1. User opens invite link → `PropertyInviteAcceptScreen` shows property details
2. User taps "Sign Up & Accept"
3. → `OnboardingNameScreen` ("What should we call you?") with `fromInvite: true`
4. → `OnboardingAccountScreen` ("Nice to meet you!") with `fromInvite: true`
5. → Back to `PropertyInviteAcceptScreen` (skipping role selection)
6. → Auto-accept invite → Tenant home

## Actual Flow (Bug)
1. User opens invite link → `PropertyInviteAcceptScreen` shows property details ✓
2. User taps "Sign Up & Accept"
3. → Legacy `AuthScreen` (email/password form) ✗ WRONG

## Root Cause Analysis (IDENTIFIED)

**THE ACTUAL PROBLEM**: In `AuthStack.tsx`, `Auth` is a **screen** (line 143), NOT a navigator:

```typescript
// AuthStack.tsx line 143
<Stack.Screen name="Auth" component={AuthScreen} />
```

The navigation code is:
```typescript
navigation.dispatch(CommonActions.reset({
  index: 0,
  routes: [
    {
      name: 'Auth' as never,  // <-- THIS NAVIGATES TO AuthScreen!
      state: { ... }  // <-- This nested state is IGNORED because Auth is a screen, not a navigator
    }
  ]
}));
```

Since `Auth` is a screen (`AuthScreen` - the login form), not a navigator, the navigation goes directly to `AuthScreen` and ignores the nested `state`.

**THE FIX**: Since `PropertyInviteAcceptScreen` is already inside `AuthStack`, it can navigate directly to `OnboardingName`:

```typescript
// Simple fix - navigate directly within the same stack
navigation.navigate('OnboardingName', { fromInvite: true });

// OR if reset is needed:
navigation.reset({
  index: 0,
  routes: [{ name: 'OnboardingName', params: { fromInvite: true } }],
});
```

Also need to update `AuthStackParamList` type to include `fromInvite`:
```typescript
// Line 34 in AuthStack.tsx - currently wrong:
OnboardingName: undefined;

// Should be:
OnboardingName: { fromInvite?: boolean };
```

## Attempted Solutions

### Attempt 1: Added `processingInvite` to UnifiedAuthContext
- **File**: `src/context/UnifiedAuthContext.tsx`
- **Change**: Added `processingInvite`, `redirect`, and `clearRedirect` state
- **Result**: Did not fix the navigation issue

### Attempt 2: Updated OnboardingRoleScreen to use UnifiedAuth
- **File**: `src/screens/onboarding/OnboardingRoleScreen.tsx`
- **Change**: Changed from `useAppAuth` to `useUnifiedAuth`
- **Result**: Not related to this specific bug

### Attempt 3: Modified PropertyInviteAcceptScreen navigation
- **File**: `src/screens/tenant/PropertyInviteAcceptScreen.tsx`
- **Change**: Changed navigation from simple `Auth` to nested state with `OnboardingName`
- **Result**: Still navigates to AuthScreen, not OnboardingName

### Attempt 4: Updated OnboardingNameScreen and OnboardingAccountScreen
- **Files**:
  - `src/screens/onboarding/OnboardingNameScreen.tsx`
  - `src/screens/onboarding/OnboardingAccountScreen.tsx`
- **Change**: Added `fromInvite` param support to pass through the onboarding flow
- **Result**: These screens work correctly IF you can get to them

## Key Files to Investigate

### 1. PropertyInviteAcceptScreen.tsx (lines 171-196)
```typescript
// src/screens/tenant/PropertyInviteAcceptScreen.tsx
if (!user) {
  // Save pending invite before redirecting to signup
  await PendingInviteService.savePendingInvite(token, 'token', {
    propertyId: property?.id,
    propertyName: property?.name,
  });
  // Navigate to OnboardingName
  navigation.dispatch(CommonActions.reset({
    index: 0,
    routes: [
      {
        name: 'Auth' as never,
        state: {
          routes: [
            {
              name: 'OnboardingName',
              params: { fromInvite: true }
            }
          ]
        }
      }
    ]
  }));
  return;
}
```

### 2. AuthStack.tsx (navigation configuration)
```typescript
// src/navigation/AuthStack.tsx - lines 61-148
// This defines what screens are in the Auth stack
// OnboardingName IS in this stack (line ~140)
<Stack.Screen name="OnboardingName" component={OnboardingNameScreen} />
<Stack.Screen name="OnboardingAccount" component={OnboardingAccountScreen} />
<Stack.Screen name="PropertyInviteAccept" component={PropertyInviteAcceptScreen} />
```

### 3. AuthStack initialRouteName logic (lines 79-95)
```typescript
// The AuthStack has logic to determine initialRouteName
// When coming from an invite, it should start at PropertyInviteAccept
// But the problem is AFTER PropertyInviteAccept, navigating to OnboardingName
```

## Questions for Investigation

1. **Why doesn't the nested state navigation work?**
   - Is `CommonActions.reset` with nested `state` the correct approach?
   - Should we use a different navigation method?

2. **What is the actual screen structure in AuthStack?**
   - Is `OnboardingName` registered in the navigator that `PropertyInviteAcceptScreen` can navigate to?
   - Are there multiple `Auth` navigators causing confusion?

3. **Console warning about duplicate screen names:**
   ```
   Found screens with the same name nested inside one another. Check:
   Auth, Auth > Auth
   ```
   - This suggests there are nested navigators with the same name, which could cause navigation confusion

## Navigation Structure (from grep)

- `RootNavigator.tsx` - Top level, has `PropertyInviteAccept` screen
- `AuthStack.tsx` - Auth flow, has `OnboardingName`, `OnboardingAccount`, `PropertyInviteAccept`
- `MainStack.tsx` - Main app after auth, also has `PropertyInviteAccept`

## Possible Solutions to Try

1. **Direct navigation without nesting:**
   ```typescript
   navigation.navigate('OnboardingName', { fromInvite: true });
   ```

2. **Use navigation.reset with explicit routes array:**
   ```typescript
   navigation.reset({
     index: 0,
     routes: [{ name: 'OnboardingName', params: { fromInvite: true } }],
   });
   ```

3. **Navigate within the same stack (if already in AuthStack):**
   - Check if PropertyInviteAcceptScreen is already inside AuthStack
   - If so, simple `navigation.navigate('OnboardingName')` might work

4. **Check the navigator hierarchy:**
   - Trace exactly which navigator PropertyInviteAcceptScreen is rendered in
   - Ensure OnboardingName is accessible from that navigator

## How to Test

1. Start Metro: `REACT_NATIVE_PACKAGER_HOSTNAME=192.168.0.14 npx expo start --dev-client --port 8081`
2. Build for simulator: `npx expo run:ios --device "iPhone 13 Pro"`
3. Generate invite token (SQL in database)
4. Open link: `xcrun simctl openurl booted "exp+myailandlord://invite?t=TOKEN"`
5. Tap "Sign Up & Accept"
6. Observe which screen appears

## Resolution Summary

### Bug 1: Navigation to Wrong Screen
**Root Cause:** `Auth` is a Screen (`AuthScreen`), not a Navigator. Nested `state` in `CommonActions.reset` was ignored.
**Fix:** Changed to `navigation.navigate('OnboardingName', { fromInvite: true })` since both screens are in AuthStack.
**File:** `src/screens/tenant/PropertyInviteAcceptScreen.tsx`

### Bug 2: Invalid or Expired Invite Error
**Root Cause:** `signup_and_accept_invite` RPC computed hash WITHOUT salt, but invites use salted hashes.
**Fix:** Changed to `digest(p_token || i.token_salt, 'sha256')` to match how invites are created.
**File:** Database RPC `signup_and_accept_invite`

### Bug 3: Role Stayed "landlord" After Accepting Invite
**Root Cause:** TWO RPCs had `COALESCE(role, 'tenant')` which kept existing role. Since `useProfileSync` creates profiles with `role = 'landlord'` BEFORE the RPC runs, the tenant role was never set.
**Fix:** Changed both `accept_invite` and `signup_and_accept_invite` to always `SET role = 'tenant'` without COALESCE.
**Files:**
- `supabase/migrations/20260103_fix_accept_invite_role.sql` (new)
- Database RPCs updated directly

### Verified Working
- ✅ Existing users can accept invites and get role updated to tenant
- ✅ Property link is created correctly
- ✅ User lands on tenant home with property showing

## Environment

- React Navigation 6.x
- Expo dev client
- iOS Simulator iPhone 13 Pro (iOS 15.5)
- Metro bundler on port 8081
