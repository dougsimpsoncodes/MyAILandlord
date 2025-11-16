# Live Testing Plan - My AI Landlord
**Playwright E2E Testing Strategy**

## Executive Summary

This comprehensive testing plan covers 160+ Playwright E2E tests across all critical application features. The plan is designed for systematic execution, issue tracking, and achieving 95%+ confidence in the application.

## Test Inventory

### Critical Path Tests (New Suite - 76 tests)
1. **Authentication** (47 tests)
  - Authentication: 13 tests
   - OAuth Flows: 14 tests
   - Account Creation: 9 tests
   - Session Management: 11 tests

2. **Onboarding** (10 tests)
   - Profile Creation: 10 tests

3. **Access Control** (5 tests)
   - Role-Based Access: 5 tests

4. **Tenant Flows** (3 tests)
   - Tenant User Flows: 3 tests

5. **File Operations** (6 tests)
   - File Upload Flows: 6 tests

6. **Real-time Features** (5 tests)
   - Real-time Features: 5 tests

### Feature Tests (Existing Suite - 84 tests)
7. **Maintenance Management** (29 tests)
   - Maintenance Dashboard: 11 tests
   - Maintenance Flow: 3 tests
   - Landlord Maintenance Flow: 4 tests
   - Case Detail: 14 tests (includes emergency classification, priority handling, status updates)

8. **Property Management** (3 tests)
   - Property Setup E2E: 3 tests

9. **Vendor Integration** (15 tests)
   - Send to Vendor: 15 tests

10. **API Integration** (11 tests)
    - API Integration: 11 tests

11. **UI Consistency** (16 tests)
    - UI Consistency: 16 tests

12. **Comprehensive Workflows** (10 tests)
    - Comprehensive Workflow: 2 tests
    - Realistic Landlord Flow: 3 tests
    - Simple Test: 2 tests

**Total Tests: 160+**

## Testing Phases

### Phase 1: Environment Setup & Smoke Tests (30 minutes)
**Goal:** Ensure testing environment is ready

#### Checklist:
- [ ] Install Playwright browsers: `npx playwright install`
- [ ] Create `.env.test` from `.env.test.example`
- [ ] Fill in all required credentials
- [ ] Create 2 test users in Supabase Auth (see credentials section below)
- [ ] Verify Supabase database is accessible
- [ ] Start the app: `npm run web`
- [ ] Verify app loads at http://localhost:8082
- [ ] Run smoke test: `npx playwright test e2e/simple-test.spec.ts --project=chromium`

#### Test User Credentials Required:
```bash
# Primary Test User
TEST_USER_EMAIL=test-landlord@yourdomain.com
TEST_USER_PASSWORD=TestPassword123!
Role: Landlord

# Secondary Test User
TEST_USER_2_EMAIL=test-tenant@yourdomain.com
TEST_USER_2_PASSWORD=TestPassword456!
Role: Tenant
```

#### Success Criteria:
- ✅ App loads successfully
- ✅ Authentication screen appears
- ✅ Smoke test passes
- ✅ No console errors

---

### Phase 2: Authentication & Session Tests (45 minutes)
**Goal:** Validate core authentication flows

#### Test Execution:
```bash
# Run all auth tests on Chromium first (fastest feedback)
npx playwright test e2e/auth --project=chromium

# If passing, run on all browsers
npx playwright test e2e/auth
```

#### Tests Covered (47 tests):
- ✅ Welcome screen loads
- ✅ Sign up flow (email/password)
- ✅ Login flow (email/password)
- ✅ OAuth button availability (Google, Apple)
- ✅ Logout functionality
- ✅ Session persistence across refreshes
- ✅ Session expiry handling
- ✅ Invalid credentials handling
- ✅ Account creation end-to-end
- ✅ Multi-tab session sync

#### Expected Results:
- **Pass Rate:** 85-95% (OAuth tests may skip if production keys not configured)
- **Known Blockers:** OAuth requires production credentials
- **Critical Failures:** None expected for email/password flows

#### Issue Tracking:
- Document any failures in `test-results/auth-issues.md`
- Screenshot failures automatically saved to `test-results/`
- Video recordings for failed tests

---

### Phase 3: Onboarding & Access Control (30 minutes)
**Goal:** Validate user onboarding and role-based access

#### Test Execution:
```bash
# Run onboarding tests
npx playwright test e2e/onboarding --project=chromium

# Run access control tests
npx playwright test e2e/access-control --project=chromium
```

#### Tests Covered (15 tests):
- ✅ Profile creation form validation
- ✅ Profile photo upload
- ✅ Profile data submission
- ✅ Profile update flow
- ✅ Required vs optional fields
- ✅ Landlord-only features hidden from tenants
- ✅ Tenant-only features hidden from landlords
- ✅ Role-based route protection

#### Success Criteria:
- All profile tests pass
- Role isolation verified
- No cross-role data leakage

---

### Phase 4: File Upload & Real-time Features (30 minutes)
**Goal:** Validate file operations and real-time sync

#### Test Execution:
```bash
# File upload tests
npx playwright test e2e/uploads --project=chromium

# Real-time tests (requires 2 browser contexts)
npx playwright test e2e/realtime --project=chromium
```

#### Tests Covered (11 tests):
**File Uploads (6 tests):**
- ✅ Single photo upload
- ✅ Multiple photo uploads
- ✅ File size validation (reject >10MB)
- ✅ File type validation (images only)
- ✅ Upload progress indication
- ✅ Failed upload handling

**Real-time (5 tests):**
- ✅ New maintenance request appears in real-time
- ✅ Message notifications propagate
- ✅ Status updates sync
- ✅ Multi-user data sync
- ✅ Optimistic UI updates

#### Prerequisites:
- Test fixtures must exist in `e2e/fixtures/`
- Supabase real-time must be enabled

---

### Phase 5: Tenant User Flows (20 minutes)
**Goal:** Validate complete tenant journey

#### Test Execution:
```bash
npx playwright test e2e/tenant --project=chromium
```

#### Tests Covered (3 tests):
- ✅ Tenant accepts property invite
- ✅ Tenant views property info
- ✅ Tenant creates maintenance request

#### User Journey:
1. Login as test-tenant@yourdomain.com
2. Accept property invitation (landlord must create first)
3. View property details
4. Submit maintenance request with photos

---

### Phase 6: Maintenance Management (60 minutes)
**Goal:** Validate landlord maintenance workflows

#### Test Execution:
```bash
# Maintenance dashboard
npx playwright test e2e/maintenance-dashboard.spec.ts --project=chromium

# Maintenance flows
npx playwright test e2e/landlord-maintenance-flow.spec.ts --project=chromium
npx playwright test e2e/maintenance-flow-test.spec.ts --project=chromium

# Case detail management
npx playwright test e2e/case-detail.spec.ts --project=chromium
```

#### Tests Covered (29 tests):
**Dashboard (11 tests):**
- ✅ Load dashboard with requests
- ✅ Filter by status
- ✅ Filter by priority
- ✅ Search functionality
- ✅ Sort by date
- ✅ Request count accuracy
- ✅ Empty state handling

**Case Management (14 tests):**
- ✅ View case details
- ✅ Update status
- ✅ Update priority
- ✅ Add notes
- ✅ Upload additional photos
- ✅ Emergency classification
- ✅ Cost estimation
- ✅ Timeline tracking

**Flows (4 tests):**
- ✅ Create → Assign → Complete workflow
- ✅ Emergency request handling
- ✅ Vendor assignment

---

### Phase 7: Property & Vendor Management (30 minutes)
**Goal:** Validate property setup and vendor integration

#### Test Execution:
```bash
# Property setup
npx playwright test e2e/property-setup-e2e.spec.ts --project=chromium

# Vendor integration
npx playwright test e2e/send-to-vendor.spec.ts --project=chromium
```

#### Tests Covered (18 tests):
**Property (3 tests):**
- ✅ Create new property
- ✅ Add property details
- ✅ Upload property photos

**Vendor (15 tests):**
- ✅ Send request to vendor
- ✅ Vendor notification
- ✅ Vendor response handling
- ✅ Multiple vendor management
- ✅ Vendor rating system

---

### Phase 8: API Integration & UI Consistency (40 minutes)
**Goal:** Validate API contracts and UI consistency

#### Test Execution:
```bash
# API integration
npx playwright test e2e/api-integration.spec.ts --project=chromium

# UI consistency
npx playwright test e2e/ui-consistency.spec.ts --project=chromium
```

#### Tests Covered (27 tests):
**API (11 tests):**
- ✅ REST API endpoints functional
- ✅ Error handling
- ✅ Response formats
- ✅ Authentication headers
- ✅ Rate limiting

**UI (16 tests):**
- ✅ Responsive design (mobile/tablet/desktop)
- ✅ Navigation consistency
- ✅ Button states
- ✅ Form validation messages
- ✅ Loading states
- ✅ Error states

---

### Phase 9: End-to-End Workflows (40 minutes)
**Goal:** Validate complete user journeys

#### Test Execution:
```bash
# Comprehensive workflow
npx playwright test e2e/comprehensive-workflow.spec.ts --project=chromium

# Realistic landlord flow
npx playwright test e2e/realistic-landlord-flow.spec.ts --project=chromium
```

#### Tests Covered (5 tests):
- ✅ Complete landlord onboarding → property creation → tenant invite → maintenance request → resolution
- ✅ Complete tenant onboarding → accept invite → submit request → communicate with landlord
- ✅ Multi-property management
- ✅ Cross-role communication

---

### Phase 10: Cross-Browser Testing (90 minutes)
**Goal:** Ensure compatibility across all browsers

#### Test Execution:
```bash
# Run critical tests on all browsers
npx playwright test e2e/auth e2e/onboarding e2e/tenant e2e/maintenance-dashboard.spec.ts

# Full suite on all browsers (if time permits)
npx playwright test
```

#### Browsers Tested:
- ✅ Desktop Chrome (Chromium)
- ✅ Desktop Firefox
- ✅ Desktop Safari (WebKit)
- ✅ Mobile Chrome (Pixel 5)
- ✅ Mobile Safari (iPhone 12)

#### Expected Differences:
- Mobile: Touch interactions instead of mouse
- Safari: May have stricter cookie/storage policies
- Firefox: Different rendering engine

---

## Test Execution Strategies

### Strategy 1: Quick Validation (30 minutes)
**Use Case:** Before deployments, after small changes
```bash
# Smoke tests + critical path
npx playwright test e2e/simple-test.spec.ts e2e/auth/clerk-authentication.spec.ts e2e/maintenance-dashboard.spec.ts --project=chromium
```

### Strategy 2: Feature Validation (1 hour)
**Use Case:** After feature development
```bash
# Run tests for specific feature area
npx playwright test e2e/auth e2e/maintenance-*.spec.ts --project=chromium
```

### Strategy 3: Full Regression (4 hours)
**Use Case:** Weekly, before major releases
```bash
# All tests, all browsers
npx playwright test
```

### Strategy 4: Mobile-First Testing (2 hours)
**Use Case:** Mobile release preparation
```bash
# All tests on mobile viewports
npx playwright test --project="Mobile Chrome" --project="Mobile Safari"
```

---

## Issue Management

### Issue Severity Levels

**P0 - Critical (Blocker):**
- Authentication failures
- Data loss
- Security vulnerabilities
- Complete feature failure

**P1 - High (Must Fix):**
- Major feature degradation
- Poor error handling
- Performance issues

**P2 - Medium (Should Fix):**
- UI inconsistencies
- Minor feature issues
- Edge case failures

**P3 - Low (Nice to Have):**
- Cosmetic issues
- Minor UX improvements

### Issue Template
```markdown
## Issue: [Brief Description]

**Test:** e2e/path/to/test.spec.ts
**Browser:** Chromium / Firefox / WebKit / Mobile
**Severity:** P0 / P1 / P2 / P3

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happened]

**Screenshot/Video:**
[Path to test-results]

**Error Message:**
```
[Error from console]
```

**Notes:**
[Any additional context]
```

---

## Reporting & Metrics

### Test Results Dashboard
```bash
# Generate HTML report
npx playwright show-report

# View at: http://localhost:9323
```

### Key Metrics to Track

1. **Pass Rate:** Target 95%+
   ```
   Pass Rate = (Passed Tests / Total Tests) × 100
   ```

2. **Test Duration:** Track performance
   ```
   Target: < 5 minutes for critical path
   Target: < 45 minutes for full suite (single browser)
   ```

3. **Flakiness Rate:** Track unreliable tests
   ```
   Flaky Test = Test that fails/passes inconsistently
   Target: < 2% flakiness
   ```

4. **Coverage by Feature:**
   - Authentication: 47 tests ✓
   - Maintenance: 29 tests ✓
   - Property: 3 tests (needs expansion)
   - Vendor: 15 tests ✓
   - UI: 16 tests ✓

### Daily Test Summary Template
```markdown
# Test Run Summary - [Date]

## Overview
- **Total Tests:** 160
- **Passed:** X
- **Failed:** X
- **Skipped:** X
- **Duration:** X minutes

## Pass Rate by Category
- Authentication: X%
- Maintenance: X%
- Property: X%
- Uploads: X%
- Real-time: X%

## Critical Issues (P0/P1)
1. [Issue description]
2. [Issue description]

## Browser Compatibility
- Chrome: ✅ / ⚠️ / ❌
- Firefox: ✅ / ⚠️ / ❌
- Safari: ✅ / ⚠️ / ❌
- Mobile Chrome: ✅ / ⚠️ / ❌
- Mobile Safari: ✅ / ⚠️ / ❌

## Recommendations
- [Action items]
```

---

## Debugging Guide

### Common Issues & Solutions

#### Issue: Tests timing out
**Solution:**
```bash
# Increase timeout in playwright.config.ts
use: {
  timeout: 60000, // 60 seconds per test
}
```

#### Issue: App not loading
**Solution:**
```bash
# Check app is running
curl http://localhost:8082

# Restart app
pkill -f "expo start"
npm run web
```

#### Issue: Authentication failures
**Solution:**
```bash
# Verify test user exists in Supabase
# Check .env.test credentials match
# Clear browser storage: await authHelper.clearAuthState()
```

#### Issue: Database cleanup needed
**Solution:**
```bash
# Run database helper cleanup
# Add to test: await databaseHelper.cleanupTestData()
```

#### Issue: Flaky tests
**Solution:**
```bash
# Add explicit waits
await page.waitForLoadState('networkidle');
await page.waitForSelector('selector', { state: 'visible' });

# Retry failed tests
npx playwright test --retries=2
```

---

## CI/CD Integration

### GitHub Actions Workflow
```yaml
name: E2E Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run web &
      - run: npx wait-on http://localhost:8082
      - run: npx playwright test --project=chromium
        env:
          EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.CLERK_KEY }}
          EXPO_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          EXPO_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_KEY }}
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Test Data Management

### Test Data Strategy

1. **Create Dedicated Test Environment:**
   - Separate Supabase project for testing
   - Separate Supabase project for testing
   - Isolated test data

2. **Test Data Lifecycle:**
   ```bash
   beforeEach: Create fresh test data
   test: Use test data
   afterEach: Cleanup test data
   ```

3. **Fixtures Location:**
   ```
   e2e/fixtures/
   ├── test-photo-1.jpg (1KB)
   ├── test-photo-2.jpg (1KB)
   ├── test-photo-3.jpg (1KB)
   ├── test-audio.mp3 (1KB)
   ├── test-large-file.jpg (15MB - for validation)
   └── test-file.txt (for type validation)
   ```

---

## Performance Benchmarks

### Target Performance Metrics

| Test Suite | Target Duration | Acceptable Duration |
|------------|----------------|---------------------|
| Smoke Test | < 30 seconds | < 60 seconds |
| Auth Tests | < 5 minutes | < 8 minutes |
| Maintenance Tests | < 8 minutes | < 12 minutes |
| Full Suite (1 browser) | < 30 minutes | < 45 minutes |
| Full Suite (all browsers) | < 2 hours | < 3 hours |

### Optimization Tips

1. **Run in Parallel:**
   ```typescript
   // playwright.config.ts
   workers: 4, // Run 4 tests in parallel
   ```

2. **Use Page Object Models:**
   - Already implemented in `e2e/helpers/page-objects.ts`
   - Reduces code duplication
   - Faster test maintenance

3. **Shared Authentication:**
   ```typescript
   // Reuse authentication state across tests
   test.use({ storageState: 'auth.json' });
   ```

---

## Next Steps After Testing

### After Successful Test Run (95%+ pass rate):
1. ✅ Document any skipped tests (OAuth)
2. ✅ Create issues for failed tests
3. ✅ Update test documentation
4. ✅ Commit test results summary
5. ✅ Deploy with confidence

### After Failed Tests:
1. ❌ Triage failures by severity
2. ❌ Fix P0/P1 issues immediately
3. ❌ Create tickets for P2/P3 issues
4. ❌ Re-run tests after fixes
5. ❌ Do NOT deploy until P0/P1 resolved

---

## Appendix

### Quick Reference Commands

```bash
# Install
npm install
npx playwright install

# Setup
cp .env.test.example .env.test
npm run web

# Run Tests
npx playwright test                          # All tests, all browsers
npx playwright test --project=chromium       # Chrome only
npx playwright test e2e/auth                 # Auth tests only
npx playwright test --headed                 # Show browser
npx playwright test --debug                  # Debug mode
npx playwright test --ui                     # UI mode (interactive)

# Reports
npx playwright show-report                   # View HTML report
npx playwright test --reporter=list          # Terminal output

# Debugging
npx playwright codegen http://localhost:8082 # Generate test code
```

### Useful Resources

- [Playwright Documentation](https://playwright.dev)
- [Test Execution Guide](./TEST_EXECUTION_GUIDE.md)
- [E2E Test Suite Report](./E2E_TEST_SUITE_REPORT.md)
- [Project Test Data](./TEST_DATA_OVERVIEW.md)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-14
**Author:** Claude Code
**Status:** Ready for Execution
