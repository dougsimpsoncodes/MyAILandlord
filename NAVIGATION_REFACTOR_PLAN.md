# Zero-Flash Navigation Refactor - Implementation Plan

Based on Codex architectural guidance, this refactor will eliminate screen flashing during invite acceptance flow.

## Objectives

✅ **Single NavigationContainer** - Never swap navigator trees
✅ **Centralized routing decisions** - BootstrapScreen computes destination once
✅ **Explicit navigation** - Use `navigation.reset()` instead of relying on AppNavigator guards
✅ **Deferred cleanup** - Clean up state after navigation completes
✅ **Zero flashing** - Smooth transition from signup → tenant home

## Architecture Changes

### Before (Current)
```
AppNavigator (conditionally renders different containers)
  ├─ if (redirect) → <NavigationContainer><AuthStack /></NavigationContainer>
  ├─ else if (loading) → <LoadingScreen />
  └─ else if (authenticated) → <NavigationContainer><MainStack /></NavigationContainer>
```

### After (Refactored)
```
AppNavigator
  └─ <NavigationContainer>
      └─ RootNavigator
          ├─ Bootstrap (decides destination, resets once)
          ├─ Auth (AuthStack)
          ├─ InviteAccept (PropertyInviteAcceptScreen)
          └─ Main (MainStack → Landlord/Tenant navigators)
```

## Step-by-Step Implementation

### Step 1: Create RootNavigator with BootstrapScreen
**File:** `src/navigation/RootNavigator.tsx` (NEW)

**Tasks:**
- [ ] Create RootStackParamList type
- [ ] Implement BootstrapScreen component
  - [ ] Decision logic: unauthenticated → Auth
  - [ ] Decision logic: pending invite → InviteAccept
  - [ ] Decision logic: authenticated → Main
  - [ ] Use `decidedRef` to ensure single decision
- [ ] Create static Stack.Navigator with all routes
- [ ] Add full-screen loading overlay during decision

**Key Code:**
```tsx
const decide = async () => {
  if (!isSignedIn) {
    navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
    return;
  }

  const pending = await PendingInviteService.getPendingInvite();
  if (pending?.type === 'token') {
    navigation.reset({ index: 0, routes: [{ name: 'InviteAccept' }] });
    return;
  }

  navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
};
```

### Step 2: Simplify AppNavigator
**File:** `src/AppNavigator.tsx` (REFACTOR)

**Tasks:**
- [ ] Remove all conditional navigator returns
- [ ] Remove redirect guard
- [ ] Remove loading guard
- [ ] Remove shouldShowMainStack logic
- [ ] Replace with single `<NavigationContainer><RootNavigator /></NavigationContainer>`

**Before (64 lines):**
```tsx
if (redirect && redirect.type === 'acceptInvite') {
  return <NavigationContainer><AuthStack initialInvite={true} /></NavigationContainer>;
}
if (isLoading || roleLoading || processingInvite) {
  return <LoadingScreen />;
}
return (
  <NavigationContainer>
    {shouldShowMainStack ? <MainStack /> : <AuthStack />}
  </NavigationContainer>
);
```

**After (6 lines):**
```tsx
return (
  <NavigationContainer>
    <RootNavigator />
  </NavigationContainer>
);
```

### Step 3: Refactor PropertyInviteAcceptScreen
**File:** `src/screens/tenant/PropertyInviteAcceptScreen.tsx` (REFACTOR)

**Tasks:**
- [ ] Import `InteractionManager` from 'react-native'
- [ ] Import `CommonActions` from '@react-navigation/native'
- [ ] After successful acceptance, use `navigation.reset()` to tenant destination
- [ ] Defer cleanup using `InteractionManager.runAfterInteractions()`
- [ ] Add local overlay during `acceptInProgress`

**Key Changes:**
```tsx
// After accept_invite succeeds
navigation.dispatch(
  CommonActions.reset({
    index: 0,
    routes: [{
      name: 'Main',
      state: {
        routes: [{
          name: 'TenantNavigator',
          state: { routes: [{ name: 'TenantHome' }] }
        }]
      }
    }]
  })
);

// Cleanup AFTER navigation completes
InteractionManager.runAfterInteractions(async () => {
  await refreshProfile();
  await PendingInviteService.clearPendingInvite();
  clearRedirect();
});
```

**Overlay to prevent flashing:**
```tsx
{acceptInProgress && (
  <View style={StyleSheet.absoluteFill}>
    <ActivityIndicator />
  </View>
)}
```

### Step 4: Determine Exact Nested Route Names
**Files to check:**
- `src/navigation/MainStack.tsx`
- `src/navigation/TenantNavigator.tsx`

**Tasks:**
- [ ] Verify MainStack route name (probably "Main")
- [ ] Verify TenantNavigator route name inside MainStack
- [ ] Verify TenantHome screen name inside TenantNavigator
- [ ] Update reset() call with exact route hierarchy

### Step 5: Remove/Update Dependent Code
**Tasks:**
- [ ] Remove `initialInvite` prop from AuthStack (no longer needed)
- [ ] Remove redirect guard logic from AppNavigator
- [ ] Consider removing `processingInvite` flag (may no longer be needed)
- [ ] Update any components that check `redirect` state

### Step 6: Testing
**Tasks:**
- [ ] Test fresh invite flow (unauthenticated → invite link → signup → tenant home)
- [ ] Test existing user invite flow (authenticated landlord opens invite)
- [ ] Test normal signup (no invite)
- [ ] Test normal login (existing user)
- [ ] Verify NO intermediate screen flashes
- [ ] Verify proper cleanup (AsyncStorage cleared, redirect cleared)
- [ ] Test on both iOS and Android

## Expected Outcomes

### Before Refactor
```
User Flow: Invite → Signup → [Flash: Welcome] → [Flash: Onboarding] → Tenant Home
Re-renders: 6-8 AppNavigator re-renders during transition
```

### After Refactor
```
User Flow: Invite → Signup → Tenant Home (smooth, single transition)
Re-renders: 1 navigation.reset() call, zero intermediate screens
```

## Rollback Plan

If issues arise:
1. Keep old `AppNavigator.tsx` as `AppNavigator.old.tsx`
2. Keep old `PropertyInviteAcceptScreen.tsx` in git history
3. Can revert by restoring old files and removing `RootNavigator.tsx`

## Estimated Effort

- **Step 1 (RootNavigator):** 30 minutes
- **Step 2 (Simplify AppNavigator):** 10 minutes
- **Step 3 (Refactor InviteAccept):** 20 minutes
- **Step 4 (Route names):** 10 minutes
- **Step 5 (Cleanup):** 15 minutes
- **Step 6 (Testing):** 30 minutes

**Total:** ~2 hours

## Migration Checklist

- [ ] Create `src/navigation/RootNavigator.tsx`
- [ ] Define `RootStackParamList` type
- [ ] Implement `BootstrapScreen` with decision logic
- [ ] Simplify `AppNavigator.tsx` to single container
- [ ] Refactor `PropertyInviteAcceptScreen` with reset + deferred cleanup
- [ ] Verify nested route names for tenant destination
- [ ] Add overlay during acceptance processing
- [ ] Remove `initialInvite` prop from AuthStack
- [ ] Test all authentication flows
- [ ] Verify zero intermediate screen flashes
- [ ] Update documentation

## Success Criteria

✅ Zero intermediate screen flashes during invite acceptance
✅ Single `navigation.reset()` call to final destination
✅ Clean AppNavigator (<10 lines)
✅ Centralized routing decisions in BootstrapScreen
✅ All existing flows work (signup, login, invites)
✅ Code is more maintainable and follows React Navigation best practices

## Notes

- This is a structural improvement that will benefit ALL future navigation flows
- The pattern scales: any complex flow can use `reset()` to final destination + deferred cleanup
- Consider applying same pattern to landlord onboarding flow in the future
- Document this pattern in `ARCHITECTURE.md` for team reference
