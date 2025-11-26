# Property Creation Flow E2E Tests

Comprehensive Playwright end-to-end tests for the MyAILandlord property creation workflow.

## Test File

- **Location**: `/e2e/property-creation-flow.spec.ts`
- **Framework**: Playwright
- **Environment**: React Native Web with mock auth (`EXPO_PUBLIC_AUTH_DISABLED=1`)

## Overview

These tests validate the complete 8-step property creation flow:
1. **Property Basics** - Name, address, type, bedrooms, bathrooms
2. **Property Photos** - Photo upload and management
3. **Room Selection** - Select areas/rooms in property
4. **Room Photography** - Photos for each room
5. **Asset Scanning** - Identify assets in rooms
6. **Asset Details** - Details for each asset
7. **Asset Photos** - Photos of assets
8. **Review & Submit** - Final review and submission

## Test Scenarios

### Complete Workflow Tests

#### 1. Happy Path (64:7)
Tests the complete property creation from start to finish with all required fields.

**What it tests:**
- Navigation to Add Property screen
- Filling all required fields (name, address, property type)
- Property type selection (Apartment)
- Bedrooms/bathrooms display
- Auto-save functionality
- Draft ID generation in URL
- Navigation through all 8 steps
- Successful completion

**Expected result:** Property is created and flow completes successfully

#### 2. Draft Auto-Save (207:7)
Tests that property data automatically saves as drafts during form filling.

**What it tests:**
- Partial data entry (property name and address line 1)
- Auto-save trigger after 2 seconds
- Draft ID creation in URL
- Draft appears in property management screen
- Draft visibility in drafts section

**Expected result:** Draft is created and visible in drafts list

#### 3. Draft Resume (266:7)
Tests clicking on a draft to resume editing from the correct step.

**What it tests:**
- Create a complete draft with all basic info
- Navigate back to properties page
- Find draft in list
- Click draft to resume
- Data persists when resuming
- Correct form data loaded

**Expected result:** Draft resumes with all data intact

#### 4. Page Refresh Persistence - Step 1 (330:7)
Tests that Step 1 (Property Basics) maintains data after page refresh.

**What it tests:**
- Fill property data
- Wait for auto-save
- Draft ID in URL
- Page refresh
- Data still present after refresh
- URL still contains draftId

**Expected result:** All form data persists after refresh

#### 5. Page Refresh Persistence - Step 2 (387:7)
Tests that Step 2 maintains state after page refresh.

**What it tests:**
- Complete Step 1 and navigate to Step 2
- Verify on correct screen
- Page refresh at Step 2
- Still on same screen after refresh
- draftId persists in URL

**Expected result:** Screen and state persist after refresh

#### 6. Form Validation (451:7)
Tests that missing required fields show appropriate errors.

**What it tests:**
- Try to continue with empty form
- Check if Continue button is disabled
- Look for validation messages
- Fill partial data (incomplete)
- Validation still blocks progress

**Expected result:** Form validation prevents incomplete submissions

#### 7. Navigation Flow (502:7)
Tests that browser back button maintains draft state.

**What it tests:**
- Fill property data
- Navigate to Step 2
- Use browser back button
- Verify returned to Step 1
- All data still present

**Expected result:** Data intact after navigation back

### Edge Case Tests

#### 8. Multiple Drafts (563:7)
Tests creating and managing multiple property drafts simultaneously.

**What it tests:**
- Create first draft
- Navigate away
- Create second draft
- Both drafts visible in list

**Expected result:** Multiple drafts can coexist and are displayed

#### 9. Special Characters (619:7)
Tests handling of special characters in property names and addresses.

**What it tests:**
- Property name with: apostrophes, ampersands, hashtags
- Address with: apostrophes, periods
- City with: special characters (São Paulo)
- Auto-save with special characters
- Data retrieval maintains special characters

**Expected result:** Special characters handled correctly

#### 10. Long Form Data (655:7)
Tests very long strings in property names and addresses.

**What it tests:**
- Very long property name (100+ characters)
- Very long address line (100+ characters)
- Auto-save with long data
- Data retrieval of long strings

**Expected result:** Long strings handled without truncation

## Running the Tests

### Run All Property Creation Tests
```bash
npx playwright test property-creation-flow.spec.ts
```

### Run Specific Test
```bash
npx playwright test property-creation-flow.spec.ts -g "Happy Path"
```

### Run in Specific Browser
```bash
npx playwright test property-creation-flow.spec.ts --project=chromium
npx playwright test property-creation-flow.spec.ts --project=firefox
npx playwright test property-creation-flow.spec.ts --project=webkit
```

### Run with UI Mode (Interactive)
```bash
npx playwright test property-creation-flow.spec.ts --ui
```

### Run in Debug Mode
```bash
npx playwright test property-creation-flow.spec.ts --debug
```

### Generate HTML Report
```bash
npx playwright test property-creation-flow.spec.ts --reporter=html
npx playwright show-report
```

## Test Configuration

### Timeouts
- Default test timeout: 60 seconds
- Happy Path test: 90 seconds (longer flow)
- Page wait timeout: 10 seconds for elements
- Auto-save wait: 2.5 seconds (2s delay + buffer)

### Base URL
- `http://localhost:8082`
- Configured in `playwright.config.ts`

### Screenshots
All tests generate screenshots in `test-results/` directory:
- `property-creation-step1-filled.png` - Completed Step 1
- `property-creation-step2.png` - Step 2 screen
- `property-creation-complete.png` - Final screen
- `property-creation-draft-in-list.png` - Draft visible in list
- `property-creation-draft-resumed.png` - Resumed draft screen
- `property-creation-refresh-step1.png` - After Step 1 refresh
- `property-creation-refresh-step2.png` - After Step 2 refresh
- `property-creation-validation-errors.png` - Validation errors
- `property-creation-navigation-back.png` - After back navigation
- `property-creation-multiple-drafts.png` - Multiple drafts
- `property-creation-special-chars.png` - Special characters test
- `property-creation-long-data.png` - Long data test

## Helper Functions

### `waitForAutoSave(page, timeout)`
Waits for the auto-save delay (2000ms) plus buffer.

### `checkSaveStatus(page)`
Checks if save indicators are visible (Saving/Saved).

### `getDraftIdFromUrl(url)`
Extracts the draftId parameter from URL.

## Key Test Patterns

### Address Form Fields
The tests use specific IDs for address fields:
- `#section-property-line1` - Street address
- `#section-property-line2` - Unit/Apt
- `#section-property-city` - City
- `#section-property-state` - State
- `#section-property-zip` - ZIP code

### Property Type Selection
Property types are selected by clicking text:
- "Apartment"
- "House"
- "Condo"
- "Townhouse"

### Navigation Buttons
Tests look for flexible button text:
- Continue/Skip/Next - For progressing
- Submit/Finish/Complete - For final submission

## Debugging Tests

### View Browser Console
Tests capture and log browser console errors and warnings:
```typescript
page.on('console', msg => {
  const type = msg.type();
  if (type === 'error' || type === 'warning') {
    console.log(`[Browser ${type}]:`, msg.text());
  }
});
```

### View Page Errors
Page errors are also captured:
```typescript
page.on('pageerror', error => {
  console.log('[Page Error]:', error.message);
});
```

### Check Screenshots
Every test generates screenshots at key points. Check `test-results/` folder.

### Use Trace Viewer
If test fails, use trace viewer:
```bash
npx playwright show-trace test-results/.../trace.zip
```

## Known Issues

### Draft Visibility
Some tests note that drafts may not be immediately visible and may require expanding the drafts section. This is expected behavior as drafts can be collapsed.

### PropertyAreas vs PropertyPhotos
The flow currently goes to PropertyAreas after Property Basics, not PropertyPhotos. Tests are flexible to handle either flow.

### React Native Web Warnings
You may see warnings about:
- `shadow*` style props deprecated (use boxShadow)
- `props.pointerEvents` deprecated
- Text nodes in View components

These are framework-level warnings and don't affect functionality.

## Test Results Summary

All 10 tests pass successfully:

| Test | Status | Duration |
|------|--------|----------|
| Happy Path | ✓ Pass | ~11.5s |
| Draft Auto-Save | ✓ Pass | ~11.3s |
| Draft Resume | ✓ Pass | ~10.6s |
| Page Refresh Step 1 | ✓ Pass | ~11.4s |
| Page Refresh Step 2 | ✓ Pass | ~8.3s |
| Form Validation | ✓ Pass | ~6.3s |
| Navigation Flow | ✓ Pass | ~9.4s |
| Multiple Drafts | ✓ Pass | ~12.3s |
| Special Characters | ✓ Pass | ~6.2s |
| Long Form Data | ✓ Pass | ~6.2s |

**Total Suite Duration**: ~26-32 seconds

## Integration with CI/CD

These tests are ready for CI/CD integration:

```yaml
# Example GitHub Actions workflow
- name: Run Property Creation Tests
  run: |
    npm run test:e2e -- property-creation-flow.spec.ts --project=chromium
```

Set environment variables:
```bash
export EXPO_PUBLIC_AUTH_DISABLED=1
export CI=true
```

## Maintenance

### Updating Tests
When property flow changes:
1. Update selectors if UI elements change
2. Update step navigation logic if flow order changes
3. Update timeouts if operations become slower/faster
4. Add new test cases for new features

### Adding New Tests
Follow the existing pattern:
```typescript
test('New test description', async ({ page }) => {
  test.setTimeout(60000);
  console.log('=== Starting New Test ===');

  // Navigate to properties
  await page.goto('/properties');
  await page.waitForLoadState('networkidle');

  // Test logic here

  await page.screenshot({ path: 'test-results/new-test.png', fullPage: true });
  console.log('=== New Test Complete ===');
});
```

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [React Native Web Testing Guide](https://necolas.github.io/react-native-web/docs/testing/)
- [Project Test Strategy](../docs/testing/TESTING_STRATEGY.md)
- [Navigation Guide](../NAVIGATION_GUIDE.md)
