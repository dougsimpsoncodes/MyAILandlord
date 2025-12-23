# Invite Flow Testing Guide

## 🎯 **Quick Start**

### **1. Install Dependencies**
```bash
npm install -g ts-node
```

### **2. Set Environment Variables**
```bash
# Copy .env.example to .env if not already done
cp .env.example .env

# Ensure these are set in your .env:
EXPO_PUBLIC_SUPABASE_URL=https://zxqhxjuwmkxevhkpqfzf.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **3. Run Tests**

```bash
# Run all automated tests
npm run test:invite

# Run specific test suites
npm run test:invite quality      # Token quality tests only
npm run test:invite validation   # Token validation tests only
npm run test:invite security     # Security tests only
npm run test:invite flow         # Generate test invite for manual testing
```

---

## 📋 **Test Suites**

### **Phase 1: Token Quality Tests** (`quality`)

Tests token generation quality and format:

✅ **Token Format Validation**
- Length exactly 12 characters
- Base62 charset (a-zA-Z0-9)
- URL-safe (no encoding needed)
- No ambiguous characters

✅ **Token Uniqueness**
- Generates 100 tokens
- Verifies zero duplicates
- Tests collision handling

✅ **Token Metadata**
- Property ID correct
- created_by set (auth.uid())
- max_uses = 1
- use_count = 0
- revoked_at = NULL

✅ **Expiration Calculation**
- Tests 1, 7, 14, 30 day expirations
- Verifies ±5 minute accuracy

**Expected Runtime:** ~30 seconds

---

### **Phase 2: Token Validation Tests** (`validation`)

Tests token validation logic:

✅ **Expired Token**
- Returns `valid: false`
- Error code: `expired`
- User-friendly message

✅ **Revoked Token**
- Returns `valid: false`
- Error code: `revoked`
- Clear explanation

✅ **Invalid Tokens**
- Too short (5 chars)
- Too long (18 chars)
- Special characters
- Non-existent token
- All return `valid: false`

✅ **Missing Token**
- Missing parameter handled gracefully

**Expected Runtime:** ~20 seconds

---

### **Phase 3: Security Tests** (`security`)

Tests security measures:

✅ **Token Enumeration Prevention**
- Tests 10 random tokens
- All rejected
- Consistent response times (no timing leaks)

✅ **RLS Policy Enforcement**
- Anonymous user cannot query invite_tokens
- Data access blocked by RLS

⚠️ **Token Logging Verification**
- Manual check required
- Verify no tokens in logs
- Only token_id (UUID) should appear

**Expected Runtime:** ~15 seconds

---

### **Phase 4: Manual Flow Tests** (`flow`)

Generates a test invite for manual click-through testing:

🎟️ **Generated Invite Details:**
- Valid for 1 day
- Max uses: 5 (for repeated testing)
- Displays full invite URL
- Provides manual testing checklist

**Manual Testing Checklist:**
1. ✅ Open invite URL in incognito browser
2. ✅ Verify property details display
3. ✅ Click "Accept Invitation" button
4. ✅ Complete sign-up if needed
5. ✅ Verify redirect to property details
6. ✅ Check property in tenant dashboard

**Expected Runtime:** Interactive (user-paced)

---

## 🎨 **Sample Output**

```
🚀 INVITE FLOW TEST SUITE
============================================================
Environment: http://localhost:8082
Test Suite: all
============================================================

🧪 PHASE 1: TOKEN QUALITY TESTS
============================================================

🔷 Test 1.1: Token Format Validation
  ℹ️  Generating sample token...
  ✅ Token length is 12 characters
  ✅ Token uses base62 charset (a-zA-Z0-9)
  ✅ Token is URL-safe (no encoding needed)
  ℹ️  ✓ No ambiguous characters detected
  ℹ️  Sample token: eD1sKM9BImT1

🔷 Test 1.2: Token Uniqueness (100 samples)
  ℹ️  Generating 100 tokens...
  ℹ️    Generated 20/100...
  ℹ️    Generated 40/100...
  ℹ️    Generated 60/100...
  ℹ️    Generated 80/100...
  ℹ️    Generated 100/100...
  ✅ All 100 tokens are unique
  ℹ️  Generated tokens: 100, Unique: 100

============================================================
📊 TEST SUMMARY
============================================================
Total Tests: 25
✅ Passed: 25
============================================================

✅ ALL TESTS PASSED
============================================================
```

---

## 🐛 **Troubleshooting**

### **"Missing Supabase credentials"**
- Ensure `.env` file exists in project root
- Verify `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set

### **"Some tests will be skipped"**
- Set `SUPABASE_SERVICE_ROLE_KEY` for full test coverage
- Get from: Supabase Dashboard → Settings → API → service_role key

### **Token validation tests fail**
- Ensure `validate-invite-token` Edge Function is deployed:
  ```bash
  supabase functions deploy validate-invite-token
  ```

### **"Cannot find module 'ts-node'"**
- Install globally: `npm install -g ts-node`
- Or use npx: `npx ts-node scripts/test-invite-flow.ts`

---

## 📊 **CI Integration**

Add to `.github/workflows/invite-tests.yml`:

```yaml
name: Invite Tests

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  invite-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run invite tests
        run: npm run test:invite
        env:
          EXPO_PUBLIC_SUPABASE_URL: ${{ secrets.EXPO_PUBLIC_SUPABASE_URL }}
          EXPO_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.EXPO_PUBLIC_SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

---

## 🔧 **Customization**

### **Change Sample Size**
Edit `testTokenUniqueness()`:
```typescript
const sampleSize = 1000; // Default: 100
```

### **Adjust Timing Tolerance**
Edit `testExpirationCalculation()`:
```typescript
minutesDiff < 10 // Default: 5 minutes
```

### **Test Different Expiration Periods**
Edit `testExpirationCalculation()`:
```typescript
const expirationDays = [1, 3, 7, 14, 30, 90];
```

---

## 📝 **Adding Custom Tests**

Create a new test class:

```typescript
class CustomTests {
  private results = new TestResults();

  async run(): Promise<boolean> {
    log('\n🧪 CUSTOM TESTS', 'cyan');

    await this.myCustomTest();

    return this.results.summary();
  }

  private async myCustomTest() {
    logStep('My Custom Test');

    // Your test logic here
    const passed = true; // or false

    this.results.addTest('Test description', passed);
  }
}
```

Add to main():
```typescript
if (testSuite === 'all' || testSuite === 'custom') {
  const customTests = new CustomTests();
  const passed = await customTests.run();
  allTestsPassed = allTestsPassed && passed;
}
```

---

## 🎯 **Coverage Checklist**

- [x] Token format validation
- [x] Token uniqueness (100 samples)
- [x] Metadata accuracy
- [x] Expiration calculation (multiple periods)
- [x] Expired token handling
- [x] Revoked token handling
- [x] Invalid token formats
- [x] Missing token parameter
- [x] Enumeration prevention
- [x] RLS policy enforcement
- [ ] Manual click-through (web)
- [ ] Manual click-through (mobile)
- [ ] Email client compatibility
- [ ] Deep linking (iOS/Android)
- [ ] Cross-browser testing

**Automated:** 9/14 tests ✅
**Manual Required:** 5/14 tests 📋

---

## 📚 **Related Documentation**

- [Production Readiness Validation](../PRODUCTION_READINESS_VALIDATION.md)
- [E2E Testing Guide](../E2E_TESTING_COMPLETE_GUIDE.md)
- [CI Setup Guide](../.github/CI_SETUP_GUIDE.md)
- [Invite Flow Implementation](../docs/TOKENIZED_INVITES_IMPLEMENTATION.md)

---

**Last Updated:** 2025-12-23
**Script Version:** v1.0
