# Live Testing Checklist
**Pre-flight checklist for Playwright E2E testing**

## 🚀 Quick Start (First Time Setup)

### Step 1: Install Dependencies (5 minutes)
```bash
# Install Playwright and browsers
npm install
npx playwright install
```

**Verification:**
```bash
npx playwright --version
# Should output: Version 1.54.2
```

---

### Step 2: Configure Test Environment (10 minutes)

#### Create .env.test file:
```bash
cp .env.test.example .env.test
```

#### Fill in credentials in .env.test:
```bash
# Required credentials:
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
TEST_USER_EMAIL=test-landlord@yourdomain.com
TEST_USER_PASSWORD=TestPassword123!
TEST_USER_2_EMAIL=test-tenant@yourdomain.com
TEST_USER_2_PASSWORD=TestPassword456!
```

**Where to find credentials:**
- Clerk: https://dashboard.clerk.com → API Keys
- Supabase: https://app.supabase.com → Settings → API

---

### Step 3: Create Test Users in Clerk (10 minutes)

#### User 1 - Landlord:
1. Go to Clerk Dashboard → Users
2. Click "Create User"
3. Email: `test-landlord@yourdomain.com`
4. Password: `TestPassword123!`
5. ✅ Verify email immediately
6. Add to `.env.test`

#### User 2 - Tenant:
1. Repeat for tenant user
2. Email: `test-tenant@yourdomain.com`
3. Password: `TestPassword456!`
4. ✅ Verify email immediately
5. Add to `.env.test`

**Important:** Both users must have verified emails!

---

### Step 4: Verify Test Fixtures (2 minutes)
```bash
ls -la e2e/fixtures/
```

**Expected files:**
- ✅ test-photo-1.jpg
- ✅ test-photo-2.jpg
- ✅ test-photo-3.jpg
- ✅ test-audio.mp3
- ✅ test-large-file.jpg
- ✅ test-file.txt

If missing, tests will create placeholders.

---

## 🎯 Running Tests

### Option 1: Quick Test (Recommended First Run)
```bash
# Start app in one terminal
npm run web

# Wait for app to load at http://localhost:8082
# Then in another terminal:
./scripts/run-live-tests.sh quick
```

**What it tests:**
- ✅ App loads
- ✅ Authentication works
- ✅ Maintenance dashboard functional
- ⏱️ Duration: ~30 minutes

---

### Option 2: Full Critical Path
```bash
./scripts/run-live-tests.sh critical
```

**What it tests:**
- ✅ All authentication flows
- ✅ User onboarding
- ✅ Role-based access
- ✅ Tenant workflows
- ✅ File uploads
- ⏱️ Duration: ~2 hours

---

### Option 3: Full Test Suite
```bash
./scripts/run-live-tests.sh full
```

**What it tests:**
- ✅ Everything (160+ tests)
- ✅ All features
- ✅ All workflows
- ⏱️ Duration: ~4 hours

---

## 📋 Pre-Flight Checklist

Before running ANY tests, verify:

### Environment
- [ ] `.env.test` file exists and has real credentials
- [ ] Both test users created in Clerk
- [ ] Both test users have verified emails
- [ ] Supabase database is accessible
- [ ] Test fixtures exist in `e2e/fixtures/`

### Application
- [ ] App is running: `npm run web`
- [ ] App loads at http://localhost:8082
- [ ] No console errors on app startup
- [ ] Clerk widget appears on welcome screen

### Test Infrastructure
- [ ] Playwright installed: `npx playwright --version`
- [ ] Browsers installed: `npx playwright install`
- [ ] Test script is executable: `chmod +x scripts/run-live-tests.sh`

---

## 🐛 Troubleshooting Common Issues

### Issue 1: "App not running at http://localhost:8082"
**Solution:**
```bash
# Start the app
npm run web

# Wait for this message:
# "Metro waiting on exp://192.168.x.x:8081"

# Then verify app loads:
open http://localhost:8082
```

---

### Issue 2: ".env.test file not found"
**Solution:**
```bash
cp .env.test.example .env.test
# Edit .env.test with your credentials
```

---

### Issue 3: "Test user authentication failed"
**Possible causes:**
1. Email not verified in Clerk
2. Wrong credentials in .env.test
3. Test user doesn't exist

**Solution:**
```bash
# Verify credentials match exactly:
cat .env.test | grep TEST_USER

# Check user exists in Clerk Dashboard
# Verify email is verified (green checkmark)
```

---

### Issue 4: "Timeout waiting for selector"
**Possible causes:**
1. App is slow to load
2. Network issues
3. Element selector changed

**Solution:**
```bash
# Run with headed mode to see what's happening
npx playwright test e2e/simple-test.spec.ts --headed

# Or use debug mode
npx playwright test e2e/simple-test.spec.ts --debug
```

---

### Issue 5: "File upload tests failing"
**Possible causes:**
1. Test fixtures missing
2. Supabase storage not configured
3. File size limits

**Solution:**
```bash
# Check fixtures exist
ls -la e2e/fixtures/

# Verify Supabase storage bucket exists
# Check storage policies allow uploads
```

---

## 📊 Understanding Test Results

### Viewing Reports
```bash
# After tests complete, view HTML report:
npx playwright show-report

# Opens browser at: http://localhost:9323
```

### Report Sections:
1. **Overview:** Pass/fail summary
2. **Tests:** Detailed test results
3. **Screenshots:** Failure screenshots
4. **Videos:** Failure videos
5. **Traces:** Detailed execution traces

### Interpreting Results:

**✅ Green (Passed):** Test passed, feature working
**❌ Red (Failed):** Test failed, bug found
**⏭️ Yellow (Skipped):** Test intentionally skipped (e.g., OAuth without production keys)

---

## 🔄 Iterative Testing Workflow

### First Run (30 minutes)
```bash
./scripts/run-live-tests.sh quick
```
**If fails:** Fix issues, re-run

### Second Run (2 hours)
```bash
./scripts/run-live-tests.sh critical
```
**If fails:** Fix P0/P1 issues, re-run

### Final Run (4 hours)
```bash
./scripts/run-live-tests.sh full
```
**If passes:** Ready to deploy! ✅

---

## 📈 Success Criteria

### Acceptable Results:
- ✅ **95%+ pass rate** (expect some OAuth tests to skip)
- ✅ **No P0/P1 failures** (critical bugs)
- ✅ **< 5% flakiness** (tests that sometimes fail)

### What to do with failures:

**P0 Failures (Authentication, Data Loss, Security):**
- 🚨 **STOP deployment**
- Fix immediately
- Re-run all tests
- Do NOT proceed until fixed

**P1 Failures (Major Features):**
- ⚠️ **Delay deployment**
- Fix before release
- Document workarounds if needed

**P2/P3 Failures (Minor Issues):**
- ✅ **OK to deploy**
- Create tickets for later
- Document in release notes

---

## 🎓 Test Modes Explained

| Mode | Tests | Duration | Use Case |
|------|-------|----------|----------|
| `quick` | Smoke + critical path | 30 min | Daily dev, quick validation |
| `auth` | All auth tests | 45 min | After auth changes |
| `maintenance` | Maintenance features | 1 hour | After maintenance feature work |
| `critical` | Critical user journeys | 2 hours | Before staging deploy |
| `mobile` | Mobile viewports | 2 hours | Before mobile release |
| `full` | All tests, 1 browser | 4 hours | Weekly regression |
| `all-browsers` | All tests, all browsers | 6+ hours | Before production deploy |

---

## 💡 Pro Tips

1. **Run tests in parallel:**
   ```bash
   # Edit playwright.config.ts
   workers: 4 // Run 4 tests simultaneously
   ```

2. **Debug specific test:**
   ```bash
   npx playwright test e2e/auth/clerk-authentication.spec.ts --debug
   ```

3. **Watch mode (re-run on changes):**
   ```bash
   npx playwright test --ui
   ```

4. **Generate test code:**
   ```bash
   npx playwright codegen http://localhost:8082
   ```

5. **Run only failed tests:**
   ```bash
   npx playwright test --last-failed
   ```

6. **Test specific browser:**
   ```bash
   npx playwright test --project=chromium
   npx playwright test --project="Mobile Safari"
   ```

---

## 📞 Need Help?

1. **Check existing guides:**
   - [LIVE_TESTING_PLAN.md](./LIVE_TESTING_PLAN.md) - Full testing strategy
   - [TEST_EXECUTION_GUIDE.md](./TEST_EXECUTION_GUIDE.md) - Detailed execution instructions
   - [E2E_TEST_SUITE_REPORT.md](./E2E_TEST_SUITE_REPORT.md) - Test suite documentation

2. **Common issues:**
   - [DEBUGGING_METHODOLOGY.md](./DEBUGGING_METHODOLOGY.md) - Debugging guide
   - [Playwright Docs](https://playwright.dev) - Official documentation

3. **Test failures:**
   - Check `test-results/` for screenshots
   - View HTML report: `npx playwright show-report`
   - Review traces for detailed execution

---

## ✅ You're Ready When...

- [ ] `.env.test` configured with real credentials
- [ ] 2 test users created and verified in Clerk
- [ ] App running at http://localhost:8082
- [ ] Playwright installed and browsers ready
- [ ] Quick test passes: `./scripts/run-live-tests.sh quick`

**Then proceed to full testing!** 🚀

---

**Version:** 1.0
**Last Updated:** 2025-11-14
**Next:** Run `./scripts/run-live-tests.sh quick`
