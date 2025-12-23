# GitHub Actions CI/CD Setup Guide

Quick reference for setting up E2E testing in GitHub Actions.

---

## 🚀 **Quick Start**

### 1. Install Playwright Browsers Locally
```bash
npx playwright install chromium firefox webkit
```

### 2. Add GitHub Secrets

Go to **Settings → Secrets and variables → Actions** and add:

```
EXPO_PUBLIC_SUPABASE_URL
  Value: https://zxqhxjuwmkxevhkpqfzf.supabase.co

EXPO_PUBLIC_SUPABASE_ANON_KEY
  Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY
  Value: pk_test_... (if using Clerk)

SUPABASE_SERVICE_ROLE_KEY
  Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (service role)

SUPABASE_DB_PASSWORD
  Value: (database password for cleanup script)
```

### 3. Deploy Edge Function
```bash
# Deploy cleanup function
supabase functions deploy cleanup-test-data

# Test it works
curl -X POST https://zxqhxjuwmkxevhkpqfzf.supabase.co/functions/v1/cleanup-test-data \
  -H "Authorization: Bearer [service-role-key]" \
  -H "Content-Type: application/json" \
  -d '{"email_prefix": "e2e-test", "older_than_days": 7, "dry_run": true}'
```

### 4. Enable Workflow

The workflow file is already committed: `.github/workflows/e2e-tests.yml`

It runs automatically on:
- Push to `main` or `develop`
- Pull requests to `main` or `develop`
- Manual trigger via GitHub UI

---

## 📋 **Workflow Structure**

### Job 1: Chromium Tests (Always Runs)
- Runs on all triggers
- Fast feedback (5-10 minutes)
- Critical path validation

### Job 2: Cross-Browser Tests (Main Branch Only)
- Runs only on push to `main`
- Tests Firefox and WebKit
- Slower but comprehensive

---

## 🔧 **Local Testing**

### Run E2E Tests Locally
```bash
# Start Expo
EXPO_PUBLIC_TOKENIZED_INVITES=true \
EXPO_PUBLIC_TOKEN_ROLLOUT_PERCENT=100 \
npx expo start --web --port 8082

# In another terminal, run tests
TEST_LANDLORD_EMAIL=e2e-test@myailandlord.com \
TEST_LANDLORD_PASSWORD='TestUser123!E2E' \
npx playwright test e2e/flows/landlord-onboarding-tokenized.spec.ts
```

### Run Specific Browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### Debug Mode
```bash
npx playwright test --debug
npx playwright test --headed --slowMo=500
```

---

## 🧹 **Cleanup Test Data**

### Using Edge Function
```bash
# Dry run (see what would be deleted)
curl -X POST https://zxqhxjuwmkxevhkpqfzf.supabase.co/functions/v1/cleanup-test-data \
  -H "Authorization: Bearer [service-role-key]" \
  -H "Content-Type: application/json" \
  -d '{"email_prefix": "e2e-test", "dry_run": true}'

# Cleanup users older than 1 day
curl -X POST https://zxqhxjuwmkxevhkpqfzf.supabase.co/functions/v1/cleanup-test-data \
  -H "Authorization: Bearer [service-role-key]" \
  -H "Content-Type: application/json" \
  -d '{"email_prefix": "e2e-test", "older_than_days": 1}'
```

### Using Staging Script
```bash
# Verify environment
./scripts/ci/staging-setup.sh verify

# Cleanup test data
SUPABASE_URL=https://zxqhxjuwmkxevhkpqfzf.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=[key] \
SUPABASE_DB_PASSWORD=[password] \
./scripts/ci/staging-setup.sh cleanup
```

---

## 📊 **Monitoring CI Runs**

### View Test Results
1. Go to **Actions** tab in GitHub
2. Click on workflow run
3. Click on job (e.g., "E2E Tests (Chromium)")
4. View logs and download artifacts

### Artifacts Available
- **playwright-report**: HTML report with test details
- **test-screenshots**: Screenshots from test run
- **e2e-html-report**: Custom onboarding flow report
- **playwright-traces**: Debug traces (failures only)

### Download Artifacts
```bash
# Using GitHub CLI
gh run download [run-id]

# Or click "Summary" → "Artifacts" in GitHub UI
```

---

## 🐛 **Troubleshooting**

### Test Fails on CI But Passes Locally
- Check Expo server startup (view logs)
- Verify environment variables are set
- Review timeout settings (CI may be slower)
- Download trace from artifacts

### "Metro Bundler Not Running"
- Increase startup timeout in workflow
- Check Expo server logs for errors
- Verify port 8082 is available

### "Element Not Found" Errors
- testID may have changed
- Timing issue (add explicit waits)
- Check screenshots in artifacts

### Cleanup Failures
- Verify service role key is valid
- Check database connection
- Review RLS policies (should not block admin)

---

## ⚙️ **Customization**

### Change Test Timeout
Edit `.github/workflows/e2e-tests.yml`:
```yaml
npx playwright test \
  --timeout=600000  # 10 minutes instead of 5
```

### Add More Browsers
```yaml
strategy:
  matrix:
    browser: [chromium, firefox, webkit, mobile-chrome]
```

### Schedule Nightly Runs
Add to workflow:
```yaml
on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM UTC daily
```

---

## 📝 **Best Practices**

1. **Unique Test Users**: Always use timestamp-prefixed emails
2. **Cleanup After Tests**: Run cleanup in CI `always()` block
3. **Retry Flaky Tests**: Enable retries in `playwright.config.ts`
4. **Cache Dependencies**: Use `actions/cache` for node_modules
5. **Parallel Execution**: Use `--workers=1` to avoid conflicts
6. **Trace on Failure**: Always upload traces for debugging

---

## 🔗 **Useful Links**

- [Playwright Documentation](https://playwright.dev/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Expo CLI Reference](https://docs.expo.dev/workflow/expo-cli/)

---

**Last Updated:** 2025-12-23
**Workflow Version:** v1.0
