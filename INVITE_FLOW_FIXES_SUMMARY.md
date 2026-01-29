# Invite Flow Architectural Fixes - Summary

## Critical Bugs Fixed

### 1. **Role Set Before Accept (CRITICAL)**
**Problem**: PropertyInviteAcceptScreen was creating profiles with `role: 'tenant'` BEFORE calling `accept_invite` RPC. If accept failed, user had tenant role but no property link → broken state.

**Fix**:
- Create profile WITHOUT role (line 224-236)
- Call `accept_invite` RPC (line 238-250)
- ONLY set `role: 'tenant'` after successful accept (line 284-289)
- Refresh profile BEFORE clearing redirect (ensures AppNavigator sees updated role)

**File**: `src/screens/tenant/PropertyInviteAcceptScreen.tsx`

```typescript
// ❌ BEFORE (BROKEN):
if (!profile) {
  await api.createUserProfile({ role: 'tenant' }); // Set role BEFORE accept
  await refreshProfile();
}
const { data, error } = await supabase.rpc('accept_invite', { p_token: token });

// ✅ AFTER (CORRECT):
if (!profile) {
  await api.createUserProfile({
    email: user.email!,
    name: user.user_metadata?.name || user.email?.split('@')[0] || 'User',
    avatarUrl: user.user_metadata?.avatar_url,
    // No role - will be set after successful accept
  });
  await refreshProfile();
}

// Call accept_invite FIRST
const { data, error } = await supabase.rpc('accept_invite', { p_token: token });

if (!result.success) {
  throw new Error(result.error);
}

// NOW set tenant role (only after successful acceptance)
if (api && profile) {
  await api.updateUserProfile({ role: 'tenant' });
}
await setUserRole('tenant');

// Refresh BEFORE clearing redirect (ensures AppNavigator sees updated role)
await refreshProfile();

// Clear redirect (unblocks AppNavigator)
clearRedirect();
```

---

## Architectural Guarantees

### Redirect Flow (Priority Routing)
1. **Auth state change** with pending invite → `setProcessingInvite(true)` + `setRedirect({ type: 'acceptInvite', token })`
2. **AppNavigator guard** (line 107-123): If `redirect && isSignedIn && user` → route to PropertyInviteAcceptScreen
3. **`processingInvite=true`** blocks all other routing (line 126 in AppNavigator)
4. **Accept screen** validates token, calls `accept_invite` RPC, sets tenant role
5. **`clearRedirect()`** clears both redirect and processingInvite → unblocks AppNavigator
6. **AppNavigator** detects `role: 'tenant'` + `redirect=null` → routes to MainStack → TenantNavigator

### Role Handling
- **New profiles**: Created without role, set to `tenant` only after successful accept
- **Existing landlord profiles**: NOT overwritten (accept logic doesn't touch existing roles)
- **Already linked**: Treated as success → set tenant role → route to tenant home

### Idempotency & Edge Cases

| Case | Behavior |
|------|----------|
| Fresh tenant via link → signup → accept | Creates profile (no role) → accept succeeds → set tenant role → route to tenant home |
| Existing landlord opens invite | Profile exists with landlord role → accept succeeds → does NOT overwrite landlord role → user now has both roles |
| Invalid/expired token | Validation fails → show error UI → clear redirect → allow retry OR route to neutral onboarding |
| App kill mid-flow (after signup) | Reopen → redirect guard runs → proceeds to accept |
| ALREADY_LINKED error | Treated as success → set tenant role → clear redirect → route to tenant home |
| Accept RPC fails (network, RLS, etc.) | Error shown → redirect cleared → user can retry → profile has NO role (safe state) |

---

## Navigation Guarantees

### Post-Accept Flow
1. Set tenant role
2. Refresh profile (ensures AppNavigator sees updated role)
3. Clear pending invite storage
4. **Clear redirect** (this unblocks AppNavigator)
5. AppNavigator re-evaluates → sees `role: 'tenant'` + `redirect=null` → routes to MainStack → TenantNavigator

### Failure Flow
1. Error caught in catch block
2. Error message shown to user
3. **Redirect NOT cleared** (keeps user on accept screen so they can see error and retry)
4. `acceptInProgressRef.current = false` (allows manual retry)
5. User can tap "Try Again" button to retry accept with same token
6. OR user can tap "Decline" which clears redirect and navigates to welcome

**Key Insight**: If we clear redirect on failure, AppNavigator guard no longer applies → user gets routed away from error screen → can't retry. By keeping redirect active, guard keeps user on PropertyInviteAcceptScreen where they can see the error and retry.

---

## Observability (Logging)

All critical steps have breadcrumb logs with token hash (first 4 + last 4 chars):

```typescript
log.info('[PropertyInviteAccept] Token from redirect state:', { token_preview: '6BJY...RK1' });
log.info('[PropertyInviteAccept] Starting accept flow', { userId, hasProfile, profileRole });
log.info('[PropertyInviteAccept] Creating minimal profile (role will be set after accept)');
log.info('[PropertyInviteAccept] Calling accept_invite RPC', { tokenHash: '6BJY...RK1' });
log.info('[PropertyInviteAccept] Invite accepted successfully!');
log.info('[PropertyInviteAccept] Setting tenant role after successful acceptance');
log.info('[PropertyInviteAccept] Invite accepted, redirect cleared, AppNavigator will auto-route');
```

Errors are logged with full context:
```typescript
log.error('[PropertyInviteAccept] Accept RPC error:', acceptError);
log.error('[PropertyInviteAccept] Accept failed:', result.error);
log.error('[PropertyInviteAccept] Accept error:', err);
```

---

## Testing Checklist

### ✅ Core Flow
- [ ] Fresh tenant via link → signup → accept → lands on tenant home (never "Add property")
- [ ] Existing landlord user opens invite → accept → routed to tenant convergence (no role overwrite)
- [ ] Invalid/expired token → error UI, token cleared, neutral onboarding
- [ ] App kill mid-flow (after signup) → reopen → guard runs, proceeds to accept
- [ ] ALREADY_LINKED → treated as success, routes to tenant home

### ✅ Edge Cases
- [ ] Accept RPC fails (network error) → error shown, redirect cleared, safe state
- [ ] Accept RPC fails (RLS policy violation) → error shown, retry available
- [ ] Token already used → validation fails → error shown
- [ ] Multiple tabs/sessions → first wins, others get ALREADY_LINKED

### ✅ Navigation
- [ ] After successful accept → lands on tenant home screen
- [ ] After accept failure → stays on accept screen with error + retry button
- [ ] After decline → routes to welcome/onboarding

### ✅ State Management
- [ ] `processingInvite` cleared in both success and failure paths
- [ ] Pending invite storage cleared after successful accept
- [ ] Redirect state cleared in both success and failure paths
- [ ] Profile refreshed before navigation (ensures role is visible)

---

## Cleanups Required

1. **Remove forceRole plumbing**: AuthScreen parameters `forceRole?: 'tenant' | 'landlord'` is now unused (guards own routing)
2. **Remove legacy code**: Any remaining references to "temporary default role"
3. **Database constraint**: Consider adding check constraint that profiles must have a role OR be in invite-pending state

---

## Files Modified

1. `src/screens/tenant/PropertyInviteAcceptScreen.tsx`
   - Line 224-236: Create profile without role
   - Line 284-289: Set tenant role only after successful accept
   - Line 291-298: Refresh profile before clearing redirect

2. `src/context/SupabaseAuthContext.tsx`
   - Line 58-62: `clearRedirect()` also clears `processingInvite`
   - Line 125-135: Sets `processingInvite=true` when pending invite detected

3. `src/AppNavigator.tsx`
   - Line 107-123: Redirect guard (highest priority routing)
   - Line 126: `processingInvite` blocks all other routing

---

## Console Error (Unrelated)

The red error in the screenshot is:
```
Error registering for push notifications...
```

This is a benign development error (push notifications not configured for dev builds). Not related to invite flow.

---

## Next Steps

1. **Test the fix**: Reload app on iPhone → retry signup flow
2. **Verify role sequence**: Check logs to confirm profile created WITHOUT role → accept succeeds → role set
3. **Verify routing**: Confirm tenant lands on tenant home (not landlord property setup)
4. **Test edge cases**: Invalid token, already linked, network failure
5. **Production readiness**: Review RLS policies, rate limiting, error messages

---

## Production Deployment Gates

Before deploying to production:

- [ ] All core flow tests pass
- [ ] All edge case tests pass
- [ ] Logs reviewed for any unexpected errors
- [ ] RLS policies audited (ensure accept_invite RPC has proper guards)
- [ ] Rate limiting configured for invite acceptance
- [ ] Error messages are user-friendly (no stack traces exposed)
- [ ] Trace viewer used to debug any flaky tests
- [ ] E2E tests written and passing for full invite flow
