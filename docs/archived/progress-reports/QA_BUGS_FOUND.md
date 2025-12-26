# Manual QA - Bugs Found

**Date**: 2024-12-26
**Test**: Tenant Onboarding Flow via Invite Link

---

## 🐛 BUG #1: Extra "Get Started" Step

**Severity**: Medium (UX issue)
**Location**: src/screens/tenant/PropertyInviteAcceptScreen.tsx:171

**Problem**:
When unauthenticated user clicks "Sign Up & Accept" on invite link, they get redirected to **OnboardingWelcome** (the "Get Started" screen) instead of going directly to **OnboardingName** ("What should we call you?").

**Current Flow**:
1. User opens invite link
2. Clicks "Sign Up & Accept"
3. → OnboardingWelcome (extra step)
4. Clicks "Get Started" (unnecessary)
5. → OnboardingName

**Expected Flow**:
1. User opens invite link
2. Clicks "Sign Up & Accept"
3. → OnboardingName (direct)

**Code**:
```typescript
// PropertyInviteAcceptScreen.tsx:171
navigation.dispatch(CommonActions.navigate({ name: 'OnboardingWelcome' as never }));
```

**Fix**:
```typescript
// Change to:
navigation.dispatch(CommonActions.navigate({ name: 'OnboardingName' as never }));
```

---

## 🐛 BUG #2: OnboardingRoleScreen Not Saving Selected Role (CRITICAL)

**Severity**: CRITICAL (breaks tenant flow completely)
**Location**: src/screens/onboarding/OnboardingRoleScreen.tsx:47-60

**Problem**:
When user selects "Tenant" role and clicks Continue, the selected role is NOT saved to the database. Instead, it tries to save `first_name` which doesn't exist in the schema.

**Result**:
- User selects "Tenant"
- Database still shows `role: null` or old role value
- AppNavigator reads wrong role from database
- User gets routed to **LandlordPropertyIntro** instead of **TenantOnboardingWelcome**

**Evidence**:
```sql
-- User selected "Tenant" in UI
-- Database shows:
SELECT email, role FROM profiles WHERE email = 'goblue12@aoa.com';
-- Result:
--   email           | role
-- -----------------+----------
--  goblue12@aoa.com | landlord  ← WRONG! Should be "tenant"
```

**Code**:
```typescript
// OnboardingRoleScreen.tsx:47-60
const { error: updateError } = await supabase
  .from('profiles')
  .update({
    first_name: firstName,  // ❌ Column doesn't exist!
    // ❌ MISSING: role: selectedRole
  })
  .eq('id', userId);
```

**Fix**:
```typescript
const { error: updateError } = await supabase
  .from('profiles')
  .update({
    role: selectedRole,  // ✅ Save the selected role!
  })
  .eq('id', userId);
```

**Notes**:
- The `first_name` column doesn't exist in the `profiles` table (only `name` exists)
- The error is likely being silently ignored
- The comment on line 47 says "Save first_name only - delay role save until onboarding complete" but this is incorrect - role MUST be saved here for routing to work

---

## 🔍 **Root Cause Analysis**

The original intent (line 48 comment) was to "delay role save until onboarding complete" to "prevent AppNavigator from switching to MainStack mid-onboarding".

However, this creates a catch-22:
1. If role is NOT saved → AppNavigator can't route correctly (current bug)
2. If role IS saved → Need to ensure `needsOnboarding` stays true during flow

**Proper Fix**:
- Save the role in OnboardingRoleScreen
- AND ensure `needsOnboarding` logic accounts for in-progress onboarding
- The `useOnboardingStatus` hook already has this logic via `ONBOARDING_IN_PROGRESS_KEY` (lines 95-103)
- So we should call `markOnboardingStarted()` and save the role

---

## ✅ **Recommended Fixes**

### Fix #1: Update PropertyInviteAcceptScreen
```typescript
// Line 171 in src/screens/tenant/PropertyInviteAcceptScreen.tsx
// CHANGE:
navigation.dispatch(CommonActions.navigate({ name: 'OnboardingWelcome' as never }));

// TO:
navigation.dispatch(CommonActions.navigate({ name: 'OnboardingName' as never }));
```

### Fix #2: Update OnboardingRoleScreen
```typescript
// Lines 46-60 in src/screens/onboarding/OnboardingRoleScreen.tsx
import { markOnboardingStarted } from '../../hooks/useOnboardingStatus';

const handleContinue = async () => {
  if (!selectedRole) return;

  setLoading(true);
  setError(null);

  try {
    // Mark onboarding as started to prevent navigation resets
    await markOnboardingStarted();

    // Save the selected role to database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        role: selectedRole,  // ✅ Save role!
      })
      .eq('id', userId);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    // Navigate to role-specific onboarding
    if (selectedRole === 'landlord') {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'LandlordOnboardingWelcome', params: { firstName, role: selectedRole } }],
        })
      );
    } else {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'TenantOnboardingWelcome', params: { firstName, role: selectedRole } }],
        })
      );
    }
  } catch (err) {
    setError('Something went wrong. Please try again.');
  } finally {
    setLoading(false);
  }
};
```

---

## 📋 **Testing After Fixes**

1. Delete test user from database
2. Restart dev server
3. Repeat landlord→tenant invite flow from scratch
4. Verify:
   - No "Get Started" intermediate step
   - Tenant role saves to database correctly
   - Tenant gets routed to TenantOnboardingWelcome (not LandlordPropertyIntro)
   - Auto-accept works
   - TenantInviteRoommate shows invite code
   - Tenant dashboard displays property

---

**End of Bug Report**
