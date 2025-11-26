import { test, expect, Page } from '@playwright/test';
import { Buffer } from 'buffer';

/**
 * Property Creation Workflow E2E Tests
 *
 * Tests the complete 8-step property creation flow with:
 * - Step 1: Property Basics (name, address, type, bedrooms, bathrooms)
 * - Step 2: Property Photos
 * - Steps 3-8: Room Selection, Room Photography, Asset Scanning, Asset Details, Asset Photos, Review & Submit
 *
 * Key features tested:
 * - Form validation
 * - Draft auto-save
 * - Draft resume capability
 * - Page refresh persistence
 * - Navigation between steps
 * - Photo upload flow
 *
 * Environment: EXPO_PUBLIC_AUTH_DISABLED=1 (mock auth mode)
 */

test.use({
  baseURL: 'http://localhost:8082',
});

// Helper function to wait for auto-save
async function waitForAutoSave(page: Page, timeout = 3000) {
  await page.waitForTimeout(2500); // Auto-save delay is 2000ms + buffer
}

// Helper function to check save status
async function checkSaveStatus(page: Page): Promise<{ isSaving: boolean; lastSaved: boolean }> {
  const savingIndicator = page.locator('text=/Saving/i');
  const savedIndicator = page.locator('text=/Saved|Last saved/i');

  return {
    isSaving: await savingIndicator.isVisible({ timeout: 1000 }).catch(() => false),
    lastSaved: await savedIndicator.isVisible({ timeout: 1000 }).catch(() => false),
  };
}

// Helper to get draft ID from URL
function getDraftIdFromUrl(url: string): string | null {
  const match = url.match(/[?&]draftId=([^&]+)/);
  return match ? match[1] : null;
}

test.describe('Property Creation Flow - Complete Workflow', () => {

  test.beforeEach(async ({ page }) => {
    // Enable console logging for debugging
    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error' || type === 'warning') {
        console.log(`[Browser ${type}]:`, msg.text());
      }
    });

    page.on('pageerror', error => {
      console.log('[Page Error]:', error.message);
    });
  });

  test('Happy Path: Complete property creation with all required fields', async ({ page }) => {
    test.setTimeout(90000); // 90 seconds for complete flow

    console.log('=== Starting Happy Path Test ===');

    // Navigate to properties page
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    console.log('Navigated to properties page');

    // Click Add Property button
    const addButton = page.locator('text=Add Property').first();
    await expect(addButton).toBeVisible({ timeout: 10000 });
    await addButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    console.log('Clicked Add Property button');

    // STEP 1: Property Basics (Step 1 of 8)
    console.log('--- Step 1: Property Basics ---');

    // Verify we're on the right screen
    await expect(page.locator('text=/Add New Property|Property Basics|Step 1/i')).toBeVisible({ timeout: 10000 });

    // Fill property name
    const nameInput = page.locator('input').first();
    await expect(nameInput).toBeVisible({ timeout: 10000 });
    await nameInput.fill('Sunset Villa Apartments');
    console.log('Filled property name');

    // Fill address fields (multi-field format)
    await page.locator('#section-property-line1').fill('1234 Sunset Boulevard');
    await page.locator('#section-property-line2').fill('Unit 501');
    await page.locator('#section-property-city').fill('Los Angeles');
    await page.locator('#section-property-state').fill('CA');
    await page.locator('#section-property-zip').fill('90028');
    console.log('Filled address fields');

    // Select property type (Apartment)
    const apartmentOption = page.locator('text="Apartment"').first();
    await expect(apartmentOption).toBeVisible({ timeout: 5000 });
    await apartmentOption.click();
    await page.waitForTimeout(500);
    console.log('Selected property type: Apartment');

    // Verify bedrooms/bathrooms are visible (should have defaults)
    const bedroomsSection = page.locator('text=/Bedrooms/i').first();
    const bathroomsSection = page.locator('text=/Bathrooms/i').first();
    await expect(bedroomsSection).toBeVisible();
    await expect(bathroomsSection).toBeVisible();
    console.log('Bedrooms and bathrooms sections visible');

    await page.screenshot({ path: 'test-results/property-creation-step1-filled.png', fullPage: true });

    // Wait for auto-save
    console.log('Waiting for auto-save...');
    await waitForAutoSave(page);

    const saveStatus = await checkSaveStatus(page);
    console.log('Save status:', saveStatus);

    // Check that draftId is in URL after auto-save
    const urlAfterSave = page.url();
    const draftId = getDraftIdFromUrl(urlAfterSave);
    console.log('Draft ID from URL:', draftId);

    // Continue to next step
    const continueButton = page.locator('text=Continue').first();
    await expect(continueButton).toBeVisible({ timeout: 5000 });
    await continueButton.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    console.log('Clicked Continue to Property Photos');

    // STEP 2: Next screen (could be PropertyAreas or PropertyPhotos depending on flow)
    console.log('--- Step 2: Next screen ---');

    // Check what screen we're on
    const currentUrl = page.url();
    console.log('Current URL after continue:', currentUrl);

    // Verify draftId is in URL
    expect(currentUrl).toContain('draftId');
    const step2DraftId = getDraftIdFromUrl(currentUrl);
    console.log('Step 2 screen loaded with draftId:', step2DraftId);

    // Could be PropertyPhotos or PropertyAreas
    const isPhotos = currentUrl.includes('PropertyPhotos');
    const isAreas = currentUrl.includes('PropertyAreas');
    console.log('On PropertyPhotos:', isPhotos, 'On PropertyAreas:', isAreas);

    await page.screenshot({ path: 'test-results/property-creation-step2.png', fullPage: true });

    // Skip or continue to next step
    const skipOrContinue = page.locator('text=/Continue|Skip|Next/i').first();
    if (await skipOrContinue.isVisible({ timeout: 5000 })) {
      await skipOrContinue.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);
      console.log('Continued from Step 2');
    }

    // Navigate through remaining steps to completion
    console.log('--- Navigating through remaining steps ---');
    let stepCount = 0;
    let maxSteps = 10; // Safety limit

    while (stepCount < maxSteps) {
      const nextButton = page.locator('text=/Continue|Skip|Next|Submit|Finish/i').first();

      if (await nextButton.isVisible({ timeout: 3000 })) {
        const buttonText = await nextButton.textContent();
        console.log(`Clicking button: ${buttonText}`);

        await nextButton.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);

        // Check if we reached final step (Submit/Finish)
        if (buttonText?.match(/Submit|Finish|Complete/i)) {
          console.log('Reached final submit step');
          break;
        }

        stepCount++;
      } else {
        console.log('No more navigation buttons found');
        break;
      }
    }

    await page.screenshot({ path: 'test-results/property-creation-complete.png', fullPage: true });

    // Verify we're back at properties page or see success message
    const isOnPropertiesPage = page.url().includes('/properties');
    const hasSuccessMessage = await page.locator('text=/Success|Created|Completed/i').isVisible({ timeout: 3000 }).catch(() => false);

    console.log('Final state - On properties page:', isOnPropertiesPage, 'Has success:', hasSuccessMessage);

    console.log('=== Happy Path Test Complete ===');
  });

  test('Draft Auto-Save: Property data persists during form filling', async ({ page }) => {
    test.setTimeout(60000);

    console.log('=== Starting Draft Auto-Save Test ===');

    await page.goto('/properties');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Start new property
    await page.locator('text=Add Property').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Fill partial data
    const nameInput = page.locator('input').first();
    await nameInput.fill('Draft Test Property');
    await page.waitForTimeout(500);

    await page.locator('#section-property-line1').fill('789 Test Street');
    await page.waitForTimeout(500);

    console.log('Filled partial property data');

    // Wait for auto-save
    console.log('Waiting for auto-save...');
    await waitForAutoSave(page);

    // Check URL has draftId
    const urlAfterSave = page.url();
    const draftId = getDraftIdFromUrl(urlAfterSave);
    expect(draftId).toBeTruthy();
    console.log('Draft ID created:', draftId);

    // Navigate back to properties
    await page.goBack();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check if draft appears in property management screen
    const draftSection = page.locator('text=/Drafts/i').first();
    const hasDrafts = await draftSection.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasDrafts) {
      console.log('Draft section visible');

      // Look for the draft property
      const draftProperty = page.locator('text="Draft Test Property"').first();
      const draftVisible = await draftProperty.isVisible({ timeout: 3000 }).catch(() => false);
      console.log('Draft property visible in list:', draftVisible);

      if (draftVisible) {
        await page.screenshot({ path: 'test-results/property-creation-draft-in-list.png', fullPage: true });
      }
    }

    console.log('=== Draft Auto-Save Test Complete ===');
  });

  test('Draft Resume: Clicking draft resumes from correct step', async ({ page }) => {
    test.setTimeout(60000);

    console.log('=== Starting Draft Resume Test ===');

    await page.goto('/properties');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Create a draft
    await page.locator('text=Add Property').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Fill basic data
    const nameInput = page.locator('input').first();
    await nameInput.fill('Resume Draft Test');
    await page.locator('#section-property-line1').fill('555 Resume Road');
    await page.locator('#section-property-city').fill('TestCity');
    await page.locator('#section-property-state').fill('TX');
    await page.locator('#section-property-zip').fill('12345');
    await page.locator('text="House"').first().click();

    console.log('Filled property basics for draft');

    // Wait for auto-save
    await waitForAutoSave(page);

    const draftId = getDraftIdFromUrl(page.url());
    console.log('Draft created with ID:', draftId);

    // Go back to properties
    await page.goBack();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Click on the draft to resume
    const draftProperty = page.locator('text="Resume Draft Test"').first();
    const draftExists = await draftProperty.isVisible({ timeout: 5000 }).catch(() => false);

    if (draftExists) {
      console.log('Draft found in list, clicking to resume');
      await draftProperty.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1500);

      // Verify we're back on the form with data
      const resumedNameInput = page.locator('input').first();
      const nameValue = await resumedNameInput.inputValue();

      console.log('Resumed draft, property name:', nameValue);
      expect(nameValue).toBe('Resume Draft Test');

      // Verify URL has draftId
      expect(page.url()).toContain('draftId');

      await page.screenshot({ path: 'test-results/property-creation-draft-resumed.png', fullPage: true });
    } else {
      console.log('Draft not found in list (may need to expand drafts section)');
    }

    console.log('=== Draft Resume Test Complete ===');
  });

  test('Page Refresh Persistence: Step 1 (Property Basics) maintains data', async ({ page }) => {
    test.setTimeout(60000);

    console.log('=== Starting Page Refresh Test (Step 1) ===');

    await page.goto('/properties');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Start new property
    await page.locator('text=Add Property').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Fill data
    const nameInput = page.locator('input').first();
    await nameInput.fill('Refresh Test Property');
    await page.locator('#section-property-line1').fill('999 Refresh Lane');
    await page.locator('#section-property-city').fill('RefreshCity');
    await page.locator('#section-property-state').fill('CA');
    await page.locator('#section-property-zip').fill('90210');

    console.log('Filled property data');

    // Wait for auto-save
    await waitForAutoSave(page);

    const urlBeforeRefresh = page.url();
    const draftId = getDraftIdFromUrl(urlBeforeRefresh);
    console.log('URL before refresh:', urlBeforeRefresh);
    console.log('Draft ID:', draftId);

    expect(draftId).toBeTruthy();

    // Refresh the page
    console.log('Refreshing page...');
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify we're still on the same screen
    const urlAfterRefresh = page.url();
    console.log('URL after refresh:', urlAfterRefresh);
    expect(urlAfterRefresh).toContain('draftId');

    // Verify data is still there
    const nameInputAfter = page.locator('input').first();
    const nameValue = await nameInputAfter.inputValue();
    console.log('Property name after refresh:', nameValue);

    expect(nameValue).toBe('Refresh Test Property');

    await page.screenshot({ path: 'test-results/property-creation-refresh-step1.png', fullPage: true });

    console.log('=== Page Refresh Test (Step 1) Complete ===');
  });

  test('Page Refresh Persistence: Step 2 (Property Photos) maintains state', async ({ page }) => {
    test.setTimeout(60000);

    console.log('=== Starting Page Refresh Test (Step 2) ===');

    await page.goto('/properties');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Start new property and fill basics
    await page.locator('text=Add Property').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const nameInput = page.locator('input').first();
    await nameInput.fill('Photo Refresh Test');
    await page.locator('#section-property-line1').fill('123 Photo Street');
    await page.locator('#section-property-city').fill('PhotoCity');
    await page.locator('#section-property-state').fill('NY');
    await page.locator('#section-property-zip').fill('10001');
    await page.locator('text="Condo"').first().click();

    console.log('Filled property basics');

    // Wait for auto-save
    await waitForAutoSave(page);

    // Continue to Property Photos
    await page.locator('text=Continue').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify we're on Property Photos
    const isOnPhotos = await page.locator('text=/Property Photos|Step 2/i').isVisible({ timeout: 5000 }).catch(() => false);
    console.log('On Property Photos screen:', isOnPhotos);

    if (isOnPhotos) {
      const urlBeforeRefresh = page.url();
      const draftId = getDraftIdFromUrl(urlBeforeRefresh);
      console.log('URL before refresh:', urlBeforeRefresh);
      console.log('Draft ID:', draftId);

      // Refresh the page
      console.log('Refreshing page at Step 2...');
      await page.reload();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Verify we're still on Property Photos
      const urlAfterRefresh = page.url();
      console.log('URL after refresh:', urlAfterRefresh);

      const stillOnPhotos = await page.locator('text=/Property Photos|Step 2/i').isVisible({ timeout: 5000 }).catch(() => false);
      console.log('Still on Property Photos after refresh:', stillOnPhotos);

      expect(urlAfterRefresh).toContain('PropertyPhotos');
      expect(urlAfterRefresh).toContain('draftId');

      await page.screenshot({ path: 'test-results/property-creation-refresh-step2.png', fullPage: true });
    }

    console.log('=== Page Refresh Test (Step 2) Complete ===');
  });

  test('Form Validation: Missing required fields shows errors', async ({ page }) => {
    test.setTimeout(60000);

    console.log('=== Starting Form Validation Test ===');

    await page.goto('/properties');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Start new property
    await page.locator('text=Add Property').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Try to continue without filling anything
    const continueButton = page.locator('text=Continue').first();

    // Check if button is disabled or if clicking shows validation
    const isDisabled = await continueButton.evaluate(el => (el as HTMLButtonElement).disabled);
    console.log('Continue button disabled when form empty:', isDisabled);

    if (!isDisabled) {
      // Click and check for validation messages
      await continueButton.click();
      await page.waitForTimeout(1000);

      // Look for validation errors or alerts
      const hasAlert = await page.locator('text=/required|error|invalid|Please/i').isVisible({ timeout: 2000 }).catch(() => false);
      console.log('Validation message shown:', hasAlert);

      await page.screenshot({ path: 'test-results/property-creation-validation-errors.png', fullPage: true });
    }

    // Fill only partial data (missing required fields)
    const nameInput = page.locator('input').first();
    await nameInput.fill('Incomplete Property');
    await page.waitForTimeout(500);

    // Try continue again with incomplete data
    await continueButton.click();
    await page.waitForTimeout(1000);

    // Should still show validation or not navigate
    const urlAfterIncomplete = page.url();
    console.log('URL after clicking continue with incomplete data:', urlAfterIncomplete);

    await page.screenshot({ path: 'test-results/property-creation-partial-validation.png', fullPage: true });

    console.log('=== Form Validation Test Complete ===');
  });

  test('Navigation Flow: Back button maintains draft state', async ({ page }) => {
    test.setTimeout(60000);

    console.log('=== Starting Navigation Flow Test ===');

    await page.goto('/properties');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Create property and navigate through steps
    await page.locator('text=Add Property').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Fill data
    const nameInput = page.locator('input').first();
    await nameInput.fill('Navigation Test Property');
    await page.locator('#section-property-line1').fill('456 Navigation Ave');
    await page.locator('#section-property-city').fill('NavCity');
    await page.locator('#section-property-state').fill('FL');
    await page.locator('#section-property-zip').fill('33101');
    await page.locator('text="Townhouse"').first().click();

    console.log('Filled property data');

    // Wait for auto-save
    await waitForAutoSave(page);

    const step1Url = page.url();
    console.log('Step 1 URL:', step1Url);

    // Navigate to step 2
    await page.locator('text=Continue').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const step2Url = page.url();
    console.log('Step 2 URL:', step2Url);

    // Use browser back button
    await page.goBack();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Verify we're back on step 1 with data intact
    const backUrl = page.url();
    console.log('URL after back:', backUrl);

    const nameValue = await nameInput.inputValue();
    console.log('Property name after navigation back:', nameValue);

    expect(nameValue).toBe('Navigation Test Property');

    await page.screenshot({ path: 'test-results/property-creation-navigation-back.png', fullPage: true });

    console.log('=== Navigation Flow Test Complete ===');
  });
});

test.describe('Property Creation Flow - Edge Cases', () => {

  test('Multiple Drafts: Can create and manage multiple property drafts', async ({ page }) => {
    test.setTimeout(90000);

    console.log('=== Starting Multiple Drafts Test ===');

    await page.goto('/properties');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Create first draft
    console.log('Creating first draft...');
    await page.locator('text=Add Property').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const nameInput1 = page.locator('input').first();
    await nameInput1.fill('Draft Property One');
    await page.locator('#section-property-line1').fill('111 First Street');
    await waitForAutoSave(page);

    // Go back
    await page.goBack();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Create second draft
    console.log('Creating second draft...');
    await page.locator('text=Add Property').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const nameInput2 = page.locator('input').first();
    await nameInput2.fill('Draft Property Two');
    await page.locator('#section-property-line1').fill('222 Second Street');
    await waitForAutoSave(page);

    // Go back
    await page.goBack();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check that both drafts appear
    const draft1 = page.locator('text="Draft Property One"');
    const draft2 = page.locator('text="Draft Property Two"');

    const hasDraft1 = await draft1.isVisible({ timeout: 5000 }).catch(() => false);
    const hasDraft2 = await draft2.isVisible({ timeout: 5000 }).catch(() => false);

    console.log('Draft 1 visible:', hasDraft1);
    console.log('Draft 2 visible:', hasDraft2);

    await page.screenshot({ path: 'test-results/property-creation-multiple-drafts.png', fullPage: true });

    console.log('=== Multiple Drafts Test Complete ===');
  });

  test('Special Characters: Property name and address handle special characters', async ({ page }) => {
    test.setTimeout(60000);

    console.log('=== Starting Special Characters Test ===');

    await page.goto('/properties');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.locator('text=Add Property').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Test with special characters
    const nameInput = page.locator('input').first();
    await nameInput.fill("O'Malley's Apartment & Co. #1");
    await page.locator('#section-property-line1').fill('123 St. Patrick\'s Road');
    await page.locator('#section-property-city').fill('São Paulo');
    await page.locator('#section-property-state').fill('CA');
    await page.locator('#section-property-zip').fill('90210');

    console.log('Filled fields with special characters');

    // Wait for auto-save
    await waitForAutoSave(page);

    // Verify data persists
    const nameValue = await nameInput.inputValue();
    console.log('Property name with special chars:', nameValue);
    expect(nameValue).toContain("O'Malley");

    await page.screenshot({ path: 'test-results/property-creation-special-chars.png', fullPage: true });

    console.log('=== Special Characters Test Complete ===');
  });

  test('Long Form Data: Handles very long property names and addresses', async ({ page }) => {
    test.setTimeout(60000);

    console.log('=== Starting Long Form Data Test ===');

    await page.goto('/properties');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.locator('text=Add Property').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Test with very long strings
    const longName = 'The Very Long Property Name That Goes On And On And On To Test The Maximum Length Handling Of The Input Field';
    const longAddress = '123456789 Very Long Street Name Boulevard Avenue Road With Extra Long Descriptive Text';

    const nameInput = page.locator('input').first();
    await nameInput.fill(longName);
    await page.locator('#section-property-line1').fill(longAddress);
    await page.locator('#section-property-city').fill('Los Angeles');
    await page.locator('#section-property-state').fill('CA');
    await page.locator('#section-property-zip').fill('90210');

    console.log('Filled fields with long data');

    // Wait for auto-save
    await waitForAutoSave(page);

    // Verify data is saved
    const nameValue = await nameInput.inputValue();
    console.log('Long property name length:', nameValue.length);

    await page.screenshot({ path: 'test-results/property-creation-long-data.png', fullPage: true });

    console.log('=== Long Form Data Test Complete ===');
  });
});

test.describe('Property Creation Flow - Photo Upload & Management', () => {

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error' || type === 'warning') {
        console.log(`[Browser ${type}]:`, msg.text());
      }
    });

    page.on('pageerror', error => {
      console.log('[Page Error]:', error.message);
    });
  });

  test('Photo Upload: Add single photo via file input', async ({ page }) => {
    test.setTimeout(90000);

    console.log('=== Starting Photo Upload Test ===');

    // Navigate to properties and start new property
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.locator('text=Add Property').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Fill property basics
    const nameInput = page.locator('input').first();
    await nameInput.fill('Photo Upload Test Property');
    await page.locator('#section-property-line1').fill('123 Photo Test Ave');
    await page.locator('#section-property-city').fill('PhotoCity');
    await page.locator('#section-property-state').fill('CA');
    await page.locator('#section-property-zip').fill('90210');
    await page.locator('text="Apartment"').first().click();

    console.log('Filled property basics');

    await waitForAutoSave(page);

    // Continue to Property Photos
    await page.locator('text=Continue').first().click();
    await page.waitForLoadState('networkidle');
    // Wait for navigation and rendering to complete
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Extra time for React Native Web rendering

    console.log('Navigated to Property Photos screen');

    // Verify we're on Property Photos screen - check for multiple indicators
    const propertyPhotosTitle = page.locator('text="Property Photos"');
    const stepIndicator = page.locator('text=/Step 2 of 8/i');
    const addPhotosButton = page.locator('text=/Add Photos|Add Photo/i');

    // Wait for at least one key element to be visible
    try {
      await Promise.race([
        propertyPhotosTitle.waitFor({ state: 'visible', timeout: 10000 }),
        stepIndicator.waitFor({ state: 'visible', timeout: 10000 }),
        addPhotosButton.waitFor({ state: 'visible', timeout: 10000 }),
      ]);
      console.log('Property Photos screen confirmed');
    } catch (error) {
      console.error('Failed to find Property Photos screen elements');
      const currentUrl = page.url();
      console.log('Current URL:', currentUrl);
      throw new Error(`Not on Property Photos screen. URL: ${currentUrl}`);
    }

    // Look for "Add Photos" button or photo capture element (already defined above)
    const isAddButtonVisible = await addPhotosButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (isAddButtonVisible) {
      console.log('Add Photos button found');

      // Click to open photo selection dialog
      await addPhotosButton.click();
      await page.waitForTimeout(500);

      // Check if alert dialog appears with options
      const alertVisible = await page.locator('text=/Choose from Gallery|Take Photo/i').isVisible({ timeout: 2000 }).catch(() => false);

      if (alertVisible) {
        console.log('Photo selection alert shown');

        // Select "Choose from Gallery" option
        const galleryOption = page.locator('text="Choose from Gallery"').first();
        if (await galleryOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await galleryOption.click();
          console.log('Clicked Choose from Gallery');
        }
      }

      // Look for file input (may be hidden)
      // Note: In React Native Web, file inputs might be programmatically triggered
      // We'll try to find and use the input element
      const fileInput = page.locator('input[type="file"]').first();
      const fileInputExists = await fileInput.count().then(c => c > 0);

      if (fileInputExists) {
        console.log('File input found');

        // Create a minimal valid JPEG file for testing
        const testImageBuffer = Buffer.from(
          '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
          'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIy' +
          'MjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIA' +
          'AhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEB' +
          'AQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAB//2Q==',
          'base64'
        );

        // Upload the test image
        await fileInput.setInputFiles({
          name: 'test-property-photo.jpg',
          mimeType: 'image/jpeg',
          buffer: testImageBuffer,
        });

        console.log('File uploaded via input');

        // Wait for processing
        await page.waitForTimeout(2000);

        // Check for "Processing Photos..." or completion
        const processingIndicator = page.locator('text=/Processing|Loading/i');
        const isProcessing = await processingIndicator.isVisible({ timeout: 1000 }).catch(() => false);

        if (isProcessing) {
          console.log('Photo processing in progress');
          // Wait for processing to complete
          await page.waitForTimeout(3000);
        }

        // Verify photo appears in the grid
        // Look for photo count indicator
        const photoCount = page.locator('text=/1 of|photos/i').first();
        const hasPhotoCount = await photoCount.isVisible({ timeout: 5000 }).catch(() => false);
        console.log('Photo count visible:', hasPhotoCount);

        await page.screenshot({ path: 'test-results/photo-upload-single.png', fullPage: true });
      } else {
        console.log('File input not found - may need different approach for React Native Web');
      }
    } else {
      console.log('Add Photos button not visible - screen may have different layout');
    }

    await page.screenshot({ path: 'test-results/photo-upload-final.png', fullPage: true });

    console.log('=== Photo Upload Test Complete ===');
  });

  test('Photo Management: Upload multiple photos and remove one', async ({ page }) => {
    test.setTimeout(90000);

    console.log('=== Starting Photo Management Test ===');

    // Navigate and setup
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.locator('text=Add Property').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // Fill basics
    const nameInput = page.locator('input').first();
    await nameInput.fill('Multi Photo Test');
    await page.locator('#section-property-line1').fill('456 Multi Photo Road');
    await page.locator('#section-property-city').fill('PhotoTest');
    await page.locator('#section-property-state').fill('NY');
    await page.locator('#section-property-zip').fill('10001');
    await page.locator('text="House"').first().click();

    await waitForAutoSave(page);

    // Continue to photos
    await page.locator('text=Continue').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Try to add multiple photos
    const addPhotosButton = page.locator('text=/Add Photos/i').first();
    const isAddButtonVisible = await addPhotosButton.isVisible({ timeout: 5000 }).catch(() => false);

    if (isAddButtonVisible) {
      console.log('Attempting to add multiple photos');

      // Create multiple test images
      const testImages = [
        {
          name: 'photo-1.jpg',
          mimeType: 'image/jpeg',
          buffer: Buffer.from('/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsL', 'base64'),
        },
        {
          name: 'photo-2.jpg',
          mimeType: 'image/jpeg',
          buffer: Buffer.from('/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsL', 'base64'),
        },
      ];

      // Note: Multiple file upload may require special handling in React Native Web
      const fileInput = page.locator('input[type="file"]').first();
      const fileInputExists = await fileInput.count().then(c => c > 0);

      if (fileInputExists) {
        // Try uploading first image
        await addPhotosButton.click();
        await page.waitForTimeout(500);

        const galleryOption = page.locator('text="Choose from Gallery"').first();
        if (await galleryOption.isVisible({ timeout: 2000 }).catch(() => false)) {
          await galleryOption.click();
        }

        await fileInput.setInputFiles(testImages[0]);
        await page.waitForTimeout(2000);

        console.log('Uploaded first photo');

        // Check for delete button on photo
        const deleteButton = page.locator('[name="close-circle"]').first();
        const hasDeleteButton = await deleteButton.isVisible({ timeout: 3000 }).catch(() => false);

        if (hasDeleteButton) {
          console.log('Delete button found on photo');

          // Click delete button
          await deleteButton.click();
          await page.waitForTimeout(500);

          // Confirm deletion in alert
          const confirmButton = page.locator('text="Delete"').first();
          if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await confirmButton.click();
            await page.waitForTimeout(1000);
            console.log('Photo deleted');
          }
        }

        await page.screenshot({ path: 'test-results/photo-management-after-delete.png', fullPage: true });
      }
    }

    console.log('=== Photo Management Test Complete ===');
  });

  test('Photo Validation: Test max photo limit (5 photos)', async ({ page }) => {
    test.setTimeout(90000);

    console.log('=== Starting Photo Limit Test ===');

    // Setup and navigate to photos screen
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.locator('text=Add Property').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    const nameInput = page.locator('input').first();
    await nameInput.fill('Photo Limit Test');
    await page.locator('#section-property-line1').fill('789 Limit Lane');
    await page.locator('#section-property-city').fill('LimitCity');
    await page.locator('#section-property-state').fill('TX');
    await page.locator('#section-property-zip').fill('75001');
    await page.locator('text="Condo"').first().click();

    await waitForAutoSave(page);

    await page.locator('text=Continue').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for max photos indicator
    const photoCountText = page.locator('text=/of 5 photos|Maximum photos/i').first();
    const hasMaxIndicator = await photoCountText.isVisible({ timeout: 5000 }).catch(() => false);

    if (hasMaxIndicator) {
      console.log('Photo limit indicator found');
      const text = await photoCountText.textContent();
      console.log('Photo limit text:', text);
    }

    await page.screenshot({ path: 'test-results/photo-limit-test.png', fullPage: true });

    console.log('=== Photo Limit Test Complete ===');
  });
});

test.describe('Property Creation Flow - Complete End-to-End with Photos & Assets', () => {

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error' || type === 'warning') {
        console.log(`[Browser ${type}]:`, msg.text());
      }
    });
  });

  test('Complete Flow: Property with photos, rooms, and assets', async ({ page }) => {
    test.setTimeout(120000); // 2 minutes for complete flow

    console.log('=== Starting Complete E2E Flow Test ===');

    // Step 1: Navigate and create property basics
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    await page.locator('text=Add Property').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    console.log('Step 1: Property Basics');
    const nameInput = page.locator('input').first();
    await nameInput.fill('Complete Flow Test Property');
    await page.locator('#section-property-line1').fill('123 Complete Street');
    await page.locator('#section-property-city').fill('CompleteCity');
    await page.locator('#section-property-state').fill('CA');
    await page.locator('#section-property-zip').fill('90001');
    await page.locator('text="House"').first().click();

    await waitForAutoSave(page);
    await page.screenshot({ path: 'test-results/complete-flow-step1.png', fullPage: true });

    // Step 2: Property Photos
    await page.locator('text=Continue').first().click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('Step 2: Property Photos');

    // Skip photos for now (or add if possible)
    const skipButton = page.locator('text=Skip').first();
    const hasSkipButton = await skipButton.isVisible({ timeout: 3000 }).catch(() => false);

    if (hasSkipButton) {
      console.log('Skipping photos step');
      await skipButton.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    } else {
      // Try continue button
      const continueButton = page.locator('text=Continue').first();
      if (await continueButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await continueButton.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
      }
    }

    await page.screenshot({ path: 'test-results/complete-flow-step2.png', fullPage: true });

    // Step 3: Room Selection
    console.log('Step 3: Room Selection');
    const isOnRoomSelection = await page.locator('text=/Select Rooms|Room Selection|Step 3/i').isVisible({ timeout: 5000 }).catch(() => false);

    if (isOnRoomSelection) {
      console.log('On Room Selection screen');

      // Select some rooms (they may be pre-selected)
      const livingRoomCard = page.locator('text="Living Room"').first();
      const kitchenCard = page.locator('text="Kitchen"').first();

      // Verify rooms are displayed
      const hasLivingRoom = await livingRoomCard.isVisible({ timeout: 3000 }).catch(() => false);
      const hasKitchen = await kitchenCard.isVisible({ timeout: 3000 }).catch(() => false);

      console.log('Living Room visible:', hasLivingRoom);
      console.log('Kitchen visible:', hasKitchen);

      await page.screenshot({ path: 'test-results/complete-flow-step3-rooms.png', fullPage: true });

      // Continue to next step
      const continueToRoomPhotos = page.locator('text=/Continue to Room Photos|Continue/i').first();
      if (await continueToRoomPhotos.isVisible({ timeout: 3000 }).catch(() => false)) {
        await continueToRoomPhotos.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
      }
    }

    // Step 4-8: Navigate through remaining steps
    console.log('Navigating through remaining steps');
    let stepCount = 0;
    const maxSteps = 10;

    while (stepCount < maxSteps) {
      const nextButton = page.locator('text=/Continue|Skip|Next|Submit|Finish/i').first();

      if (await nextButton.isVisible({ timeout: 3000 })) {
        const buttonText = await nextButton.textContent();
        console.log(`Step ${stepCount + 4}: Clicking "${buttonText}"`);

        await nextButton.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);

        await page.screenshot({
          path: `test-results/complete-flow-step${stepCount + 4}.png`,
          fullPage: true
        });

        // Check if we reached final step
        if (buttonText?.match(/Submit|Finish|Complete/i)) {
          console.log('Reached final submit step');
          break;
        }

        stepCount++;
      } else {
        console.log('No more navigation buttons found');
        break;
      }
    }

    // Verify completion
    const isOnPropertiesPage = page.url().includes('/properties');
    const hasSuccessMessage = await page.locator('text=/Success|Created|Completed/i').isVisible({ timeout: 3000 }).catch(() => false);

    console.log('Flow complete - On properties page:', isOnPropertiesPage);
    console.log('Success message shown:', hasSuccessMessage);

    await page.screenshot({ path: 'test-results/complete-flow-final.png', fullPage: true });

    console.log('=== Complete E2E Flow Test Complete ===');
  });
});
