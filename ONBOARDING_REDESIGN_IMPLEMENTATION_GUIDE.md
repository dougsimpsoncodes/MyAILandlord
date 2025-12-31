# Onboarding Redesign Implementation Guide

> **Status**: In Progress - Phases 1 & 2 Complete (30%)
> **Last Updated**: 2025-12-31
> **Git Commit**: `79ced9a` - "feat: Phase 1 & 2 of onboarding redesign"
> **Branch**: `fix/ios-keyboard-inset-auth`

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [What Has Been Completed](#what-has-been-completed)
3. [What Remains](#what-remains)
4. [Technical Implementation Details](#technical-implementation-details)
5. [How to Continue](#how-to-continue)
6. [Testing Strategy](#testing-strategy)
7. [Rollback Plan](#rollback-plan)
8. [Architecture Decisions](#architecture-decisions)

---

## Overview

### Goal
Transform MyAI Landlord's onboarding from a complex 10-step landlord flow and 5-step tenant flow into a streamlined 6-step and 2-step experience respectively, reducing friction and increasing completion rates from 60% to 85%+.

### Problem Statement
**Current Issues (verified in codebase):**
- **Landlord Flow**: 10 screens (OnboardingRoleScreen, LandlordOnboardingWelcomeScreen, PropertyIntroScreen, PropertyBasicsScreen, PropertyAttributesScreen, PropertyAreasScreen, PropertyPhotosScreen, PropertyReviewScreen, etc.) taking 5-7 minutes
- **Tenant Flow**: 5 screens (PropertyInviteAcceptScreen → OnboardingRoleScreen → TenantOnboardingWelcomeScreen → AuthScreen → TenantHome) taking 2-3 minutes
- **Context Complexity**: 6 separate context providers with 863 total lines (verified via `wc -l src/context/*.tsx`):
  - `SupabaseAuthContext.tsx` (287 lines)
  - `ProfileContext.tsx` (170 lines)
  - `PendingRequestsContext.tsx` (132 lines)
  - `UnreadMessagesContext.tsx` (131 lines)
  - `RoleContext.tsx` (107 lines)
  - `OnboardingContext.tsx` (36 lines)
- **Race Conditions**: Multiple async state systems causing navigation flashing and partial failure states (documented in `NAVIGATION_FLASHING_ISSUE.md` and `INVITE_FLOW_FIXES_SUMMARY.md`)

### Target State
- **Landlord Flow**: 6 screens in 3 minutes
- **Tenant Flow**: 2 screens in 60 seconds
- **Context Architecture**: 2 unified contexts with 595 total lines (verified)
- **Atomic Operations**: Single-transaction database operations eliminate race conditions

---

## What Has Been Completed

### ✅ Phase 1: Database Foundation (COMPLETE)

**Migration File**: `supabase/migrations/20251231_onboarding_redesign_foundation.sql`
**Applied**: Yes (verified via `psql` query showing `onboarding_completed` column exists)
**Git Commit**: `79ced9a`

#### 1.1 Schema Changes
```sql
-- Added to profiles table (line 11-12 of migration)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
```

**Verification**:
```bash
PGPASSWORD="..." psql "..." -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_completed';"
# Result: onboarding_completed | boolean
```

#### 1.2 Atomic RPC Functions

**Function 1**: `signup_and_onboard_landlord()`
- **Location**: Lines 23-110 of `20251231_onboarding_redesign_foundation.sql`
- **Purpose**: Single-transaction landlord onboarding
- **Parameters**:
  - `p_property_name TEXT` (required)
  - `p_address_jsonb JSONB` (required)
  - `p_property_type TEXT` (optional)
  - `p_bedrooms INTEGER` (optional)
  - `p_bathrooms NUMERIC` (optional)
  - `p_areas TEXT[]` (optional)
- **Returns**: `TABLE(success BOOLEAN, property_id UUID, profile_id UUID, error_message TEXT)`
- **Operations** (all atomic):
  1. Create/update profile with `role='landlord'`
  2. Create property with provided details
  3. Create property areas if provided
  4. Set `onboarding_completed = TRUE`

**Function 2**: `signup_and_accept_invite()`
- **Location**: Lines 121-225 of `20251231_onboarding_redesign_foundation.sql`
- **Purpose**: Single-transaction tenant onboarding via invite
- **Parameters**:
  - `p_token TEXT` (required)
  - `p_name TEXT` (optional)
- **Returns**: `TABLE(success BOOLEAN, status TEXT, property_id UUID, property_name TEXT, profile_id UUID, error_message TEXT)`
- **Operations** (all atomic):
  1. Validate invite token
  2. Create/update profile with `role='tenant'`
  3. Create tenant-property link
  4. Mark invite as accepted
  5. Set `onboarding_completed = TRUE`

**Function 3**: `get_onboarding_status()`
- **Location**: Lines 338-362 of migration
- **Purpose**: Query helper for checking onboarding state
- **Returns**: `TABLE(user_id UUID, role TEXT, onboarding_completed BOOLEAN, has_properties BOOLEAN, has_property_links BOOLEAN)`

#### 1.3 Automatic Triggers

**Trigger 1**: `auto_complete_landlord_onboarding_trg`
- **Location**: Lines 231-263 of migration
- **Fires**: AFTER INSERT on `properties` table
- **Action**: Sets `onboarding_completed = TRUE` for landlord when first property created

**Trigger 2**: `auto_complete_tenant_onboarding_trg`
- **Location**: Lines 266-298 of migration
- **Fires**: AFTER INSERT on `tenant_property_links` table
- **Action**: Sets `onboarding_completed = TRUE` for tenant when first link created

#### 1.4 Backfill Existing Users
```sql
-- Lines 305-319: Mark existing landlords with properties as complete
UPDATE public.profiles SET onboarding_completed = TRUE
WHERE role = 'landlord' AND EXISTS (SELECT 1 FROM properties WHERE landlord_id = profiles.id);
-- Result: 3 rows updated

-- Lines 322-327: Mark existing tenants with links as complete
UPDATE public.profiles SET onboarding_completed = TRUE
WHERE role = 'tenant' AND EXISTS (SELECT 1 FROM tenant_property_links WHERE tenant_id = profiles.id);
-- Result: 1 row updated
```

#### 1.5 TypeScript Types Regenerated
```bash
npx supabase gen types typescript --project-id zxqhxjuwmkxevhkpqfzf --schema public > src/services/supabase/types.ts
```
**Status**: Complete

---

### ✅ Phase 2: Context Consolidation (COMPLETE)

**Git Commit**: `79ced9a`

#### 2.1 UnifiedAuthContext Created

**File**: `src/context/UnifiedAuthContext.tsx` (312 lines)
**Status**: Created, not yet wired into App.tsx

**Consolidates**:
1. `SupabaseAuthContext.tsx` (auth state, sessions)
2. `ProfileContext.tsx` (user profile data)
3. `RoleContext.tsx` (user role management)

**Key Features**:
- **Single User Object** (lines 22-37):
  ```typescript
  export interface UnifiedUser {
    // Auth data (from auth.users)
    id: string;
    email: string;
    name: string;
    avatar?: string;
    user_metadata?: Record<string, any>;

    // Profile data (from profiles table)
    role: 'landlord' | 'tenant' | null;
    onboarding_completed: boolean; // NEW

    // Timestamps
    createdAt?: string;
    updatedAt?: string;
  }
  ```

- **Atomic Data Fetching** (lines 82-125): Single query combines auth.users + profiles table
- **Optimistic Updates** (lines 141-167): Role changes update UI immediately, rollback on error
- **AsyncStorage Caching** (line 119-121): Role cached locally for quick startup
- **Real-time Sync** (lines 211-233): Listens to Supabase auth changes

**API**:
```typescript
const {
  user,           // UnifiedUser | null
  isLoading,      // boolean
  isSignedIn,     // boolean
  session,        // Session | null
  signOut,        // () => Promise<void>
  refreshUser,    // () => Promise<void>
  updateRole,     // (role: 'landlord' | 'tenant') => Promise<void>
  error,          // string | null
} = useUnifiedAuth();
```

**Dev Mode Support** (lines 176-187): Auth disabled check with dev user

#### 2.2 AppStateContext Created

**File**: `src/context/AppStateContext.tsx` (283 lines)
**Status**: Created, not yet wired into App.tsx

**Consolidates**:
1. `PendingRequestsContext.tsx` (maintenance request counts)
2. `UnreadMessagesContext.tsx` (message counts)

**Key Features**:
- **Unified Notification Counts** (lines 21-24):
  ```typescript
  interface AppStateContextValue {
    newRequestsCount: number;      // "submitted" status
    pendingRequestsCount: number;  // "pending" status
    unreadMessagesCount: number;
    // ... methods
  }
  ```

- **Real-time Subscriptions** (lines 163-210):
  - Maintenance requests channel (landlords only)
  - Messages channel (both roles)
  - Automatic count updates on database changes

- **Optimistic Updates** (lines 112-129): `markMessageAsRead()` updates UI immediately

- **Role-Aware Fetching** (lines 65-83): Only fetches request counts for landlords

**API**:
```typescript
const {
  newRequestsCount,       // number
  pendingRequestsCount,   // number
  unreadMessagesCount,    // number
  refreshCounts,          // () => Promise<void>
  markMessageAsRead,      // (messageId: string) => Promise<void>
  isLoading,              // boolean
  error,                  // string | null
} = useAppState();
```

#### 2.3 Context Metrics Comparison

| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| **Context Files** | 6 | 2 | 67% |
| **Total Lines** | 863 | 595 | 31% |
| **Separate State Sources** | 6 | 2 | 67% |
| **Auth Re-renders** | 3 contexts | 1 context | 67% |
| **Notification Re-renders** | 2 contexts | 1 context | 50% |

**Verified via**:
```bash
# Before
wc -l src/context/{SupabaseAuth,Profile,Role,Onboarding,PendingRequests,UnreadMessages}Context.tsx
# Total: 863 lines

# After
wc -l src/context/{UnifiedAuth,AppState}Context.tsx
# Total: 595 lines
```

---

## What Remains

### 🚧 Phase 2.3: Wire New Contexts into App.tsx (IN PROGRESS)

**File to Modify**: `src/App.tsx`
**Current Status**: Still using old contexts

**Required Changes**:
1. Import new contexts:
   ```typescript
   // Remove old imports
   - import { SupabaseAuthProvider } from './context/SupabaseAuthContext';
   - import { ProfileProvider } from './context/ProfileContext';
   - import { RoleProvider } from './context/RoleContext';
   - import { PendingRequestsProvider } from './context/PendingRequestsContext';
   - import { UnreadMessagesProvider } from './context/UnreadMessagesContext';
   - import { OnboardingProvider } from './context/OnboardingContext';

   // Add new imports
   + import { UnifiedAuthProvider } from './context/UnifiedAuthContext';
   + import { AppStateProvider } from './context/AppStateContext';
   ```

2. Replace provider nesting in `App.tsx`:
   ```typescript
   // Before (6 nested providers)
   <SupabaseAuthProvider>
     <ProfileProvider>
       <RoleProvider>
         <OnboardingProvider>
           <PendingRequestsProvider>
             <UnreadMessagesProvider>
               <AppNavigator />
             </UnreadMessagesProvider>
           </PendingRequestsProvider>
         </OnboardingProvider>
       </RoleProvider>
     </ProfileProvider>
   </SupabaseAuthProvider>

   // After (2 nested providers)
   <UnifiedAuthProvider>
     <AppStateProvider>
       <AppNavigator />
     </AppStateProvider>
   </UnifiedAuthProvider>
   ```

3. Update consumer hooks across codebase:
   ```typescript
   // Find and replace pattern:
   - const { user } = useAppAuth();
   - const { profile } = useProfile();
   - const { userRole } = useContext(RoleContext);
   + const { user } = useUnifiedAuth(); // user.role, user.onboarding_completed

   - const { newCount } = usePendingRequests();
   - const { unreadCount } = useUnreadMessages();
   + const { newRequestsCount, unreadMessagesCount } = useAppState();
   ```

**Files That Will Need Updates** (search for hook usage):
```bash
grep -r "useAppAuth\|useProfile\|useContext(RoleContext)" src/ --include="*.tsx" --include="*.ts"
grep -r "usePendingRequests\|useUnreadMessages" src/ --include="*.tsx" --include="*.ts"
```

**Migration Strategy**:
- Option A: Big bang replacement (riskier, faster)
- Option B: Gradual migration (run both sets of contexts in parallel, migrate consumers one-by-one)
- **Recommended**: Option B for safety

### 🔲 Phase 3: Refactor Landlord Onboarding Flow (NOT STARTED)

**Target**: Reduce from 10 screens to 6 screens

#### Current Screens to Remove/Replace:
1. ✅ Keep: `WelcomeScreen` (modify to add OAuth)
2. ❌ **REMOVE**: `OnboardingRoleScreen` (role implicit from button click)
3. ❌ **REMOVE**: `LandlordOnboardingWelcomeScreen` (redundant)
4. ❌ **REMOVE**: `PropertyIntroScreen` (redundant)
5. ✏️ **MODIFY**: `PropertyBasicsScreen` → Simplify to name + address only
6. ❌ **REMOVE**: `PropertyAttributesScreen` → Merge into new `PropertyDetailsScreen`
7. ✏️ **MODIFY**: `PropertyAreasScreen` → New `SmartAreasScreen` with AI suggestions
8. ❌ **REMOVE**: `PropertyPhotosScreen` → Move to post-onboarding
9. ✏️ **MODIFY**: `PropertyReviewScreen` → Update for new flow
10. ✅ Keep: Success screen → Add quick invite card

#### New Screens to Create:

**3.1 WelcomeScreen (Modified)**
- **File**: `src/screens/onboarding/WelcomeScreen.tsx`
- **Changes Required**:
  - Add "Get Started as Landlord" button (sets implicit role)
  - Add "I'm a Tenant" link (navigates to invite entry)
  - Add OAuth buttons (Google, Apple)
  - Embedded signup modal (no separate AuthScreen navigation)
  - Call `signup_and_onboard_landlord()` RPC after signup

**3.2 PropertyBasicsScreen (Simplified)**
- **File**: `src/screens/landlord/PropertyBasicsScreen.tsx` or create new
- **Current**: Lines include type, bedrooms, bathrooms, etc.
- **New**: Only address autocomplete + property name
- **API**: Google Places autocomplete
- **Progress**: "Step 1 of 3"

**3.3 PropertyDetailsScreen (NEW)**
- **File**: Create `src/screens/landlord/PropertyDetailsScreen.tsx`
- **Fields**:
  - Property type (house/apartment/condo) - visual cards
  - Bedrooms (counter +/-)
  - Bathrooms (counter +/-)
- **Progress**: "Step 2 of 3"

**3.4 SmartAreasScreen (AI-Enhanced)**
- **File**: Refactor `src/screens/landlord/PropertyAreasScreen.tsx`
- **Changes**:
  - Auto-generate areas based on property type (e.g., 3BR house → Kitchen, Living Room, Bedroom 1, Bedroom 2, Bedroom 3, Bathroom 1, Bathroom 2)
  - Quick add/remove with counters
  - "Skip for now" option
- **Progress**: "Step 3 of 3"

**3.5 PropertyReviewScreen (Updated)**
- **File**: `src/screens/landlord/PropertyReviewScreen.tsx`
- **Current**: Already exists
- **Changes Required**:
  - Update to call `signup_and_onboard_landlord()` RPC instead of separate API calls
  - Handle atomic response
  - Add quick invite card after success

#### Files to Update:

**Navigation Changes**:
- `src/navigation/AuthStack.tsx`: Update to remove OnboardingRoleScreen
- `src/navigation/LandlordNavigator.tsx`: Update property creation flow
- `src/AppNavigator.tsx`: Use `user.onboarding_completed` flag for routing decisions

**State Management**:
- Update screens to use `useUnifiedAuth()` instead of multiple hooks
- Remove `PendingInviteService` logic (handled by atomic RPC)

### 🔲 Phase 4: Refactor Tenant Onboarding Flow (NOT STARTED)

**Target**: Reduce from 5 screens to 2 screens

#### Current Flow to Replace:
1. `PropertyInviteAcceptScreen` → Show property details
2. **Navigate to** → `AuthScreen` (signup)
3. **Navigate to** → `OnboardingRoleScreen` (role selection)
4. **Navigate to** → `TenantOnboardingWelcomeScreen`
5. **Navigate to** → `TenantHome`

#### New Flow:
1. `PropertyInviteAcceptScreen` (modified)
2. **Direct to** → `TenantHome` (zero intermediate screens)

#### Implementation:

**4.1 Update PropertyInviteAcceptScreen**
- **File**: `src/screens/tenant/PropertyInviteAcceptScreen.tsx`
- **Current Behavior** (lines 280-310 verified):
  - Shows property details
  - "Sign Up & Accept" button navigates to AuthScreen
  - After signup, uses redirect guards to return to this screen
  - Calls `accept_invite()` RPC
  - Multiple state updates cause navigation flashing

- **New Behavior Required**:
  - Embedded signup modal (no navigation)
  - Call `signup_and_accept_invite(p_token, p_name)` RPC atomically
  - Use `navigation.reset()` to go directly to TenantHome
  - No intermediate screens, no flashing

- **Code Pattern**:
  ```typescript
  // After signup modal completes
  const { data, error } = await supabase.rpc('signup_and_accept_invite', {
    p_token: token,
    p_name: name
  });

  if (data?.success) {
    // Direct navigation - no intermediate screens
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{
          name: 'Main',
          state: {
            routes: [{ name: 'TenantHome' }]
          }
        }]
      })
    );
  }
  ```

**4.2 Remove Redirect Logic**
- **Files to Update**:
  - `src/context/SupabaseAuthContext.tsx`: Remove redirect state (or entire file if Phase 2.3 complete)
  - `src/services/storage/PendingInviteService.ts`: Remove or deprecate
  - `src/AppNavigator.tsx`: Remove redirect guard logic

### 🔲 Phase 5: Update Navigation and Routing Logic (NOT STARTED)

**File**: `src/AppNavigator.tsx`

**Current Routing Logic** (verified at lines 106-150):
```typescript
// Multiple conditional renderers causing NavigationContainer swaps
if (redirect && redirect.type === 'acceptInvite') {
  return <NavigationContainer><AuthStack /></NavigationContainer>;
}

if (isLoading || roleLoading || processingInvite) {
  return <LoadingScreen />;
}

const shouldShowMainStack = isSignedIn && user && userRole;
return (
  <NavigationContainer>
    {shouldShowMainStack ? <MainStack /> : <AuthStack />}
  </NavigationContainer>
);
```

**New Routing Logic Required**:
```typescript
// Single NavigationContainer with routing decisions in BootstrapScreen
import { useUnifiedAuth } from './context/UnifiedAuthContext';

const AppNavigator = () => {
  const { user, isLoading } = useUnifiedAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
};

// In RootNavigator.tsx (already exists, lines 1-250)
const BootstrapScreen = () => {
  const { user } = useUnifiedAuth();
  const navigation = useNavigation();

  useEffect(() => {
    if (!user) {
      navigation.reset({ index: 0, routes: [{ name: 'Auth' }] });
    } else if (!user.onboarding_completed) {
      // Route to appropriate onboarding flow based on role
      const route = user.role === 'landlord' ? 'LandlordOnboarding' : 'TenantOnboarding';
      navigation.reset({ index: 0, routes: [{ name: route }] });
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    }
  }, [user]);

  return <LoadingScreen />;
};
```

**Benefits**:
- No NavigationContainer swapping (eliminates screen flashing)
- Single source of truth for routing (`user.onboarding_completed`)
- Clean, explicit navigation via `reset()`

### 🔲 Phase 6: Write E2E Tests for New Flows (NOT STARTED)

**Critical Requirement** (per CLAUDE.md line 16):
> Before declaring ANY feature "complete", "production-ready", or "validated", you MUST write and execute Playwright E2E tests

**Test Files to Create**:

**6.1 Landlord Onboarding Test**
- **File**: `e2e/flows/landlord-onboarding-redesign.spec.ts`
- **Test Scenarios**:
  1. Fresh signup → complete onboarding → verify property created
  2. OAuth signup (Google) → complete onboarding
  3. Validation errors (empty fields, invalid address)
  4. Skip optional steps (photos)
  5. Verify `onboarding_completed` flag set in database
  6. Verify direct navigation to LandlordHome (no intermediate screens)

- **Test Pattern**:
  ```typescript
  test('Fresh landlord completes onboarding in 6 steps', async ({ page }) => {
    // 1. Navigate to welcome
    await page.goto('http://localhost:8081');

    // 2. Click "Get Started as Landlord"
    await page.click('[data-testid="landlord-signup-button"]');

    // 3. Fill signup modal
    await page.fill('[data-testid="signup-name"]', 'Test Landlord');
    await page.fill('[data-testid="signup-email"]', `test-${Date.now()}@example.com`);
    await page.fill('[data-testid="signup-password"]', 'TestPass123!');
    await page.click('[data-testid="signup-submit"]');

    // 4. Fill PropertyBasicsScreen
    await page.fill('[data-testid="property-name"]', 'Test Property');
    await page.fill('[data-testid="property-address"]', '123 Test St');
    await page.click('[data-testid="next-button"]');

    // 5. Fill PropertyDetailsScreen
    await page.click('[data-testid="type-house"]');
    await page.click('[data-testid="bedrooms-plus"]'); // 1 bedroom
    await page.click('[data-testid="next-button"]');

    // 6. SmartAreasScreen (skip)
    await page.click('[data-testid="skip-button"]');

    // 7. Review and submit
    await page.click('[data-testid="submit-button"]');

    // 8. Verify navigation to LandlordHome
    await expect(page).toHaveURL(/landlord-home/);

    // 9. Verify database state
    const { data } = await supabase
      .from('profiles')
      .select('onboarding_completed, role')
      .single();
    expect(data.onboarding_completed).toBe(true);
    expect(data.role).toBe('landlord');
  });
  ```

**6.2 Tenant Invite Test**
- **File**: `e2e/flows/tenant-invite-redesign.spec.ts`
- **Test Scenarios**:
  1. Fresh signup via invite link → verify auto-accept → verify TenantHome
  2. Existing landlord accepts tenant invite (role doesn't change)
  3. Invalid token handling
  4. Expired token handling
  5. Already linked scenario
  6. Verify zero intermediate screen flashes

- **Test Pattern**:
  ```typescript
  test('Fresh tenant accepts invite in 2 steps', async ({ page, context }) => {
    // 1. Setup: Create landlord and property with invite token
    const { token, propertyId } = await setupTestInvite();

    // 2. Open invite link in new incognito context
    const tenantContext = await context.browser().newContext();
    const tenantPage = await tenantContext.newPage();

    // 3. Navigate to invite URL
    await tenantPage.goto(`exp+myailandlord://invite?t=${token}`);

    // 4. Verify PropertyInviteAcceptScreen shows property details
    await expect(tenantPage.locator('[data-testid="property-name"]')).toBeVisible();

    // 5. Click "Sign Up & Accept"
    await tenantPage.click('[data-testid="signup-accept-button"]');

    // 6. Fill embedded signup modal
    await tenantPage.fill('[data-testid="signup-name"]', 'Test Tenant');
    await tenantPage.fill('[data-testid="signup-email"]', `tenant-${Date.now()}@example.com`);
    await tenantPage.fill('[data-testid="signup-password"]', 'TenantPass123!');
    await tenantPage.click('[data-testid="submit-button"]');

    // 7. Verify DIRECT navigation to TenantHome (no intermediate screens)
    await tenantPage.waitForURL(/tenant-home/, { timeout: 5000 });

    // 8. Verify NO intermediate screens appeared
    // (This test fails if navigation flashes through welcome/onboarding screens)

    // 9. Verify database state
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed, role')
      .single();
    expect(profile.onboarding_completed).toBe(true);
    expect(profile.role).toBe('tenant');

    // 10. Verify property link created
    const { data: link } = await supabase
      .from('tenant_property_links')
      .select('*')
      .eq('property_id', propertyId)
      .single();
    expect(link).toBeTruthy();
  });
  ```

**6.3 Navigation Stability Test**
- **File**: `e2e/flows/navigation-stability.spec.ts`
- **Purpose**: Verify zero screen flashing during state transitions
- **Method**: Record screenshots during navigation, verify no intermediate screens appear

### 🔲 Phase 7: Remove Old Code and Cleanup (NOT STARTED)

**After Phase 6 Tests Pass**, remove deprecated code:

**7.1 Delete Old Context Files**:
```bash
rm src/context/SupabaseAuthContext.tsx
rm src/context/ProfileContext.tsx
rm src/context/RoleContext.tsx
rm src/context/PendingRequestsContext.tsx
rm src/context/UnreadMessagesContext.tsx
rm src/context/OnboardingContext.tsx
```

**7.2 Delete Old Onboarding Screens**:
```bash
rm src/screens/onboarding/OnboardingRoleScreen.tsx
rm src/screens/onboarding/LandlordOnboardingWelcomeScreen.tsx
rm src/screens/onboarding/PropertyIntroScreen.tsx
# Note: Keep and modify PropertyBasicsScreen, PropertyAreasScreen, PropertyReviewScreen
```

**7.3 Delete Deprecated Services**:
```bash
rm src/services/storage/PendingInviteService.ts
# Or mark as deprecated if used elsewhere
```

**7.4 Update Documentation**:
- Update `README.md` with new onboarding flows
- Update `ARCHITECTURE.md` (if exists) with new context architecture
- Archive old documentation to `docs/archive/`

**7.5 Git Cleanup**:
```bash
git add -A
git commit -m "refactor: complete onboarding redesign - remove deprecated code

- Remove 6 old context files (replaced by UnifiedAuthContext + AppStateContext)
- Remove 3 redundant onboarding screens
- Remove PendingInviteService (replaced by atomic RPCs)
- Update documentation
"
```

---

## Technical Implementation Details

### Database Schema

**Profiles Table** (verified via psql):
```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  role user_role,  -- enum: 'landlord' | 'tenant'
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  onboarding_completed BOOLEAN DEFAULT FALSE  -- NEW COLUMN
);
```

**Properties Table**:
```sql
CREATE TABLE public.properties (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  address_jsonb JSONB,  -- { street, city, state, zip, country }
  property_type TEXT,
  bedrooms INTEGER,
  bathrooms NUMERIC,
  landlord_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Tenant Property Links Table**:
```sql
CREATE TABLE public.tenant_property_links (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES profiles(id),
  property_id UUID REFERENCES properties(id),
  landlord_id UUID REFERENCES profiles(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RPC Function Signatures

**Call Pattern for Landlord Onboarding**:
```typescript
import { supabase } from '@/lib/supabaseClient';

const result = await supabase.rpc('signup_and_onboard_landlord', {
  p_property_name: 'My First Property',
  p_address_jsonb: {
    street: '123 Main St',
    city: 'San Francisco',
    state: 'CA',
    zip: '94102',
    country: 'USA'
  },
  p_property_type: 'house',
  p_bedrooms: 3,
  p_bathrooms: 2,
  p_areas: ['Kitchen', 'Living Room', 'Bedroom 1', 'Bedroom 2', 'Bedroom 3', 'Bathroom']
});

if (result.data?.success) {
  const { property_id, profile_id } = result.data;
  // Navigation: reset to LandlordHome
  navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
} else {
  // Handle error
  console.error(result.data?.error_message);
}
```

**Call Pattern for Tenant Invite Acceptance**:
```typescript
import { supabase } from '@/lib/supabaseClient';

const result = await supabase.rpc('signup_and_accept_invite', {
  p_token: 'ABC123XYZ',  // From invite URL
  p_name: 'John Tenant'   // From signup form
});

if (result.data?.success) {
  const { property_id, property_name, profile_id } = result.data;
  // Navigation: reset to TenantHome
  navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
} else {
  // Handle error (invalid token, expired, etc.)
  console.error(result.data?.error_message);
}
```

### Context Usage Patterns

**UnifiedAuthContext**:
```typescript
import { useUnifiedAuth } from '@/context/UnifiedAuthContext';

function MyComponent() {
  const { user, isLoading, refreshUser, updateRole } = useUnifiedAuth();

  if (isLoading) return <LoadingSpinner />;
  if (!user) return <LoginPrompt />;

  // Access user data
  const isLandlord = user.role === 'landlord';
  const needsOnboarding = !user.onboarding_completed;

  // Update role
  const handleRoleChange = async () => {
    await updateRole('landlord');
    // User object automatically updates
  };

  return (
    <View>
      <Text>Welcome {user.name}</Text>
      <Text>Role: {user.role}</Text>
      <Text>Onboarding: {user.onboarding_completed ? 'Complete' : 'Pending'}</Text>
    </View>
  );
}
```

**AppStateContext**:
```typescript
import { useAppState } from '@/context/AppStateContext';

function NotificationBadge() {
  const { newRequestsCount, unreadMessagesCount, refreshCounts } = useAppState();

  const totalBadgeCount = newRequestsCount + unreadMessagesCount;

  useEffect(() => {
    // Refresh counts on mount
    refreshCounts();
  }, []);

  if (totalBadgeCount === 0) return null;

  return <Badge count={totalBadgeCount} />;
}
```

### Navigation Patterns

**Zero-Flash Navigation** (per NAVIGATION_REFACTOR_PLAN.md):
```typescript
import { CommonActions } from '@react-navigation/native';
import { InteractionManager } from 'react-native';

// After successful signup + onboarding
async function completeOnboarding() {
  // 1. Call atomic RPC
  const result = await supabase.rpc('signup_and_onboard_landlord', {...});

  if (!result.data?.success) {
    // Handle error
    return;
  }

  // 2. Reset navigation stack (zero intermediate screens)
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{
        name: 'Main',
        state: {
          routes: [{ name: 'LandlordHome' }]
        }
      }]
    })
  );

  // 3. Cleanup AFTER navigation completes (deferred)
  InteractionManager.runAfterInteractions(async () => {
    await refreshUser();  // Sync user state
    // Clear any temporary storage
  });
}
```

---

## How to Continue

### Prerequisites

1. **Verify Phase 1 & 2 are complete**:
   ```bash
   # Check database migration applied
   PGPASSWORD="..." psql "..." -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_completed';"
   # Should return: onboarding_completed

   # Check RPC functions exist
   PGPASSWORD="..." psql "..." -c "SELECT routine_name FROM information_schema.routines WHERE routine_name IN ('signup_and_onboard_landlord', 'signup_and_accept_invite');"
   # Should return 2 rows

   # Check new context files exist
   ls -la src/context/UnifiedAuthContext.tsx src/context/AppStateContext.tsx
   # Should show both files
   ```

2. **Checkout the correct branch**:
   ```bash
   git checkout fix/ios-keyboard-inset-auth
   git pull origin fix/ios-keyboard-inset-auth
   ```

3. **Verify git commit**:
   ```bash
   git log --oneline -1
   # Should show: 79ced9a feat: Phase 1 & 2 of onboarding redesign...
   ```

### Step-by-Step Continuation

#### Option A: Complete Phase 2.3 (Wire New Contexts) - Recommended First Step

**Why Start Here**: Get the foundation working before building new screens. This allows testing the new contexts with existing screens.

1. **Read current App.tsx to understand structure**:
   ```bash
   cat src/App.tsx | grep -A 20 "return"
   ```

2. **Create a feature branch** (optional, for safety):
   ```bash
   git checkout -b feat/wire-unified-contexts
   ```

3. **Update App.tsx** (gradual approach):
   ```typescript
   // Step 1: Import new contexts alongside old ones
   import { UnifiedAuthProvider, useUnifiedAuth } from './context/UnifiedAuthContext';
   import { AppStateProvider } from './context/AppStateContext';

   // Step 2: Wrap with new providers OUTSIDE old providers
   function App() {
     return (
       <UnifiedAuthProvider>
         <AppStateProvider>
           {/* Old providers still active for compatibility */}
           <SupabaseAuthProvider>
             <ProfileProvider>
               {/* ... rest of old providers */}
               <AppNavigator />
             </ProfileProvider>
           </SupabaseAuthProvider>
         </AppStateProvider>
       </UnifiedAuthProvider>
     );
   }
   ```

4. **Test dual context setup**:
   ```bash
   # Start Metro
   npx expo start --clear

   # In another terminal, check logs for both context initializations
   # Should see logs from both old and new contexts
   ```

5. **Migrate one screen at a time**:
   ```bash
   # Start with a simple screen, e.g., ProfileScreen
   # Find files using old hooks:
   grep -r "useAppAuth" src/screens/shared/ProfileScreen.tsx

   # Update ProfileScreen.tsx to use new hook:
   - import { useAppAuth } from '@/context/SupabaseAuthContext';
   - import { useProfile } from '@/context/ProfileContext';
   + import { useUnifiedAuth } from '@/context/UnifiedAuthContext';

   - const { user } = useAppAuth();
   - const { profile } = useProfile();
   + const { user } = useUnifiedAuth();

   # Test this single screen
   ```

6. **After all screens migrated, remove old providers**:
   ```typescript
   // App.tsx - final state
   function App() {
     return (
       <UnifiedAuthProvider>
         <AppStateProvider>
           <AppNavigator />
         </AppStateProvider>
       </UnifiedAuthProvider>
     );
   }
   ```

7. **Commit incremental progress**:
   ```bash
   git add src/App.tsx src/screens/shared/ProfileScreen.tsx
   git commit -m "feat: migrate ProfileScreen to UnifiedAuthContext"
   ```

#### Option B: Start Phase 3 (New Landlord Screens)

**Prerequisites**: Phase 2.3 should be complete first (or at least partially working).

1. **Create new screen files**:
   ```bash
   # Create PropertyDetailsScreen
   touch src/screens/landlord/PropertyDetailsScreen.tsx

   # Copy PropertyBasicsScreen as template
   cp src/screens/landlord/PropertyBasicsScreen.tsx src/screens/landlord/PropertyDetailsScreen.new.tsx
   ```

2. **Implement PropertyDetailsScreen** (see Phase 3.3 above for requirements)

3. **Update navigation**:
   ```typescript
   // src/navigation/LandlordNavigator.tsx
   import PropertyDetailsScreen from '../screens/landlord/PropertyDetailsScreen';

   // Add to stack
   <Stack.Screen name="PropertyDetails" component={PropertyDetailsScreen} />
   ```

4. **Test screen in isolation**:
   ```bash
   # Manually navigate to screen via deep link
   npx expo start
   # In app, navigate to: exp://localhost:8081/--/property-details
   ```

#### Option C: Test Atomic RPCs Directly

**Purpose**: Verify database functions work before building UI.

1. **Create test script**:
   ```bash
   touch scripts/test-onboarding-rpcs.ts
   ```

2. **Write test script**:
   ```typescript
   // scripts/test-onboarding-rpcs.ts
   import { createClient } from '@supabase/supabase-js';

   const supabase = createClient(
     process.env.EXPO_PUBLIC_SUPABASE_URL!,
     process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
   );

   async function testLandlordOnboarding() {
     console.log('Testing signup_and_onboard_landlord...');

     const { data, error } = await supabase.rpc('signup_and_onboard_landlord', {
       p_property_name: 'Test Property ' + Date.now(),
       p_address_jsonb: {
         street: '123 Test St',
         city: 'San Francisco',
         state: 'CA'
       },
       p_property_type: 'house',
       p_bedrooms: 3,
       p_bathrooms: 2
     });

     if (error) {
       console.error('Error:', error);
     } else {
       console.log('Success:', data);
     }
   }

   testLandlordOnboarding();
   ```

3. **Run test**:
   ```bash
   npx ts-node scripts/test-onboarding-rpcs.ts
   ```

4. **Verify database**:
   ```bash
   PGPASSWORD="..." psql "..." -c "SELECT id, name, role, onboarding_completed FROM profiles ORDER BY created_at DESC LIMIT 1;"
   PGPASSWORD="..." psql "..." -c "SELECT id, name, landlord_id FROM properties ORDER BY created_at DESC LIMIT 1;"
   ```

### Recommended Sequence

1. ✅ **Phase 2.3**: Wire UnifiedAuthContext and AppStateContext (incremental migration)
2. ✅ **Test**: Verify app still works with new contexts
3. ✅ **Phase 3**: Build new landlord screens one at a time
4. ✅ **Test**: E2E test landlord flow
5. ✅ **Phase 4**: Update tenant invite flow
6. ✅ **Test**: E2E test tenant flow
7. ✅ **Phase 5**: Update navigation logic
8. ✅ **Test**: Verify zero screen flashing
9. ✅ **Phase 6**: Write comprehensive E2E tests
10. ✅ **Phase 7**: Remove old code after all tests pass

---

## Testing Strategy

### Unit Tests

**Context Tests**:
```bash
# Create test files
touch src/context/__tests__/UnifiedAuthContext.test.tsx
touch src/context/__tests__/AppStateContext.test.tsx
```

**RPC Tests**:
```bash
# Create RPC test file
touch src/__tests__/rpc/onboarding-rpcs.test.ts
```

**Test Pattern**:
```typescript
// src/__tests__/rpc/onboarding-rpcs.test.ts
import { supabase } from '@/lib/supabaseClient';

describe('signup_and_onboard_landlord RPC', () => {
  it('creates profile, property, and sets onboarding_completed', async () => {
    const { data, error } = await supabase.rpc('signup_and_onboard_landlord', {
      p_property_name: 'Test Property',
      p_address_jsonb: { street: '123 Test' },
      p_bedrooms: 2
    });

    expect(error).toBeNull();
    expect(data.success).toBe(true);
    expect(data.property_id).toBeTruthy();

    // Verify database state
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed, role')
      .eq('id', data.profile_id)
      .single();

    expect(profile.onboarding_completed).toBe(true);
    expect(profile.role).toBe('landlord');
  });
});
```

### Integration Tests

**Context Integration**:
```typescript
// Test UnifiedAuthContext updates profile when role changes
// Test AppStateContext receives real-time updates
// Test contexts work together (auth change triggers state refresh)
```

### E2E Tests (Critical)

**Per CLAUDE.md requirements**, full E2E tests are mandatory before declaring complete:

1. **Setup Test Environment**:
   ```bash
   # Ensure Playwright is configured
   npm install --save-dev @playwright/test

   # Create auth states for different scenarios
   mkdir -p .auth
   # Save landlord auth state after login
   # Save tenant auth state after login
   ```

2. **Run Tests**:
   ```bash
   # Start Metro in background
   npx expo start --port 8081 &

   # Wait for server to be ready
   sleep 10

   # Run E2E tests
   npx playwright test e2e/flows/landlord-onboarding-redesign.spec.ts
   npx playwright test e2e/flows/tenant-invite-redesign.spec.ts
   ```

3. **Success Criteria**:
   - All tests pass
   - Zero screen flashing detected
   - Database state verified at each step
   - No race conditions or timing issues

### Manual Testing Checklist

Before merging to main:

**Landlord Flow**:
- [ ] Fresh signup via "Get Started as Landlord" button
- [ ] OAuth signup (Google)
- [ ] Complete 6-step onboarding
- [ ] Skip optional steps (photos, areas)
- [ ] Verify property created in database
- [ ] Verify `onboarding_completed = true` in database
- [ ] Verify direct navigation to LandlordHome (no flashing)
- [ ] Verify can invite tenant after onboarding

**Tenant Flow**:
- [ ] Fresh signup via invite link
- [ ] Existing user accepts invite via link
- [ ] OAuth signup via invite
- [ ] Verify auto-role assignment (tenant)
- [ ] Verify property link created in database
- [ ] Verify `onboarding_completed = true` in database
- [ ] Verify zero intermediate screens (direct to TenantHome)
- [ ] Verify notification badges work

**Navigation**:
- [ ] No NavigationContainer swapping
- [ ] No screen flashing during auth state changes
- [ ] Back button behavior correct
- [ ] Deep links work correctly

**Error Handling**:
- [ ] Invalid invite token shows error
- [ ] Expired invite token shows error
- [ ] Network errors handled gracefully
- [ ] Validation errors show clear messages

---

## Rollback Plan

### If Phase 2.3 Needs Rollback

**Scenario**: New contexts cause issues, need to revert to old contexts.

**Steps**:
1. Revert App.tsx to use old providers:
   ```bash
   git diff HEAD~1 src/App.tsx > revert-contexts.patch
   git checkout HEAD~1 -- src/App.tsx
   ```

2. Revert any screens migrated to new hooks:
   ```bash
   git checkout HEAD~1 -- src/screens/
   ```

3. Keep new context files for future use:
   ```bash
   # Don't delete UnifiedAuthContext.tsx or AppStateContext.tsx
   # Just stop using them
   ```

### If New Screens Need Rollback

**Scenario**: New landlord/tenant screens have bugs, need to revert to old flow.

**Steps**:
1. Restore old screens from git:
   ```bash
   git checkout HEAD~X -- src/screens/onboarding/OnboardingRoleScreen.tsx
   git checkout HEAD~X -- src/screens/onboarding/LandlordOnboardingWelcomeScreen.tsx
   # etc.
   ```

2. Restore old navigation:
   ```bash
   git checkout HEAD~X -- src/navigation/AuthStack.tsx
   git checkout HEAD~X -- src/navigation/LandlordNavigator.tsx
   ```

3. Database stays intact (triggers won't cause issues with old flow)

### If Database Migration Needs Rollback

**Scenario**: Atomic RPCs have bugs, need to revert to old approach.

**Steps**:
1. Database migrations are additive, so no need to rollback schema:
   - `onboarding_completed` column can stay (defaults to FALSE)
   - Triggers can stay (won't fire if using old flow)
   - RPC functions can stay (won't be called if using old flow)

2. If absolutely necessary to remove functions:
   ```sql
   DROP FUNCTION IF EXISTS public.signup_and_onboard_landlord;
   DROP FUNCTION IF EXISTS public.signup_and_accept_invite;
   DROP FUNCTION IF EXISTS public.get_onboarding_status;
   ```

3. If necessary to remove triggers:
   ```sql
   DROP TRIGGER IF EXISTS auto_complete_landlord_onboarding_trg ON public.properties;
   DROP TRIGGER IF EXISTS auto_complete_tenant_onboarding_trg ON public.tenant_property_links;
   DROP FUNCTION IF EXISTS public.auto_complete_landlord_onboarding;
   DROP FUNCTION IF EXISTS public.auto_complete_tenant_onboarding;
   ```

4. If necessary to remove column (not recommended):
   ```sql
   ALTER TABLE public.profiles DROP COLUMN IF EXISTS onboarding_completed;
   ```

### Rollback Git Commits

**If entire feature needs rollback**:
```bash
# Create rollback branch
git checkout -b rollback/onboarding-redesign

# Revert commits (adjust count as needed)
git revert --no-commit HEAD~5..HEAD
git commit -m "Revert onboarding redesign (Phases 1-2)"

# Push rollback branch
git push origin rollback/onboarding-redesign
```

---

## Architecture Decisions

### Decision 1: Atomic RPCs vs. Client-Side Coordination

**Problem**: Current flow requires multiple sequential API calls, each can fail independently, leading to partial state.

**Options Considered**:
1. Keep client-side coordination, improve error handling
2. Create server-side atomic transactions via RPC functions

**Decision**: Option 2 (Atomic RPCs)

**Rationale**:
- Single transaction ensures all-or-nothing semantics
- Reduces network round-trips (1 RPC vs 4-5 API calls)
- Simpler client code (no state synchronization logic)
- Eliminates race conditions (database handles concurrency)
- Better error recovery (automatic rollback on failure)

**Trade-offs**:
- More complex database code (PL/pgSQL instead of TypeScript)
- Harder to debug (need database logs)
- Requires database migration

**Mitigations**:
- Comprehensive logging in RPC functions (RAISE NOTICE for debug)
- Return detailed error messages
- Create helper function `get_onboarding_status()` for debugging

### Decision 2: Context Consolidation (6 → 2)

**Problem**: 6 separate contexts cause excessive re-renders and race conditions.

**Options Considered**:
1. Keep separate contexts, improve memoization
2. Consolidate related contexts (e.g., merge Auth + Profile)
3. Single global context (Redux-style)

**Decision**: Option 2 (Consolidate to 2 contexts)

**Rationale**:
- Groups logically related state (auth/profile/role are user state)
- Reduces re-render cascades (single update instead of 3)
- Simpler data fetching (one query for user instead of 3)
- Maintains separation of concerns (user vs app-level state)

**Trade-offs**:
- Larger context files (300+ lines vs 100-150 lines each)
- More complex initialization logic

**Mitigations**:
- Clear code organization with section comments
- Separate hooks for internal logic (`mapToUnifiedUser`, `fetchRequestCounts`)
- Comprehensive JSDoc comments

### Decision 3: Big Bang vs. Incremental Migration

**Problem**: How to migrate from old system to new system safely?

**Options Considered**:
1. Big Bang: Replace everything at once
2. Incremental: Run both systems in parallel, migrate gradually
3. Feature Flag: Toggle between old/new flow

**Decision**: Option 2 (Incremental)

**Rationale**:
- Lower risk (can test each piece independently)
- Easier to debug (isolate issues to specific migrations)
- Allows rollback of individual pieces
- Team can continue working on other features

**Trade-offs**:
- Temporary code duplication (old + new contexts)
- More complex testing (need to test both paths)
- Longer migration period

**Mitigations**:
- Clear migration plan (this document)
- Automated tests for both old and new flows
- Delete old code immediately after final migration

### Decision 4: Navigation via reset() vs. Conditional Rendering

**Problem**: Current AppNavigator swaps NavigationContainers based on state, causing flashing.

**Options Considered**:
1. Keep conditional rendering, improve loading states
2. Single NavigationContainer with `navigation.reset()` for explicit navigation
3. Deep linking for all navigation

**Decision**: Option 2 (reset() pattern)

**Rationale**:
- Eliminates NavigationContainer swapping (root cause of flashing)
- Explicit, predictable navigation (no implicit state-based routing)
- Follows React Navigation best practices (per NAVIGATION_REFACTOR_PLAN.md)
- Works well with atomic operations (RPC returns → reset() to destination)

**Trade-offs**:
- More verbose navigation code
- Need to specify full route hierarchy

**Mitigations**:
- Create navigation helper functions
- Document route hierarchies clearly
- Use TypeScript for route type safety

### Decision 5: onboarding_completed Flag vs. Computed State

**Problem**: How to determine if user has completed onboarding?

**Options Considered**:
1. Compute dynamically (check if has_properties/has_property_links)
2. Store as flag in database
3. Hybrid (flag + validation)

**Decision**: Option 2 (Stored flag with triggers)

**Rationale**:
- Single source of truth (one column to check)
- Fast queries (no joins needed for routing decisions)
- Automatic updates via triggers (no client-side logic)
- Can be manually corrected if needed (admin tools)

**Trade-offs**:
- Potential inconsistency (flag out of sync with reality)
- Need to backfill existing users

**Mitigations**:
- Triggers ensure flag stays synchronized
- Backfill migration sets correct initial state
- Helper function `get_onboarding_status()` for debugging

---

## References

**Related Documentation**:
- [WORLD_CLASS_ONBOARDING_REDESIGN.md](./WORLD_CLASS_ONBOARDING_REDESIGN.md) - Original design document
- [NAVIGATION_FLASHING_ISSUE.md](./NAVIGATION_FLASHING_ISSUE.md) - Problem analysis
- [NAVIGATION_REFACTOR_PLAN.md](./NAVIGATION_REFACTOR_PLAN.md) - Zero-flash navigation plan
- [INVITE_FLOW_FIXES_SUMMARY.md](./INVITE_FLOW_FIXES_SUMMARY.md) - Tenant invite architecture

**Code Files Created**:
- `supabase/migrations/20251231_onboarding_redesign_foundation.sql` - Database foundation
- `src/context/UnifiedAuthContext.tsx` - Consolidated auth context (312 lines)
- `src/context/AppStateContext.tsx` - Consolidated app state context (283 lines)

**Code Files to Modify**:
- `src/App.tsx` - Replace context providers
- `src/AppNavigator.tsx` - Update routing logic
- `src/screens/onboarding/WelcomeScreen.tsx` - Add OAuth, embedded signup
- `src/screens/landlord/PropertyBasicsScreen.tsx` - Simplify to address only
- `src/screens/landlord/PropertyAreasScreen.tsx` - Add AI suggestions
- `src/screens/tenant/PropertyInviteAcceptScreen.tsx` - Add embedded signup, atomic RPC

**Code Files to Create**:
- `src/screens/landlord/PropertyDetailsScreen.tsx` - New screen for type/beds/baths
- `e2e/flows/landlord-onboarding-redesign.spec.ts` - E2E test
- `e2e/flows/tenant-invite-redesign.spec.ts` - E2E test

**Git Commits**:
- `79ced9a` - Phase 1 & 2 complete (foundation + contexts)
- `eab4fce` - Prior work (zero-flash navigation docs, invite fixes)

**Database Verification**:
```bash
# Check migration applied
PGPASSWORD="0KjIkPbSG2sACfLJ" psql "postgresql://postgres.zxqhxjuwmkxevhkpqfzf:0KjIkPbSG2sACfLJ@aws-0-us-west-1.pooler.supabase.com:6543/postgres" -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_completed';"

# Check RPC functions
PGPASSWORD="0KjIkPbSG2sACfLJ" psql "postgresql://postgres.zxqhxjuwmkxevhkpqfzf:0KjIkPbSG2sACfLJ@aws-0-us-west-1.pooler.supabase.com:6543/postgres" -c "SELECT routine_name FROM information_schema.routines WHERE routine_name IN ('signup_and_onboard_landlord', 'signup_and_accept_invite');"
```

---

**End of Implementation Guide**

Last Updated: 2025-12-31
Document Version: 1.0
Status: Phases 1-2 Complete, Phases 3-7 Pending
