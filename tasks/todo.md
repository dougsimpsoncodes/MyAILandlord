# Onboarding Flow Implementation Plan

## Overview
Implement a world-class onboarding flow that guides new users through role selection and initial setup after sign up.

## Current State
- Users sign up → auto-assigned "landlord" role → dumped into dashboard
- `RoleSelectScreen.tsx` exists but is NOT used
- No onboarding or first-time user experience

## Proposed Flow

### For ALL New Users (after sign up):
```
SignUp → OnboardingWelcome → RoleSelection → Role-Specific Setup → Dashboard
```

### Landlord Onboarding (3-4 screens):
1. **Welcome** - "Welcome to MyAI Landlord! Let's get you set up."
2. **Role Selection** - "Are you a landlord or tenant?"
3. **Property Setup Prompt** - "Add your first property to get started"
   - Option: "Add Property Now" → AddPropertyScreen
   - Option: "I'll do this later" → Skip to dashboard
4. **Success** - Brief tour highlights (tooltips on first visit)

### Tenant Onboarding (3-4 screens):
1. **Welcome** - "Welcome to MyAI Landlord!"
2. **Role Selection** - "Are you a landlord or tenant?"
3. **Connect to Property** - "Enter your property code or use invite link"
   - Option: "I have a code" → PropertyCodeEntry
   - Option: "I'll do this later" → Skip to dashboard
4. **Success** - Brief tour highlights

## Implementation Tasks

### Phase 1: Core Infrastructure
- [ ] Add `onboarding_completed` field to profiles table (Supabase migration)
- [ ] Create `OnboardingStack.tsx` navigation stack
- [ ] Update `AppNavigator.tsx` to route: AuthStack → OnboardingStack → MainStack
- [ ] Update `useProfileSync.ts` to NOT auto-assign role for new users

### Phase 2: Onboarding Screens
- [ ] Create `OnboardingWelcomeScreen.tsx` - Animated welcome with value props
- [ ] Refactor `RoleSelectScreen.tsx` - Better UI, integrate into onboarding
- [ ] Create `LandlordSetupScreen.tsx` - Property setup prompt
- [ ] Create `TenantSetupScreen.tsx` - Property code/invite prompt
- [ ] Create `OnboardingCompleteScreen.tsx` - Success + next steps

### Phase 3: Polish
- [ ] Add progress indicator across onboarding screens
- [ ] Add skip option that marks onboarding complete
- [ ] Add subtle animations/transitions
- [ ] Test full flow for both roles

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/migrations/XXXX_add_onboarding_field.sql` | Create |
| `src/navigation/OnboardingStack.tsx` | Create |
| `src/screens/onboarding/OnboardingWelcomeScreen.tsx` | Create |
| `src/screens/onboarding/LandlordSetupScreen.tsx` | Create |
| `src/screens/onboarding/TenantSetupScreen.tsx` | Create |
| `src/screens/onboarding/OnboardingCompleteScreen.tsx` | Create |
| `src/screens/RoleSelectScreen.tsx` | Refactor |
| `src/AppNavigator.tsx` | Modify |
| `src/hooks/useProfileSync.ts` | Modify |
| `src/services/supabase/types.ts` | Update (regenerate) |

## Design Principles
- **Quick to value**: 3-4 screens max
- **Skippable**: User can skip and complete later
- **Personalized**: Different paths for landlord vs tenant
- **Simple**: Minimal text, clear CTAs
- **Progressive**: Don't overwhelm, reveal features over time
