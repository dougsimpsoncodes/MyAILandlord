# Test User Setup Guide
**Complete guide for setting up test users for E2E testing**

## Overview

The E2E test suite requires 2 test users in Clerk:
1. **Landlord User** - For testing landlord workflows
2. **Tenant User** - For testing tenant workflows

## Prerequisites

- Access to Clerk Dashboard
- Your Clerk application configured
- Publishable key: `pk_test_ZHJpdmVuLWFsaWVuLTE1LmNsZXJrLmFjY291bnRzLmRldiQ`

## Step-by-Step Setup

### Step 1: Access Clerk Dashboard

1. Go to: https://dashboard.clerk.com
2. Sign in to your account
3. Select your application (the one with the publishable key above)

### Step 2: Create Landlord Test User

1. **Navigate to Users:**
   - Click "Users" in the left sidebar
   - Click "Create User" button (top right)

2. **Fill in User Details:**
   ```
   Email: test-landlord@myailandlord.com
   Password: TestPassword123!
   First Name: Test
   Last Name: Landlord
   ```

3. **Verify Email Immediately:**
   - ⚠️ **IMPORTANT:** You must verify the email!
   - Option A: Check "Email verified" checkbox when creating user
   - Option B: After creating, click the user → Actions → Verify email address

4. **Confirm Creation:**
   - Ensure email shows as "Verified" (green checkmark)
   - Note the User ID (you won't need it, but good to confirm it exists)

### Step 3: Create Tenant Test User

1. **Create Second User:**
   - Click "Create User" again

2. **Fill in User Details:**
   ```
   Email: test-tenant@myailandlord.com
   Password: TestPassword456!
   First Name: Test
   Last Name: Tenant
   ```

3. **Verify Email Immediately:**
   - ⚠️ **IMPORTANT:** Check "Email verified" checkbox
   - Or verify after creation via Actions menu

4. **Confirm Creation:**
   - Ensure email shows as "Verified" (green checkmark)

### Step 4: Verify Test User Credentials

Your `.env.test` file should already have:

```bash
# Test User Credentials
TEST_USER_EMAIL=test-landlord@myailandlord.com
TEST_USER_PASSWORD=TestPassword123!

# Test User 2
TEST_USER_2_EMAIL=test-tenant@myailandlord.com
TEST_USER_2_PASSWORD=TestPassword456!
```

✅ **Credentials match** - You're good to go!

## Verification Checklist

Before running tests, verify:

- [ ] Both users created in Clerk Dashboard
- [ ] Both emails verified (green checkmark)
- [ ] Passwords match `.env.test` exactly
- [ ] `.env.test` file exists with correct credentials
- [ ] App is running: `npm run web`

## Common Issues & Solutions

### Issue 1: Email Not Verified

**Symptom:** Tests fail with "Email not verified" error

**Solution:**
1. Go to Clerk Dashboard → Users
2. Click on the test user
3. Click "Actions" → "Verify email address"
4. Confirm the action

### Issue 2: Wrong Password

**Symptom:** Tests fail with "Invalid credentials" error

**Solution:**
1. In Clerk Dashboard, click on the user
2. Click "Actions" → "Reset password"
3. Set password to match `.env.test`:
   - Landlord: `TestPassword123!`
   - Tenant: `TestPassword456!`

### Issue 3: User Not Found

**Symptom:** Tests fail with "User not found" error

**Solution:**
1. Check Clerk Dashboard → Users
2. Ensure user exists with exact email:
   - `test-landlord@myailandlord.com`
   - `test-tenant@myailandlord.com`
3. If missing, create the user following steps above

### Issue 4: Role Not Set

**Symptom:** Dashboard tests fail after login

**Solution:**
In your app, after first login:
1. User should see role selection screen
2. Select "Landlord" for test-landlord user
3. Select "Tenant" for test-tenant user
4. Role is stored in Supabase `profiles` table

## Setting Up Roles (One-Time)

### Option 1: Via App (Recommended)

1. **Start app:**
   ```bash
   npm run web
   ```

2. **Log in as landlord:**
   - Go to http://localhost:8082
   - Sign in with `test-landlord@myailandlord.com` / `TestPassword123!`
   - Select "Landlord" role
   - Complete onboarding

3. **Log out and log in as tenant:**
   - Sign out
   - Sign in with `test-tenant@myailandlord.com` / `TestPassword456!`
   - Select "Tenant" role
   - Complete onboarding

### Option 2: Via Supabase Dashboard

1. **Go to Supabase Dashboard:**
   - Open: https://app.supabase.com
   - Select your project
   - Go to Table Editor → `profiles`

2. **Find test users:**
   - Look for rows where `clerk_user_id` matches the Clerk user IDs
   - OR filter by email addresses

3. **Set roles manually:**
   - For landlord: Set `role = 'landlord'`
   - For tenant: Set `role = 'tenant'`

## Testing the Setup

### Quick Verification

```bash
# Run auth tests only
npm run test:e2e:auth

# Expected results:
# - Should now show "TEST_USER credentials available"
# - Login tests should pass
# - Session tests should pass
# - Logout tests should pass
```

### Expected Pass Rate

**Before user setup:** 9/26 passing (35%)
**After user setup:** 16-20/26 passing (60-75%)
**After role setup:** 20-24/26 passing (75-90%)
**After seed data:** 24-26/26 passing (90-100%)

## Maintenance

### Resetting Test Users

If tests leave data in a bad state:

1. **Delete user data in Supabase:**
   ```sql
   -- In Supabase SQL Editor
   DELETE FROM maintenance_requests WHERE landlord_id IN (
     SELECT id FROM profiles WHERE email LIKE 'test-%@myailandlord.com'
   );

   DELETE FROM properties WHERE landlord_id IN (
     SELECT id FROM profiles WHERE email LIKE 'test-%@myailandlord.com'
   );

   -- Keep profiles but reset state
   UPDATE profiles
   SET onboarding_completed = false
   WHERE email LIKE 'test-%@myailandlord.com';
   ```

2. **Or recreate users:**
   - Delete users in Clerk Dashboard
   - Follow setup steps again

### Monthly Check

Once a month, verify:
- [ ] Test users still exist
- [ ] Emails still verified
- [ ] Passwords still work
- [ ] Roles still set correctly

## Security Notes

⚠️ **IMPORTANT Security Considerations:**

1. **Never commit `.env.test` to git**
   - Already in `.gitignore`
   - Contains real credentials

2. **Use test environment only**
   - These are TEST users only
   - Don't use in production

3. **Keep passwords strong**
   - `TestPassword123!` is strong enough for tests
   - Don't reuse for other services

4. **Separate Clerk application**
   - Ideally use a separate Clerk application for testing
   - Prevents test data mixing with production

## Next Steps

After setting up test users:

1. **Run tests:**
   ```bash
   npm run test:e2e
   ```

2. **Check results:**
   ```bash
   npx playwright show-report
   ```

3. **Set up roles** (if needed)
   - Log in to app with each user
   - Complete role selection

4. **Add seed data** (optional)
   - See `SEED_DATA_GUIDE.md` (to be created)

## Troubleshooting

### Tests Still Failing After Setup?

1. **Check Clerk Dashboard:**
   - Users exist? ✓
   - Emails verified? ✓
   - In correct application? ✓

2. **Check `.env.test`:**
   - File exists? ✓
   - Credentials correct? ✓
   - No typos? ✓

3. **Check app:**
   - Running on port 8082? ✓
   - Clerk initialized? ✓
   - No console errors? ✓

4. **Check test output:**
   - Look for "TEST_USER credentials available" ✓
   - Check error messages for clues

### Still Having Issues?

Check the detailed error in test results:
```bash
cat test-results/auth-*/error-context.md
```

Or view the HTML report:
```bash
npx playwright show-report
```

---

## Quick Reference

```bash
# Test User 1 (Landlord)
Email: test-landlord@myailandlord.com
Password: TestPassword123!
Role: Landlord

# Test User 2 (Tenant)
Email: test-tenant@myailandlord.com
Password: TestPassword456!
Role: Tenant

# Run tests
npm run test:e2e              # Quick suite
npm run test:e2e:auth         # Auth only
npm run test:e2e:critical     # Critical paths

# View results
npx playwright show-report
```

---

**Created:** 2025-11-14
**Last Updated:** 2025-11-14
**Status:** Ready for use
