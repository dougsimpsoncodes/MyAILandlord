# Navigation Flashing Issue - Expert Architecture Review Needed

## Problem Statement

Our React Native app (Expo, React Navigation) has a tenant invite acceptance flow that works functionally but shows intermediate screen flashes during state transitions. After a user signs up via an invite link, they briefly see:

1. Welcome screen (flash)
2. Onboarding screen (flash)
3. Finally: Tenant Home screen (correct destination)

This creates a jarring UX. We need architectural advice on the proper React Navigation pattern to eliminate these intermediate renders.

## Current Architecture

### Navigation Structure
```
App.tsx
  └─ AppNavigator.tsx (decides which stack to show)
      ├─ AuthStack (unauthenticated users)
      │   └─ PropertyInviteAcceptScreen (handles invite acceptance)
      └─ MainStack (authenticated users with role)
          ├─ LandlordNavigator (role='landlord')
          └─ TenantNavigator (role='tenant')
```

### State Dependencies

AppNavigator makes routing decisions based on multiple async state sources:

```typescript
const AppNavigator = () => {
  const { user, isSignedIn, isLoading, redirect, processingInvite } = useAppAuth();
  const { userRole, isLoading: roleLoading } = useContext(RoleContext);
  const { needsOnboarding, isLoading: onboardingLoading } = useOnboarding();
  const { profile, isLoading: profileLoading } = useProfile();

  // Multiple routing guards based on cascading state
  if (redirect && redirect.type === 'acceptInvite' && isSignedIn && user) {
    return <NavigationContainer><AuthStack initialInvite={true} /></NavigationContainer>;
  }

  if (isLoading || roleLoading || onboardingLoading || !isReady || processingInvite) {
    return <LoadingScreen />;
  }

  const shouldShowMainStack = isSignedIn && user && userRole;

  return (
    <NavigationContainer>
      {shouldShowMainStack ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
};
```

## The Invite Acceptance Flow

### Sequence of Events

```
1. User opens invite link (unauthenticated)
   → PropertyInviteAcceptScreen shows property details

2. User taps "Sign Up & Accept"
   → Saves invite token to AsyncStorage
   → Navigates to AuthScreen (signup form)

3. User completes signup
   → Auth state changes: isSignedIn=true, user={...}
   → AppNavigator re-renders

4. Auth guard detects pending invite in AsyncStorage
   → Sets redirect={type: 'acceptInvite', token: '...'}
   → Sets processingInvite=true
   → AppNavigator re-renders → shows PropertyInviteAcceptScreen

5. PropertyInviteAcceptScreen auto-accepts invite
   → Creates profile WITHOUT role
   → Calls accept_invite RPC (sets role='tenant' in database)
   → Refreshes profile from database
   → Clears redirect state
   → AppNavigator re-renders

6. AppNavigator sees isSignedIn=true, userRole='tenant'
   → Routes to MainStack → TenantNavigator
```

### The Problem: Multiple Re-renders

**Log evidence of the flashing (actual production logs):**

```
LOG  🧭 Navigation decision: {
  "shouldShowMainStack": null,        ← First render: no role yet
  "userRole": null
}

LOG  🧭 Redirect guard triggered: Routing to PropertyInviteAccept

LOG  🧭 Navigation decision: {
  "needsOnboarding": true,            ← Second render: brief onboarding check
  "hasRole": false,
  "userRole": null
}

LOG  useProfileSync: role determination: {
  "existingRole": "tenant",           ← Third render: role loaded
  "finalRole": "tenant"
}

LOG  🧭 Navigation decision: {
  "shouldShowMainStack": "tenant",    ← Fourth render: correct destination
  "userRole": "tenant"
}
```

**Each navigation decision triggers a screen mount/unmount**, causing the flashing.

## Code Contributing to the Issue

### 1. AppNavigator.tsx - Multiple Rendering Conditions

```typescript
// src/AppNavigator.tsx (lines 106-150)

// GUARD 1: Redirect guard (highest priority)
if (redirect && redirect.type === 'acceptInvite' && isSignedIn && user) {
  return (
    <NavigationContainer>
      <AuthStack initialInvite={true} />
    </NavigationContainer>
  );
}

// GUARD 2: Loading guard
if (isLoading || roleLoading || onboardingLoading || !isReady || processingInvite) {
  return <LoadingScreen message={processingInvite ? 'Processing invite...' : 'Checking authentication...'} />;
}

// GUARD 3: Main routing decision
const isFullyAuthenticated = isSignedIn && user && userRole;
const shouldShowMainStack = authDisabled ? true : isFullyAuthenticated;

return (
  <NavigationContainer>
    {shouldShowMainStack ? <MainStack /> : <AuthStack />}
  </NavigationContainer>
);
```

**Issue**: Each guard triggers a different NavigationContainer render. When state transitions from `redirect=true` → `redirect=null` + `userRole='tenant'`, it causes a full navigation tree swap.

### 2. PropertyInviteAcceptScreen.tsx - Sequential State Updates

```typescript
// src/screens/tenant/PropertyInviteAcceptScreen.tsx (lines 280-310)

// After successful acceptance
const result = await supabase.rpc('accept_invite', { p_token: token });

if (result.data?.success) {
  // State update 1: Refresh profile (triggers AppNavigator re-render)
  await refreshProfile();

  // State update 2: Clear pending invite storage
  await PendingInviteService.clearPendingInvite();

  // State update 3: Clear redirect state (triggers AppNavigator re-render)
  clearRedirect();

  // AppNavigator re-evaluates → routes to tenant home
}
```

**Issue**: Three sequential async operations, each potentially triggering AppNavigator re-renders.

### 3. useProfileSync Hook - Race Condition Protection (Fixed)

```typescript
// src/hooks/useProfileSync.ts (lines 43-58)

// CRITICAL: Skip profile creation if pending invite exists
if (processingInvite) {
  log.info('useProfileSync: Skipping - pending invite is being processed');
  return;
}

const pendingInvite = await PendingInviteService.getPendingInvite();
if (pendingInvite && !profile) {
  log.info('useProfileSync: Skipping profile creation - pending invite detected', {
    inviteType: pendingInvite.type,
    hasProfile: !!profile,
  });
  return;
}
```

**This fix prevents the race condition** (creating profile with wrong role) **but doesn't address the navigation flashing**.

## Current Workarounds Considered

### Option A: Loading Overlay (Band-Aid)
Keep a "Processing invite..." overlay visible during the entire transition to hide flashing.

**Pros**: Quick fix, hides the symptom
**Cons**: Doesn't solve root cause, adds perceived latency

### Option B: Batch State Updates
Update `redirect`, `profile`, and `role` in one atomic operation.

**Pros**: Reduces number of re-renders
**Cons**: Requires refactoring context providers

### Option C: navigation.reset() API
Use React Navigation's `reset()` to programmatically navigate without relying on AppNavigator guards.

```typescript
// Hypothetical refactor
navigation.reset({
  index: 0,
  routes: [{ name: 'TenantHome' }],
});
```

**Pros**: Clean, direct navigation
**Cons**: Requires understanding where/when to call it

## Questions for Codex

1. **Architectural Pattern**: What's the recommended React Navigation pattern for complex authentication flows with multiple state dependencies (user, profile, role, redirect)?

2. **State Coordination**: How should we coordinate `redirect` clearing with `role` assignment to prevent intermediate renders? Should we use a state machine?

3. **Navigation API**: Should we use `navigation.reset()` after invite acceptance instead of relying on AppNavigator guards to detect state changes?

4. **Loading States**: Is there a pattern to "freeze" the current screen during async state transitions (similar to React Suspense) so users don't see intermediate screens?

5. **Context Re-renders**: We have 4 context providers (Auth, Profile, Role, Onboarding) - is this causing excessive re-renders? Should we consolidate?

6. **Best Practice**: For a "world-class app", what's the gold standard approach to handle:
   - User signs up → Immediate post-signup action (accept invite) → Route to final destination

   Without showing intermediate screens?

## Environment

- React Native: Expo SDK 54
- React Navigation: v6
- State Management: React Context (multiple providers)
- Authentication: Supabase Auth
- Platform: iOS + Android

## Desired Outcome

**User should see:**
1. PropertyInviteAccept screen (with property details)
2. Signup form
3. **Smooth transition directly to Tenant Home** (no flashing)

**Current behavior:**
1. PropertyInviteAccept screen
2. Signup form
3. ❌ Brief flash of Welcome screen
4. ❌ Brief flash of Onboarding screen
5. ✅ Tenant Home (correct, but jarring journey)

## Success Criteria

- Zero intermediate screen flashes
- Clean, maintainable navigation architecture
- Follows React Navigation best practices
- Scales to future complex flows (e.g., invite → onboarding → main app)

---

**Please provide architectural guidance on the best approach to eliminate these intermediate renders while maintaining clean, testable code.**
