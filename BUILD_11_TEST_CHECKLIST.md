# Build 11 Testing Checklist
## My AI Landlord - Complete Onboarding Flow Test

**Build:** 11
**Version:** 1.0.0
**Date:** December 20, 2025
**Tester:** Doug Simpson

---

## 🎯 What's New in Build 11
- ✅ Complete landlord onboarding flow (8 screens)
- ✅ Enhanced account creation with password validation
- ✅ Property setup wizard with auto-save
- ✅ Tenant invitation system
- ✅ Push notification infrastructure
- ✅ Improved navigation and state management

---

## 📋 PRE-TEST SETUP

### Step 1: Clean Install (Recommended)
- [ ] Delete existing "My AI Landlord" app from iPhone
- [ ] Open TestFlight app
- [ ] Find "My AI Landlord"
- [ ] Tap "Install" to get fresh Build 11
- [ ] Wait for installation to complete

### Step 2: Prepare Test Data
Have ready:
- [ ] Test email address (e.g., test+landlord123@gmail.com)
- [ ] Strong password (min 8 chars, mix of upper/lower/numbers/symbols)
- [ ] Property address to use for testing

---

## 🧪 TESTING SCENARIOS

## Test 1: NEW USER ONBOARDING (Primary Test)

### 1.1 Welcome Screen
- [ ] Launch app - should see welcome screen
- [ ] Verify "🏠" icon displays correctly
- [ ] Verify "MyAI Landlord" title visible
- [ ] Verify tagline: "Property management, simplified."
- [ ] Tap "Get Started" button
- [ ] **RESULT:** ✅ Pass / ❌ Fail

**Screenshot Required:** Yes ☐

---

### 1.2 Name Entry Screen
- [ ] See "👋" emoji icon
- [ ] Title: "What should we call you?"
- [ ] Subtitle: "We'd love to personalize your experience"
- [ ] Progress: Step 1 of 4 (1 dot active)
- [ ] Enter name: **[Your Test Name]**
- [ ] Verify name validation:
  - [ ] Try empty name - should show error
  - [ ] Try 1 character - should show "at least 2 characters"
  - [ ] Try valid name - Continue button enables
- [ ] See trust badge: "🔒 Your info stays private..."
- [ ] Tap "Continue"
- [ ] **RESULT:** ✅ Pass / ❌ Fail

**Screenshot Required:** Yes ☐

---

### 1.3 Account Creation Screen
- [ ] See "🔐" emoji icon
- [ ] Title: "Nice to meet you, [Your Name]!"
- [ ] Subtitle: "Let's secure your account"
- [ ] Progress: Step 2 of 4 (2 dots active)
- [ ] Enter email: **[Test Email]**
  - [ ] Verify email validation (try invalid format first)
- [ ] Enter password: **[Test Password]**
  - [ ] Tap 👁️ to show/hide password
  - [ ] See password strength indicator (Weak/Fair/Good/Strong)
  - [ ] Try weak password - see feedback "Add: uppercase, number..."
  - [ ] Try strong password - see "Strong" with green bar
- [ ] Enter confirm password: **[Same Password]**
  - [ ] Try wrong password - should show "Passwords don't match"
  - [ ] Enter matching password
- [ ] Check "I agree to Terms" checkbox
- [ ] See trust badge: "🛡️ Your password is encrypted..."
- [ ] Tap "Create Account"
- [ ] Wait for account creation (loading spinner)
- [ ] **RESULT:** ✅ Pass / ❌ Fail

**Screenshot Required:** Yes ☐
**Note any errors:**

---

### 1.4 Role Selection Screen
- [ ] See "🎯" emoji icon
- [ ] Title: "How will you use MyAI Landlord, [Your Name]?"
- [ ] Progress: Step 3 of 4 (3 dots active)
- [ ] See two role cards:
  - [ ] "🏠 I'm a Landlord" with description
  - [ ] "🔑 I'm a Tenant" with description
- [ ] Tap "I'm a Landlord" card
  - [ ] Card border turns blue
  - [ ] Radio button fills in
- [ ] See info card: "💡 You can always switch roles..."
- [ ] Tap "Continue"
- [ ] **RESULT:** ✅ Pass / ❌ Fail

**Screenshot Required:** Yes ☐

---

### 1.5 Landlord Welcome Screen
- [ ] See "🎉" emoji icon
- [ ] Title: "Welcome, [Your Name]!"
- [ ] Subtitle: "Here's what you can do with MyAI Landlord"
- [ ] Progress: Step 4 of 4 (4 dots active)
- [ ] See 4 feature cards:
  - [ ] "🏠 Property Management"
  - [ ] "🔧 Maintenance Tracking"
  - [ ] "💬 Easy Communication"
  - [ ] "📊 Smart Insights"
- [ ] See trust message: "🌟 Trusted by landlords..."
- [ ] Tap "Let's Set Up Your First Property"
- [ ] **RESULT:** ✅ Pass / ❌ Fail

**Screenshot Required:** Yes ☐

---

### 1.6 Property Setup Intro Screen
- [ ] See "🏗️" emoji icon
- [ ] Title: "Let's add your property"
- [ ] Subtitle: "Here's what we'll cover:"
- [ ] See 3 steps with numbered circles:
  - [ ] Step 1: Property Basics
  - [ ] Step 2: Property Areas
  - [ ] Step 3: Invite Tenant (optional)
- [ ] See info card: "⏱️ Don't worry, you can always edit..."
- [ ] Tap "Start Property Setup"
- [ ] **RESULT:** ✅ Pass / ❌ Fail

**Screenshot Required:** Yes ☐

---

### 1.7 Property Basics Screen
- [ ] See title: "Property Basics"
- [ ] See "Step 1 of 2" indicator

**Address Section:**
- [ ] Enter Property Name: **[e.g., "Sunset Apartments"]**
- [ ] Enter Address Line 1: **[e.g., "123 Main St"]**
- [ ] Enter Address Line 2 (Optional): **[e.g., "Apt 4B"]**
- [ ] Enter City: **[e.g., "San Francisco"]**
- [ ] Select State: **[e.g., "CA"]**
- [ ] Enter Postal Code: **[e.g., "94102"]**

**Property Type:**
- [ ] See 4 property type options:
  - [ ] House 🏠
  - [ ] Apartment 🏢
  - [ ] Condo 🏘️
  - [ ] Townhouse 🏡
- [ ] Select one type (card highlights)

**Bedrooms & Bathrooms:**
- [ ] See bedroom counter (+ and - buttons)
- [ ] Tap + to increase bedrooms to **3**
- [ ] See bathroom counter
- [ ] Tap + to increase bathrooms to **2**

**Draft Auto-Save:**
- [ ] Wait 2 seconds - see "Saved" indicator appear
- [ ] Verify draft saves automatically

- [ ] Tap "Continue" button
- [ ] **RESULT:** ✅ Pass / ❌ Fail

**Screenshot Required:** Yes ☐

---

### 1.8 Property Areas Screen
- [ ] See title: "Property Areas"
- [ ] See "Step 2 of 2" indicator
- [ ] See property name and type at top
- [ ] See bedrooms/bathrooms displayed (read-only):
  - [ ] Shows "3 Bedrooms" (from previous screen)
  - [ ] Shows "2 Bathrooms" (from previous screen)

**Area Counters (Check what's available):**
- [ ] Kitchen counter (+ and -)
- [ ] Living Room counter
- [ ] Laundry counter
- [ ] Garage counter
- [ ] Yard counter

**Test Adding Areas:**
- [ ] Tap + on "Kitchen" → should add "Kitchen"
- [ ] Tap + on "Living Room" → should add "Living Room"
- [ ] Tap + on "Garage" → should add "Garage"
- [ ] Tap - on "Garage" → should remove "Garage"

**Custom Room (Optional):**
- [ ] Look for "Add Custom Room" option
- [ ] If available, try adding custom room

**Generated Rooms Display:**
- [ ] Verify bedrooms auto-generated:
  - [ ] "Master Bedroom"
  - [ ] "Bedroom 2"
  - [ ] "Bedroom 3"
- [ ] Verify bathrooms auto-generated:
  - [ ] "Master Bathroom"
  - [ ] "Bathroom 2"

- [ ] Tap "Continue" or "Save & Continue"
- [ ] Wait for save to Supabase (loading indicator)
- [ ] **RESULT:** ✅ Pass / ❌ Fail

**Screenshot Required:** Yes ☐
**Note:** This step saves to the database!

---

### 1.9 Tenant Invite Screen
- [ ] See "🔗" emoji icon
- [ ] Title: "Invite your tenant"
- [ ] Progress: Property Setup Step 4 of 4
- [ ] See invite link displayed (starts with "myailandlord://")
- [ ] Tap "📋 Copy Link"
  - [ ] Button changes to "✓ Copied!"
  - [ ] Text is in clipboard
- [ ] Tap "📤 Share"
  - [ ] iOS share sheet appears
  - [ ] Can share via Messages, Email, etc.
- [ ] See info: "💡 When your tenant clicks this link..."
- [ ] Tap "Continue" (or "I'll invite them later")
- [ ] **RESULT:** ✅ Pass / ❌ Fail

**Screenshot Required:** Yes ☐

---

### 1.10 Success Screen
- [ ] See "🎉" emoji with animated circle
- [ ] Title: "You're all set, [Your Name]!"
- [ ] Subtitle: "Your property is ready..."
- [ ] See "✅ Setup Complete" badge
- [ ] See "Here's what you can do next:" section with:
  - [ ] "📸 Add photos to your property"
  - [ ] "📝 Review and respond to maintenance requests"
  - [ ] "💬 Chat with your tenants"
- [ ] Tap "Go to Dashboard"
- [ ] Wait for role to be saved and navigation
- [ ] **RESULT:** ✅ Pass / ❌ Fail

**Screenshot Required:** Yes ☐

---

### 1.11 Dashboard / Home Screen
- [ ] Successfully navigated to main app
- [ ] See property listed on dashboard
- [ ] Verify property name matches: **[Property Name]**
- [ ] No crashes or errors
- [ ] **RESULT:** ✅ Pass / ❌ Fail

**Screenshot Required:** Yes ☐

---

## Test 2: EXISTING USER (With Property)

### 2.1 Test Re-Launch
- [ ] Force close app
- [ ] Re-open app
- [ ] Should go directly to Dashboard (skip onboarding)
- [ ] Property still visible
- [ ] **RESULT:** ✅ Pass / ❌ Fail

---

## Test 3: EDGE CASES & ERROR HANDLING

### 3.1 Network Errors
- [ ] Turn on Airplane Mode
- [ ] Try to create account
- [ ] Verify error message shown
- [ ] Turn off Airplane Mode
- [ ] Retry - should work
- [ ] **RESULT:** ✅ Pass / ❌ Fail

### 3.2 Duplicate Email
- [ ] Try to create account with existing email
- [ ] Verify error: "Email already in use" or similar
- [ ] **RESULT:** ✅ Pass / ❌ Fail

### 3.3 Back Navigation
- [ ] During onboarding, test back button behavior
- [ ] Verify data is preserved when going back
- [ ] **RESULT:** ✅ Pass / ❌ Fail

---

## Test 4: PERFORMANCE & STABILITY

### 4.1 App Performance
- [ ] No lag or stuttering during navigation
- [ ] Animations smooth (success screen, progress bars)
- [ ] Form inputs responsive (no delay when typing)
- [ ] **RESULT:** ✅ Pass / ❌ Fail

### 4.2 Memory / Crashes
- [ ] No crashes during entire onboarding flow
- [ ] App doesn't freeze or hang
- [ ] **RESULT:** ✅ Pass / ❌ Fail

### 4.3 Draft Auto-Save
- [ ] In Property Basics, fill out form
- [ ] Wait for auto-save (2 seconds)
- [ ] Force close app
- [ ] Re-open and start property setup
- [ ] Verify data was saved
- [ ] **RESULT:** ✅ Pass / ❌ Fail

---

## 📊 FINAL VERIFICATION

### Database Check (Post-Test)
- [ ] Log into Supabase Dashboard
- [ ] Check `profiles` table:
  - [ ] New profile created with your test email
  - [ ] `first_name` field populated
  - [ ] `role` = 'landlord'
- [ ] Check `properties` table:
  - [ ] New property created
  - [ ] Property name matches
  - [ ] Address fields populated
  - [ ] Type, bedrooms, bathrooms correct
- [ ] Check `property_areas` table:
  - [ ] All selected areas created
  - [ ] Bedrooms generated correctly (Master, Bedroom 2, etc.)
  - [ ] Bathrooms generated correctly

---

## 🐛 BUGS FOUND

### Bug #1
**Screen:** [Screen Name]
**Description:** [What went wrong]
**Steps to Reproduce:**
1.
2.
3.

**Expected:** [What should happen]
**Actual:** [What actually happened]
**Severity:** Critical / High / Medium / Low
**Screenshot:** ☐

---

### Bug #2
**Screen:** [Screen Name]
**Description:** [What went wrong]
**Steps to Reproduce:**
1.
2.
3.

**Expected:** [What should happen]
**Actual:** [What actually happened]
**Severity:** Critical / High / Medium / Low
**Screenshot:** ☐

---

## 💡 FEEDBACK & IMPROVEMENTS

### What Worked Well:
-
-
-

### What Could Be Better:
-
-
-

### Feature Requests:
-
-
-

---

## ✅ FINAL SIGN-OFF

**Overall Test Result:** ✅ PASS / ❌ FAIL
**Ready for Production:** YES / NO
**Critical Issues Found:** [Number]
**Tested By:** Doug Simpson
**Date Completed:** __________
**Total Test Duration:** __________ minutes

---

## 📝 NOTES

