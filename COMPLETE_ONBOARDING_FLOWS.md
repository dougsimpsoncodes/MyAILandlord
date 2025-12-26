# Complete Onboarding Flows (Updated)

This document maps the exact user flows for testing after consolidating to invite links only.

## LANDLORD ONBOARDING FLOW

### Step 1: OnboardingWelcomeScreen
- **URL**: `/` (root)
- **Screen Elements**:
  - Logo: 🏠
  - Title: "My AI Landlord"
  - Tagline: "Property management, simplified"
  - Primary button: "Get Started" (TouchableOpacity)
  - Link: "Already have an account? Sign In"
- **Action**: Click "Get Started"
- **Navigation**: → OnboardingName

### Step 2: OnboardingNameScreen (Step 1 of 4)
- **Screen Elements**:
  - Progress bar: 1 of 4 dots filled
  - Hero icon: 👋
  - Title: "What should we call you?"
  - Subtitle: "We'd love to personalize your experience"
  - Input: Text field with placeholder "Your first name"
  - Privacy text: "Your info stays private. We never share your data."
  - Button: "Continue" (disabled until valid name entered)
- **Validation**: 2-60 characters, letters/spaces/hyphens/apostrophes only
- **Action**: Enter first name, click Continue
- **Navigation**: → OnboardingAccount (with firstName param)

### Step 3: OnboardingAccountScreen (Step 2 of 4)
- **Screen Elements**:
  - Progress bar: 2 of 4 dots filled
  - Hero icon: 🔐
  - Title: "Nice to meet you, {firstName}!"
  - Subtitle: "Let's secure your account"
  - Email input: placeholder "you@example.com"
  - Password input: with show/hide toggle
  - Confirm password input
  - Password strength indicator
  - Checkbox: "I accept the Terms of Service and Privacy Policy"
  - Button: "Create Account" (disabled until all valid)
- **Validation**:
  - Email: valid format
  - Password: min 8 chars, score >= 3 (fair strength)
  - Passwords must match
  - Terms must be accepted
- **Action**: Fill email/password, accept terms, click Create Account
- **Backend**: Creates Supabase auth user with first_name in metadata
- **Navigation**: → OnboardingRole (with firstName + userId params)

### Step 4: OnboardingRoleScreen (Step 3 of 4)
- **Screen Elements**:
  - Progress bar: 3 of 4 dots filled
  - Hero icon: 🎯
  - Title: "How will you use MyAI Landlord, {firstName}?"
  - Subtitle: "This helps us personalize your experience"
  - Two role cards:
    - **Landlord card**:
      - Icon: 🏠
      - Title: "I'm a Landlord"
      - Description: "Manage properties, track maintenance, and communicate with tenants"
      - Radio button (selected state shows filled dot)
    - **Tenant card**:
      - Icon: 🔑
      - Title: "I'm a Tenant"
      - Description: "Report issues, track repairs, and stay connected with your landlord"
      - Radio button
  - Button: "Continue" (disabled until role selected)
- **Action**: Click landlord card, click Continue
- **Backend**: Updates profile with first_name (NOT role yet - delayed until onboarding complete)
- **Navigation**: → LandlordOnboardingWelcome (with firstName param)

### Step 5: LandlordOnboardingWelcomeScreen (Step 4 of 4 • Landlord Setup)
- **Screen Elements**:
  - Progress bar: 4 of 4 dots filled
  - Hero icon: 🎉
  - Title: "Welcome, {firstName}!"
  - Subtitle: "Here's what you can do with MyAI Landlord"
  - Features list (4 cards):
    1. 🏠 Property Management
    2. 🔧 Maintenance Tracking
    3. 💬 Easy Communication
    4. 📊 Smart Insights
  - Trust badge: "🌟 Trusted by landlords managing properties nationwide"
  - Button: "Let's Set Up Your First Property"
- **Action**: Click button
- **Navigation**: → LandlordPropertyIntro

### Step 6: LandlordPropertyIntroScreen
- **Screen Elements**:
  - Hero icon: 🏗️
  - Title: "Let's add your property"
  - Subtitle: "Here's what we'll cover:"
  - Steps preview (3 numbered cards):
    1. Property Basics - Address, type, bedrooms & bathrooms
    2. Property Areas - Rooms and spaces to document
    3. Invite Tenant - Connect with your tenant (optional)
  - Info card: "⏱️ Don't worry, you can always edit these details later or add more properties."
  - Button: "Start Property Setup"
- **Action**: Click button
- **Navigation**: → PropertyBasics (with firstName + isOnboarding: true)

### Step 7: PropertyBasicsScreen
- **Screen Elements**:
  - Title: "Property Basics"
  - Form fields (exact fields need verification - PropertyBasicsScreen.tsx)
  - Address input (uses Smarty autocomplete)
  - Property type selector
  - Bedrooms/bathrooms inputs
  - Continue button
- **Action**: Fill property details, click Continue
- **Navigation**: → PropertyAttributes (with addressData)

### Step 8: PropertyAttributesScreen
- **Screen Elements**: (need to verify exact structure)
- **Action**: Fill additional attributes, click Continue
- **Navigation**: → PropertyAreasScreen

### Step 9: PropertyAreasScreen
- **Screen Elements**:
  - List of areas to add photos
  - Skip/Continue options
- **Action**: Skip or add areas, click Continue
- **Backend**: Property created in database, role finally saved to profile
- **Navigation**: → LandlordTenantInvite (with firstName + propertyId)

### Step 10: LandlordTenantInviteScreen
- **Screen Elements**:
  - Title with property name
  - Two delivery method options:
    - **Send via Email**: Collect email, send invite link via email
    - **Get Shareable Code**: Generate 12-char token, display for manual sharing
  - Skip button
- **Action**: Click "Get Shareable Code"
- **Backend**: Calls `create_invite` RPC, returns 12-char token
- **Display**: Shows invite URL: `http://localhost:8081/invite?t={TOKEN}`
- **Copy button**: Allows copying URL
- **Continue button**: Finish onboarding
- **Navigation**: → LandlordOnboardingSuccess OR directly to dashboard

---

## TENANT INVITE ACCEPTANCE FLOW (Invite Link Only)

### Precondition: Landlord has generated invite token

### Path: Invite Link Flow (ONLY SUPPORTED PATH)

### Step 1: Open Invite Link (Not Authenticated)
- **URL**: `http://localhost:8081/invite?t={TOKEN}`
- **Screen**: PropertyInviteAcceptScreen
- **Backend**: Calls `validate_invite` RPC to get property details
- **Screen Elements**:
  - Property icon: 🏠
  - Property name (from validation)
  - Property address
  - Landlord name
  - Info card: "You're invited!"
  - Description of what tenant can do
  - Primary button: "Sign Up & Accept" (if not authenticated)
  - OR "Accept Invite" (if authenticated)
  - Secondary button: "Decline"
- **Action**: Click "Sign Up & Accept"
- **Navigation**: → Auth screen with mode: 'signup'
- **Backend**: Token saved to PendingInviteService (localStorage/AsyncStorage)

### Step 2-4: Same as Landlord Onboarding Steps 2-4
- User goes through name/account/role selection
- **Difference**: In OnboardingRoleScreen, user selects "Tenant" card
- **Navigation after role**: → TenantOnboardingWelcome

### Step 5: TenantOnboardingWelcomeScreen (Step 4 of 4 • Tenant Setup)
- **Screen Elements**:
  - Progress bar: 4 of 4 dots filled
  - Hero icon: 👋
  - Title: "Welcome, {firstName}!"
  - Subtitle: "Here's what you can do with MyAI Landlord"
  - Features list (4 cards):
    1. 🔧 Report Issues Easily
    2. 📱 Track Repairs
    3. 💬 Direct Communication
    4. 🏠 Property Info
  - Trust section: "🔒 Your data is secure and only shared with your landlord"
  - Button: "Connect to My Property"
- **Backend Logic**:
  - Checks for pending invite via `PendingInviteService.getPendingInvite()`
  - **If pending invite exists**:
    - Validates token via `validate_invite` RPC (if metadata missing)
    - Auto-accepts via `accept_invite` RPC
    - Creates tenant-property link in database
    - Navigates to TenantInviteRoommate
  - **If NO pending invite**:
    - Shows Alert: "Invite Required - Please open an invite link from your landlord to connect to a property."
    - User must obtain invite link externally
- **Action**: Click "Connect to My Property"
- **Navigation**: → TenantInviteRoommate (if invite exists)

### Step 6: TenantInviteRoommateScreen (Convergence Point)
- **Screen Elements**:
  - Hero icon: 👥
  - Title: "Share with a roommate?"
  - Subtitle: "Your roommate can use this code to connect to {propertyName}"
  - Code card displaying the 12-char invite code
  - Label: "Invite Code" (not "Property Code")
  - Copy button
  - Share button (native share sheet)
  - Info card: "💡 Your roommate can use this same invite code to connect to the property and report issues."
  - Primary button: "Continue"
  - Skip button: "I'll do this later"
- **Action**: Click "Continue" or "I'll do this later"
- **Navigation**: → TenantOnboardingSuccess

### Step 7: TenantOnboardingSuccess
- **Screen Elements**:
  - Success message
  - Property confirmation
  - Button: "Go to Dashboard"
- **Action**: Click button
- **Navigation**: → TenantHome (Dashboard)

### Step 8: TenantHomeScreen (Dashboard)
- **Screen Elements**:
  - Property card with:
    - Property name
    - Property address (formatted from address_jsonb)
    - Property image (Google Street View)
  - "Your Requests" section (maintenance requests)
  - "Quick Links" section
- **Verification**: Property is visible with correct name and address

---

## REMOVED FLOWS (No Longer Supported)

### ❌ 6-Character Code Entry Flow (DEPRECATED)
The following screens and flow were removed:
- TenantPropertyIntroScreen
- TenantPropertyCodeScreen (6-char manual entry)
- TenantPropertyConfirmScreen

**Reason**: Consolidated to single secure invite link flow (12-char hashed tokens). The code entry system called non-existent RPCs and was never deployed to production.

---

## KEY TESTING POINTS

### For Landlord Flow:
1. All 4 onboarding steps complete successfully
2. Property creation wizard completes
3. Invite token generation works (both email and code modes)
4. Token is 12 characters, alphanumeric uppercase
5. URL format: `http://localhost:8081/invite?t={TOKEN}`

### For Tenant Flow (Invite Link Only):
1. Invite link loads property preview via `validate_invite` RPC
2. Signup flow completes with tenant role
3. TenantOnboardingWelcome auto-validates and auto-accepts pending invite
4. `accept_invite` RPC creates tenant_property_link with is_active=true
5. Profile role set to 'tenant'
6. TenantInviteRoommate displays 12-char invite code for roommate sharing
7. Dashboard displays property with address from address_jsonb
8. If no pending invite, user sees alert instructing to obtain invite link

### Database Verifications:
1. `profiles` table: user has role='tenant' or role='landlord'
2. `properties` table: property created with landlord_id
3. `tenant_property_links`: link created with tenant_id, property_id, is_active=true
4. `invites` table: invite marked as accepted (accepted_at not null, accepted_by = tenant_id)

### RLS Policy Checks:
1. Tenant can read property details (properties_select_own_or_linked policy)
2. Tenant can read their property link
3. Landlord can read their properties

---

## API REFERENCE

### RPC Functions Used:
- **`create_invite(p_property_id, p_delivery_method, p_intended_email)`**: Landlord creates invite, returns 12-char token
- **`validate_invite(p_token)`**: Public RPC to validate token and get property preview (rate-limited)
- **`accept_invite(p_token)`**: Authenticated RPC to accept invite and create tenant-property link
- **`cleanup_old_invites()`**: Service role only, soft-deletes old invites

### Token Format:
- **Length**: 12 characters
- **Charset**: Uppercase alphanumeric (A-Z, 0-9)
- **Example**: `SCJVBVI4X6XR`
- **Security**: SHA256 hashed with per-token salt, never stored in plaintext

### Deep Link Format:
- **Web**: `http://localhost:8081/invite?t={TOKEN}`
- **Production**: `https://myailandlord.app/invite?t={TOKEN}`
- **Legacy support**: Also accepts `?token=` parameter for backward compatibility

---

## TESTING CHECKLIST

### Manual Testing:
- [ ] Landlord creates invite via "Get Shareable Code"
- [ ] Landlord creates invite via "Send via Email"
- [ ] Copy invite link to clipboard
- [ ] Open invite link in incognito (unauthenticated)
- [ ] Property preview displays correctly
- [ ] Signup flow completes
- [ ] TenantOnboardingWelcome auto-accepts invite
- [ ] TenantInviteRoommate displays same 12-char code
- [ ] Tenant dashboard shows property
- [ ] Database has correct tenant_property_link
- [ ] If tenant opens app without invite, sees alert

### E2E Testing:
- [ ] Use Playwright against Expo Web (port 8082)
- [ ] Test complete landlord → tenant invite flow
- [ ] Test idempotency (accept same invite twice)
- [ ] Test expired token handling
- [ ] Test invalid token handling
- [ ] Test rate limiting (20 attempts/minute)

---

**Last Updated**: 2024-12-26
**Status**: Single invite flow active (12-char tokens via invite links only)
