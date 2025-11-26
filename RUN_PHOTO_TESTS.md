# Quick Guide: Running Photo Upload Tests

## Prerequisites

1. **Start the development server:**
   ```bash
   npm run web
   ```
   Server should be at: `http://localhost:8082`

2. **Verify environment:**
   - Check `.env.test` has `EXPO_PUBLIC_AUTH_DISABLED=1`
   - Supabase connection configured

## Run Tests

### Option 1: Run All Photo Tests (Recommended First Run)
```bash
npm run test:e2e -- property-creation-flow.spec.ts
```

### Option 2: Run Photo Upload Suite Only
```bash
npm run test:e2e -- property-creation-flow.spec.ts -g "Photo Upload & Management"
```

### Option 3: Run Complete Flow Test
```bash
npm run test:e2e -- property-creation-flow.spec.ts -g "Complete End-to-End"
```

### Option 4: Run Single Test
```bash
# Photo upload test
npm run test:e2e -- property-creation-flow.spec.ts -g "Add single photo"

# Photo management test
npm run test:e2e -- property-creation-flow.spec.ts -g "Upload multiple photos and remove"

# Photo limit test
npm run test:e2e -- property-creation-flow.spec.ts -g "max photo limit"

# Complete flow
npm run test:e2e -- property-creation-flow.spec.ts -g "Complete Flow"
```

### Option 5: Interactive UI Mode
```bash
npm run test:e2e -- --ui property-creation-flow.spec.ts
```

### Option 6: Debug Mode (Step-by-Step)
```bash
npm run test:e2e -- property-creation-flow.spec.ts --debug
```

## What to Expect

### Test 1: Photo Upload - Add single photo
**Duration:** ~60-90 seconds
**Actions:**
1. Creates new property
2. Fills property basics
3. Navigates to Property Photos screen
4. Clicks "Add Photos" button
5. Uploads test JPEG image
6. Verifies photo appears in grid

**Success:** Photo count shows "1 of 5 photos"

### Test 2: Photo Management - Upload and remove
**Duration:** ~60-90 seconds
**Actions:**
1. Creates new property
2. Navigates to photos screen
3. Uploads photo
4. Clicks delete button on photo
5. Confirms deletion
6. Verifies photo removed

**Success:** Photo removed from grid

### Test 3: Photo Validation - Max limit
**Duration:** ~45-60 seconds
**Actions:**
1. Creates new property
2. Navigates to photos screen
3. Checks for "of 5 photos" indicator

**Success:** Photo limit indicator visible

### Test 4: Complete Flow - Full 8-step workflow
**Duration:** ~120 seconds (2 minutes)
**Actions:**
1. Step 1: Property Basics
2. Step 2: Property Photos (skip)
3. Step 3: Room Selection
4. Steps 4-8: Navigate through remaining screens
5. Verify completion

**Success:** Completes all 8 steps

## View Results

### Screenshots
After tests run, check:
```bash
ls test-results/
```

Files created:
- `photo-upload-single.png`
- `photo-upload-final.png`
- `photo-management-after-delete.png`
- `photo-limit-test.png`
- `complete-flow-step1.png` through `step8.png`
- `complete-flow-final.png`

### Test Report
HTML report auto-opens after test run.

Or manually open:
```bash
npx playwright show-report
```

## Common Issues

### Issue: App not running
**Error:** `App is not running at http://localhost:8082`

**Fix:**
```bash
# Terminal 1: Start app
npm run web

# Terminal 2: Run tests
npm run test:e2e -- property-creation-flow.spec.ts
```

### Issue: Tests can't find elements
**Error:** `Timeout waiting for locator`

**Fix:**
- Check app is fully loaded
- Verify selectors match current UI
- Use `--debug` mode to inspect

### Issue: Photo upload not working
**Error:** `File input not found`

**Fix:**
- Check React Native Web file input implementation
- May need to update test selectors
- File inputs might be hidden/programmatic

### Issue: Tests timeout
**Error:** `Test timeout of 90000ms exceeded`

**Fix:**
- Network might be slow
- Increase timeout in test
- Check for hanging async operations

## Debugging

### Enable Verbose Logging
```bash
DEBUG=pw:api npm run test:e2e -- property-creation-flow.spec.ts
```

### Run Headed (See Browser)
```bash
npm run test:e2e -- property-creation-flow.spec.ts --headed
```

### Slow Motion (For Observation)
```bash
npm run test:e2e -- property-creation-flow.spec.ts --headed --slow-mo=1000
```

### Trace Recording
```bash
npm run test:e2e -- property-creation-flow.spec.ts --trace on
```

Then view trace:
```bash
npx playwright show-trace trace.zip
```

## Test Coverage

### PropertyPhotosScreen
- ✅ Add Photos button
- ✅ Photo selection dialog
- ✅ File upload
- ✅ Photo processing
- ✅ Photo grid display
- ✅ Photo count
- ✅ Photo deletion
- ✅ Max photo limit
- ✅ Skip button

### RoomSelectionScreen
- ✅ Room display
- ✅ Room selection
- ✅ Room count
- ✅ Navigation

### Complete Flow
- ✅ All 8 steps
- ✅ Step navigation
- ✅ Auto-save
- ✅ Data persistence

## Next Steps After Running

1. **Review Screenshots**
   - Check UI renders correctly
   - Verify photos display properly
   - Confirm all steps visible

2. **Check Console Output**
   - Look for errors
   - Verify test progression
   - Note any warnings

3. **Fix Failures**
   - Update selectors if needed
   - Adjust timeouts
   - Handle React Native Web specifics

4. **Add to CI/CD**
   - Include in GitHub Actions
   - Run on every PR
   - Generate test reports

## Documentation

- **Full Test Documentation:** `/Users/dougsimpson/Projects/MyAILandlord/e2e/PHOTO_ASSET_TESTS.md`
- **Summary:** `/Users/dougsimpson/Projects/MyAILandlord/PHOTO_ASSET_TESTS_SUMMARY.md`
- **This Guide:** `/Users/dougsimpson/Projects/MyAILandlord/RUN_PHOTO_TESTS.md`

## Quick Command Reference

```bash
# Start app (Terminal 1)
npm run web

# Run all photo tests (Terminal 2)
npm run test:e2e -- property-creation-flow.spec.ts

# Run with UI
npm run test:e2e -- --ui property-creation-flow.spec.ts

# Debug mode
npm run test:e2e -- property-creation-flow.spec.ts --debug

# View report
npx playwright show-report

# View screenshots
open test-results/
```

## Success Indicators

✅ All tests pass (green checkmarks)
✅ Screenshots generated
✅ HTML report shows 100% pass rate
✅ No console errors
✅ Tests complete in < 2 minutes total

## Help

If tests fail or you need help:
1. Check console output
2. Review screenshots
3. Use debug mode
4. Check documentation
5. Verify app is running correctly
