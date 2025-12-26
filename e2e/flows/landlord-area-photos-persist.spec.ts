/**
 * E2E Test: Area Photos Persistence Bug
 *
 * Bug: When landlord adds photos to an area (kitchen), then adds an asset,
 * the area photos disappear.
 *
 * Expected: Area photos should persist regardless of asset activity.
 *
 * Flow:
 * 1. Login as landlord
 * 2. Start property creation
 * 3. Add 3 photos to Kitchen area
 * 4. Continue to Assets screen
 * 5. Add Fridge asset with 1 photo
 * 6. Verify Kitchen still shows 3 photos
 */

import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Landlord Area Photos Persistence', () => {
  test.setTimeout(180000); // 3 minutes for full flow

  test('area photos should persist when adding assets', async ({ page }) => {
    // Navigate to app
    await page.goto('http://localhost:8081');
    await page.waitForLoadState('networkidle');

    // Step 1: Login as landlord
    const testEmail = process.env.TEST_LANDLORD_EMAIL || 'e2e-test@myailandlord.com';
    const testPassword = process.env.TEST_LANDLORD_PASSWORD || 'TestUser123!E2E';

    console.log('🔐 Logging in as landlord...');

    // Click "Sign In" link on welcome screen
    const signInLink = page.locator('text=Sign In');
    if (await signInLink.isVisible({ timeout: 5000 })) {
      await signInLink.click();
      await page.waitForTimeout(2000);
    }

    // Wait for sign-in form
    await page.waitForSelector('input[placeholder*="email" i], input[type="email"]', { timeout: 15000 });
    await page.fill('input[placeholder*="email" i], input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button:has-text("Sign In"), button:has-text("Log In"), button:has-text("Continue")');

    // Wait for auth to complete and home screen to load
    await page.waitForTimeout(5000);

    // Step 2: Navigate to property creation
    console.log('🏠 Starting property creation flow...');

    // Look for "Add Property" or similar button
    await page.click('button:has-text("Add Property"), a:has-text("Add Property"), button:has-text("Create Property")');
    await page.waitForTimeout(2000);

    // Fill basic property info
    await page.fill('input[placeholder*="property name" i], input[placeholder*="name" i]', 'E2E Test Property - Photo Persistence');

    // Fill address
    await page.fill('input[placeholder*="address" i], input[placeholder*="street" i]', '123 Test Street');
    await page.fill('input[placeholder*="city" i]', 'San Francisco');
    await page.fill('input[placeholder*="state" i]', 'CA');
    await page.fill('input[placeholder*="zip" i]', '94102');

    // Select property type
    await page.click('text=House, text=Apartment, text=Condo');

    // Set bedrooms/bathrooms
    await page.fill('input[placeholder*="bedroom" i]', '2');
    await page.fill('input[placeholder*="bathroom" i]', '2');

    // Continue to areas
    await page.click('button:has-text("Continue"), button:has-text("Next")');
    await page.waitForTimeout(2000);

    // Step 3: Add photos to Kitchen area
    console.log('📸 Adding 3 photos to Kitchen...');

    // Find Kitchen area and add photos
    const kitchenCard = page.locator('text=Kitchen').first();
    await kitchenCard.scrollIntoViewIfNeeded();

    // Click camera/add photo button for kitchen
    const addPhotoBtn = kitchenCard.locator('..').locator('button[title*="photo" i], button:has(svg)').first();

    // Add 3 test photos
    const testImagePath = path.join(__dirname, '../fixtures/test-kitchen-photo.jpg');

    for (let i = 1; i <= 3; i++) {
      console.log(`📸 Adding kitchen photo ${i}/3...`);

      // Click add photo button
      await addPhotoBtn.click();
      await page.waitForTimeout(500);

      // Select "Gallery" or "Choose from gallery"
      await page.click('text=Gallery, text=Photo Library, text=Choose from library');
      await page.waitForTimeout(500);

      // Upload file (web-specific)
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testImagePath);
      await page.waitForTimeout(2000); // Wait for upload
    }

    // Verify 3 photos are shown in Kitchen
    const kitchenPhotoCount = await kitchenCard.locator('..').locator('img, text=3 photo').count();
    console.log(`✅ Kitchen shows ${kitchenPhotoCount} photos`);
    expect(kitchenPhotoCount).toBeGreaterThanOrEqual(1); // At least indicator of 3 photos

    // Step 4: Continue to Assets screen
    console.log('➡️  Continuing to Assets screen...');
    await page.click('button:has-text("Continue"), button:has-text("Next")');
    await page.waitForTimeout(2000);

    // Step 5: Add Fridge asset with photo
    console.log('🧊 Adding Fridge asset with photo...');

    // Find "Add Asset" dropdown for Kitchen
    await page.click('text=Add Asset, text=Add asset, button:has-text("Select asset type")');
    await page.waitForTimeout(500);

    // Select Fridge from dropdown
    await page.click('text=Fridge');
    await page.waitForTimeout(1000);

    // Fill asset details
    await page.fill('input[placeholder*="brand" i]', 'Whirlpool');
    await page.fill('input[placeholder*="model" i]', 'SF3450912345');

    // Add photo to asset
    await page.click('button:has-text("Add Photo"), button[title*="photo" i]');
    await page.waitForTimeout(500);
    await page.click('text=Gallery, text=Photo Library');
    const assetFileInput = page.locator('input[type="file"]');
    await assetFileInput.setInputFiles(testImagePath);
    await page.waitForTimeout(2000);

    // Save asset
    await page.click('button:has-text("Save"), button:has-text("Add")');
    await page.waitForTimeout(2000);

    // Step 6: CRITICAL - Verify Kitchen STILL shows 3 photos
    console.log('🔍 Verifying Kitchen photos persisted after adding asset...');

    // Navigate back to Kitchen section or check photo summary
    const kitchenSection = page.locator('text=Kitchen').first();
    await kitchenSection.scrollIntoViewIfNeeded();

    // Check if Kitchen still shows photos
    const kitchenPhotosAfter = await kitchenSection.locator('..').locator('text=3 photo, text=0 photo').textContent();

    console.log(`📊 Kitchen photo status after adding asset: ${kitchenPhotosAfter}`);

    // ASSERTION: Kitchen should NOT show "0 photos"
    expect(kitchenPhotosAfter).not.toContain('0 photo');
    expect(kitchenPhotosAfter).toContain('3 photo'); // Should still show 3 photos

    console.log('✅ TEST PASSED: Kitchen photos persisted!');
  });
});
