# Quick Test Guide - Property Creation Flow

## Running the Complete Test Suite

### 1. Start the App
```bash
# Terminal 1 - Start the web app
npm run web

# Wait for "Metro waiting on exp://localhost:8081"
# and "Logs for your project will appear below. Press Ctrl+C to exit."
```

### 2. Run the Tests
```bash
# Terminal 2 - Run all property creation tests
npm run test:e2e -- property-creation-steps-3-8.spec.ts

# OR run with UI mode
npx playwright test --ui property-creation-steps-3-8.spec.ts
```

## Quick Test Commands

### Run Specific Steps
```bash
# Step 3 - Room Selection
npm run test:e2e -- --grep "Step 3: Room Selection"

# Step 4 - Room Photography
npm run test:e2e -- --grep "Step 4: Room Photography"

# Step 5 - Asset Scanning
npm run test:e2e -- --grep "Step 5: Asset Scanning"

# Step 6 - Asset Details
npm run test:e2e -- --grep "Step 6: Asset Details"

# Step 7 - Asset Photos
npm run test:e2e -- --grep "Step 7: Asset Photos"

# Step 8 - Review & Submit
npm run test:e2e -- --grep "Step 8: Review"

# Complete end-to-end flow
npm run test:e2e -- --grep "Complete Flow"
```

### Debug Mode
```bash
# Run with Playwright Inspector
npm run test:e2e -- --debug property-creation-steps-3-8.spec.ts

# Run headed (see browser)
npm run test:e2e -- --headed property-creation-steps-3-8.spec.ts

# Run with trace
npm run test:e2e -- --trace on property-creation-steps-3-8.spec.ts
```

## Test Results

### Check Screenshots
```bash
# View screenshots in test-results/
ls -la test-results/*.png

# Screenshots are named by test:
# - step3-room-selection.png
# - step4-room-photography.png
# - step5-asset-scanning.png
# - step6-asset-details.png
# - step7-asset-photos.png
# - step8-review-screen.png
# - e2e-step1.png through e2e-step8-final.png
```

### View HTML Report
```bash
# Generate and open HTML report
npx playwright show-report

# Report shows:
# - Pass/fail status for each test
# - Screenshots
# - Console logs
# - Network activity
```

## Expected Results

### All Tests Passing
```
✅ Step 3: Display room selection screen - PASS
✅ Step 3: Select and deselect rooms - PASS
✅ Step 3: Add custom room - PASS
✅ Step 3: Navigate to Step 4 - PASS

✅ Step 4: Display room photography screen - PASS
✅ Step 4: Navigate between rooms - PASS
✅ Step 4: Skip to Step 5 - PASS

✅ Step 5: Display asset scanning screen - PASS
✅ Step 5: Add manual asset - PASS
✅ Step 5: Skip to Step 6 - PASS

✅ Step 6: Display asset details screen - PASS
✅ Step 6: Fill asset details - PASS
✅ Step 6: Continue to Step 7 - PASS

✅ Step 7: Display asset photos screen - PASS
✅ Step 7: Switch between photo types - PASS
✅ Step 7: Continue to Step 8 - PASS

✅ Step 8: Display review screen - PASS
✅ Step 8: Edit navigation - PASS
✅ Step 8: Submit property successfully - PASS

✅ Complete Flow: All 8 steps - PASS

Total: 20 tests - All passing ✅
```

## Troubleshooting

### Test Fails at Step 3
**Issue:** Cannot find "Select Rooms" text
**Fix:**
1. Check app is running: `curl http://localhost:8082`
2. Verify Steps 1-2 complete successfully
3. Check screenshot: `test-results/step3-room-selection.png`

### Test Fails at Step 5
**Issue:** Cannot find asset categories
**Fix:**
1. Test scrolls to find categories
2. May need to increase timeout
3. Check if AssetScanningScreen is rendering

### Test Fails at Step 8
**Issue:** Submit button not found
**Fix:**
1. Check if all previous steps completed
2. Verify property data is valid
3. Check ReviewScreen implementation

### General Issues
```bash
# Clear test results and retry
rm -rf test-results/
npm run test:e2e -- property-creation-steps-3-8.spec.ts

# Check Playwright is installed
npx playwright --version

# Reinstall Playwright if needed
npm install @playwright/test
npx playwright install
```

## Test Data

### Property Created by Tests
- **Name:** "Test Property for Steps 3-8" or "E2E Complete Flow Property"
- **Address:** "123 Test Street" or "456 E2E Street"
- **Type:** House or Apartment
- **Rooms:** Default selection (Living Room, Kitchen, Bathroom, Master Bedroom)
- **Assets:** 1 Appliance ("E2E Test Refrigerator")

### Mock Data
- Tests use mock authentication (EXPO_PUBLIC_AUTH_DISABLED=1)
- No real API calls in test environment
- Data is not persisted to real database

## CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Start app
        run: npm run web &

      - name: Wait for app
        run: npx wait-on http://localhost:8082

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-results/
```

## Performance Benchmarks

### Expected Test Duration
- Step 3 tests: ~15 seconds each
- Step 4 tests: ~20 seconds each
- Step 5 tests: ~25 seconds each
- Step 6 tests: ~30 seconds each
- Step 7 tests: ~35 seconds each
- Step 8 tests: ~40 seconds each
- Complete E2E: ~3 minutes

**Total Suite: ~8 minutes**

## Tips

1. **Run tests in parallel:** Playwright runs tests in parallel by default
2. **Use --headed mode:** See what tests are doing in real-time
3. **Check console logs:** Tests log navigation progress
4. **Review screenshots:** Every test saves a screenshot
5. **Use --trace on:** Captures full trace for debugging

## Next Steps

After tests pass:
1. ✅ Review test coverage
2. ✅ Add additional test cases (error scenarios, photo uploads)
3. ✅ Integrate into CI/CD pipeline
4. ✅ Add performance monitoring
5. ✅ Create visual regression tests

---

**Happy Testing!** 🧪
