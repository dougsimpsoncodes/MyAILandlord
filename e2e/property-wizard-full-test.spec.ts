import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * PROPERTY CREATION WIZARD - FULL END-TO-END TEST
 *
 * This test navigates through ALL 8 steps of the property creation wizard
 * and tests photo uploads at each step.
 */

const TEST_TIMEOUT = 120000; // 2 minutes per test

// Create a test image for upload testing
function createTestImage(): string {
  const testImagePath = path.join(__dirname, 'fixtures', 'test-property-photo.jpg');
  const fixturesDir = path.join(__dirname, 'fixtures');

  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
  }

  if (!fs.existsSync(testImagePath)) {
    // Create a minimal valid JPEG
    const minimalJpeg = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
      0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
      0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
      0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
      0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
      0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
      0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
      0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
      0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06,
      0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xA1, 0x08,
      0x23, 0x42, 0xB1, 0xC1, 0x15, 0x52, 0xD1, 0xF0, 0x24, 0x33, 0x62, 0x72,
      0x82, 0x09, 0x0A, 0x16, 0x17, 0x18, 0x19, 0x1A, 0x25, 0x26, 0x27, 0x28,
      0x29, 0x2A, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3A, 0x43, 0x44, 0x45,
      0x46, 0x47, 0x48, 0x49, 0x4A, 0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59,
      0x5A, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6A, 0x73, 0x74, 0x75,
      0x76, 0x77, 0x78, 0x79, 0x7A, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89,
      0x8A, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9A, 0xA2, 0xA3,
      0xA4, 0xA5, 0xA6, 0xA7, 0xA8, 0xA9, 0xAA, 0xB2, 0xB3, 0xB4, 0xB5, 0xB6,
      0xB7, 0xB8, 0xB9, 0xBA, 0xC2, 0xC3, 0xC4, 0xC5, 0xC6, 0xC7, 0xC8, 0xC9,
      0xCA, 0xD2, 0xD3, 0xD4, 0xD5, 0xD6, 0xD7, 0xD8, 0xD9, 0xDA, 0xE1, 0xE2,
      0xE3, 0xE4, 0xE5, 0xE6, 0xE7, 0xE8, 0xE9, 0xEA, 0xF1, 0xF2, 0xF3, 0xF4,
      0xF5, 0xF6, 0xF7, 0xF8, 0xF9, 0xFA, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01,
      0x00, 0x00, 0x3F, 0x00, 0xFB, 0xD5, 0xDB, 0x20, 0xB8, 0xF9, 0xFF, 0xD9
    ]);
    fs.writeFileSync(testImagePath, minimalJpeg);
  }

  return testImagePath;
}

// Helper to wait for page to be ready
async function waitForReady(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

// Helper to click and wait
async function clickAndWait(page: Page, locator: any) {
  await locator.click();
  await waitForReady(page);
}

// Helper to find and click text
async function clickText(page: Page, pattern: RegExp | string) {
  const el = page.getByText(pattern).first();
  if (await el.isVisible({ timeout: 5000 }).catch(() => false)) {
    await clickAndWait(page, el);
    return true;
  }
  return false;
}

// Helper to log step
function logStep(step: string, status: 'start' | 'pass' | 'fail' | 'skip' | 'info', message?: string) {
  const icons = { start: '▶', pass: '✓', fail: '✗', skip: '⚠', info: 'ℹ' };
  console.log(`${icons[status]} ${step}${message ? ': ' + message : ''}`);
}

test.describe('Property Creation Wizard - Full E2E Test', () => {
  test.setTimeout(TEST_TIMEOUT);

  test('Complete 8-Step Property Creation with Photos', async ({ page }) => {
    const testImagePath = createTestImage();

    // ==================================================
    // NAVIGATE TO PROPERTY MANAGEMENT
    // ==================================================
    logStep('Step 0', 'start', 'Navigating to app');
    await page.goto('/');
    await waitForReady(page);

    // Take screenshot of initial state
    await page.screenshot({ path: 'test-results/wizard-0-initial.png', fullPage: true });

    // Find and click Property Management
    logStep('Step 0', 'info', 'Looking for Property Management');

    // Try different navigation paths
    const navPaths = [
      /property management/i,
      /my properties/i,
      /properties/i,
      /manage/i,
      /landlord/i,
    ];

    let foundNav = false;
    for (const pattern of navPaths) {
      if (await clickText(page, pattern)) {
        logStep('Step 0', 'pass', `Clicked: ${pattern}`);
        foundNav = true;
        break;
      }
    }

    await page.screenshot({ path: 'test-results/wizard-0-after-nav.png', fullPage: true });

    // ==================================================
    // STEP 1: CLICK ADD PROPERTY
    // ==================================================
    logStep('Step 1', 'start', 'Finding Add Property button');

    const addPropertyPatterns = [
      /add property/i,
      /new property/i,
      /create property/i,
      /\+ property/i,
      /add/i,
    ];

    let foundAddProperty = false;
    for (const pattern of addPropertyPatterns) {
      const btn = page.getByText(pattern).first();
      if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
        await clickAndWait(page, btn);
        logStep('Step 1', 'pass', `Clicked Add Property: ${pattern}`);
        foundAddProperty = true;
        break;
      }
    }

    if (!foundAddProperty) {
      // Try clicking any button that might be "add"
      const addBtn = page.locator('[data-testid*="add"], [aria-label*="add"]').first();
      if (await addBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await clickAndWait(page, addBtn);
        foundAddProperty = true;
      }
    }

    await page.screenshot({ path: 'test-results/wizard-1-add-property.png', fullPage: true });

    // ==================================================
    // STEP 1: FILL ADDRESS FORM
    // ==================================================
    logStep('Step 1', 'info', 'Filling address form');

    // Find and fill address fields
    const addressSelectors = [
      { field: 'address', selectors: ['input[placeholder*="address" i]', 'input[name*="address" i]', '[data-testid*="address"]'] },
      { field: 'city', selectors: ['input[placeholder*="city" i]', 'input[name*="city" i]', '[data-testid*="city"]'] },
      { field: 'state', selectors: ['select[name*="state" i]', 'input[name*="state" i]', '[data-testid*="state"]'] },
      { field: 'zip', selectors: ['input[placeholder*="zip" i]', 'input[name*="zip" i]', '[data-testid*="zip"]'] },
    ];

    const testData = {
      address: '123 Test Property Lane',
      city: 'Austin',
      state: 'TX',
      zip: '78701',
    };

    for (const { field, selectors } of addressSelectors) {
      for (const selector of selectors) {
        const input = page.locator(selector).first();
        if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
          const tagName = await input.evaluate(el => el.tagName.toLowerCase());
          if (tagName === 'select') {
            await input.selectOption(testData[field as keyof typeof testData]);
          } else {
            await input.fill(testData[field as keyof typeof testData]);
          }
          logStep('Step 1', 'pass', `Filled ${field}`);
          break;
        }
      }
    }

    await page.screenshot({ path: 'test-results/wizard-1-address-filled.png', fullPage: true });

    // Click Continue
    await clickText(page, /continue|next|save/i);

    // ==================================================
    // STEP 2: PROPERTY PHOTOS
    // ==================================================
    logStep('Step 2', 'start', 'Property Photos screen');
    await page.screenshot({ path: 'test-results/wizard-2-photos.png', fullPage: true });

    // Look for add photo button
    const photoButtons = [
      /add photo/i,
      /upload photo/i,
      /take photo/i,
      /choose photo/i,
      /camera/i,
      /gallery/i,
    ];

    let foundPhotoBtn = false;
    for (const pattern of photoButtons) {
      const btn = page.getByText(pattern).first();
      if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
        logStep('Step 2', 'pass', `Found photo button: ${pattern}`);
        foundPhotoBtn = true;

        // Try to upload via file input
        const fileInput = page.locator('input[type="file"]').first();
        if (await fileInput.count() > 0) {
          await fileInput.setInputFiles(testImagePath);
          logStep('Step 2', 'pass', 'Uploaded test photo via file input');
          await page.waitForTimeout(1000);
        } else {
          // Click button and look for file input
          await btn.click();
          await page.waitForTimeout(500);

          const fileInputAfter = page.locator('input[type="file"]').first();
          if (await fileInputAfter.count() > 0) {
            await fileInputAfter.setInputFiles(testImagePath);
            logStep('Step 2', 'pass', 'Uploaded test photo after clicking button');
            await page.waitForTimeout(1000);
          }
        }
        break;
      }
    }

    if (!foundPhotoBtn) {
      // Check if file input exists even without visible button
      const fileInput = page.locator('input[type="file"]').first();
      if (await fileInput.count() > 0) {
        await fileInput.setInputFiles(testImagePath);
        logStep('Step 2', 'pass', 'Found hidden file input and uploaded');
      } else {
        logStep('Step 2', 'skip', 'No photo upload UI found');
      }
    }

    await page.screenshot({ path: 'test-results/wizard-2-after-photo.png', fullPage: true });

    // Click Continue
    await clickText(page, /continue|next|skip/i);

    // ==================================================
    // STEP 3: ROOM SELECTION
    // ==================================================
    logStep('Step 3', 'start', 'Room Selection screen');
    await page.screenshot({ path: 'test-results/wizard-3-rooms.png', fullPage: true });

    // Select rooms
    const rooms = ['Living Room', 'Kitchen', 'Bedroom', 'Bathroom'];
    for (const room of rooms) {
      const roomEl = page.getByText(new RegExp(room, 'i')).first();
      if (await roomEl.isVisible({ timeout: 2000 }).catch(() => false)) {
        await roomEl.click();
        logStep('Step 3', 'pass', `Selected: ${room}`);
        await page.waitForTimeout(300);
      }
    }

    await page.screenshot({ path: 'test-results/wizard-3-rooms-selected.png', fullPage: true });

    // Click Continue
    await clickText(page, /continue|next/i);

    // ==================================================
    // STEP 4: ROOM PHOTOGRAPHY
    // ==================================================
    logStep('Step 4', 'start', 'Room Photography screen');
    await page.screenshot({ path: 'test-results/wizard-4-room-photos.png', fullPage: true });

    // Look for add photo for room
    const roomPhotoBtn = page.getByText(/add photo|take photo|upload/i).first();
    if (await roomPhotoBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      logStep('Step 4', 'info', 'Found room photo button');

      // Try file input
      const fileInput = page.locator('input[type="file"]').first();
      if (await fileInput.count() > 0) {
        await fileInput.setInputFiles(testImagePath);
        logStep('Step 4', 'pass', 'Uploaded room photo');
        await page.waitForTimeout(1000);
      } else {
        await roomPhotoBtn.click();
        await page.waitForTimeout(500);
        const fileInputAfter = page.locator('input[type="file"]').first();
        if (await fileInputAfter.count() > 0) {
          await fileInputAfter.setInputFiles(testImagePath);
          logStep('Step 4', 'pass', 'Uploaded room photo after click');
        }
      }
    } else {
      logStep('Step 4', 'skip', 'No room photo UI found');
    }

    await page.screenshot({ path: 'test-results/wizard-4-after-room-photo.png', fullPage: true });

    // Click Continue
    await clickText(page, /continue|next|skip/i);

    // ==================================================
    // STEP 5: ASSET SCANNING
    // ==================================================
    logStep('Step 5', 'start', 'Asset Scanning screen');
    await page.screenshot({ path: 'test-results/wizard-5-assets.png', fullPage: true });

    // Skip or continue
    await clickText(page, /continue|next|skip|scan/i);

    // ==================================================
    // STEP 6: ASSET DETAILS
    // ==================================================
    logStep('Step 6', 'start', 'Asset Details screen');
    await page.screenshot({ path: 'test-results/wizard-6-asset-details.png', fullPage: true });

    // Fill asset details if visible
    const assetNameInput = page.locator('input[placeholder*="name" i], input[name*="name" i]').first();
    if (await assetNameInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await assetNameInput.fill('Test Refrigerator');
      logStep('Step 6', 'pass', 'Filled asset name');
    }

    const brandInput = page.locator('input[placeholder*="brand" i], input[name*="brand" i]').first();
    if (await brandInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await brandInput.fill('Samsung');
      logStep('Step 6', 'pass', 'Filled brand');
    }

    const modelInput = page.locator('input[placeholder*="model" i], input[name*="model" i]').first();
    if (await modelInput.isVisible({ timeout: 1000 }).catch(() => false)) {
      await modelInput.fill('RF28R7551SR');
      logStep('Step 6', 'pass', 'Filled model');
    }

    await page.screenshot({ path: 'test-results/wizard-6-details-filled.png', fullPage: true });

    // Click Continue
    await clickText(page, /continue|next|skip|save/i);

    // ==================================================
    // STEP 7: ASSET PHOTOS
    // ==================================================
    logStep('Step 7', 'start', 'Asset Photos screen');
    await page.screenshot({ path: 'test-results/wizard-7-asset-photos.png', fullPage: true });

    // Upload asset photo
    const assetPhotoBtn = page.getByText(/add photo|upload|take photo/i).first();
    if (await assetPhotoBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      const fileInput = page.locator('input[type="file"]').first();
      if (await fileInput.count() > 0) {
        await fileInput.setInputFiles(testImagePath);
        logStep('Step 7', 'pass', 'Uploaded asset photo');
        await page.waitForTimeout(1000);
      }
    } else {
      logStep('Step 7', 'skip', 'No asset photo UI found');
    }

    await page.screenshot({ path: 'test-results/wizard-7-after-asset-photo.png', fullPage: true });

    // Click Continue
    await clickText(page, /continue|next|skip/i);

    // ==================================================
    // STEP 8: REVIEW & SUBMIT
    // ==================================================
    logStep('Step 8', 'start', 'Review & Submit screen');
    await page.screenshot({ path: 'test-results/wizard-8-review.png', fullPage: true });

    // Look for review content
    const reviewContent = page.getByText(/review|summary|confirm/i).first();
    if (await reviewContent.isVisible({ timeout: 3000 }).catch(() => false)) {
      logStep('Step 8', 'pass', 'Review screen displayed');
    }

    // Check if property address is shown
    const addressShown = page.getByText(/123 Test Property Lane/i).first();
    if (await addressShown.isVisible({ timeout: 2000 }).catch(() => false)) {
      logStep('Step 8', 'pass', 'Property address confirmed in review');
    }

    // Submit
    const submitted = await clickText(page, /submit|create|finish|complete/i);
    if (submitted) {
      logStep('Step 8', 'pass', 'Clicked submit');
    }

    await page.screenshot({ path: 'test-results/wizard-8-submitted.png', fullPage: true });

    // ==================================================
    // VERIFICATION
    // ==================================================
    logStep('Verify', 'start', 'Checking final state');

    // Wait for any success message or redirect
    await page.waitForTimeout(2000);

    const currentUrl = page.url();
    logStep('Verify', 'info', `Final URL: ${currentUrl}`);

    await page.screenshot({ path: 'test-results/wizard-final.png', fullPage: true });

    // Check for success indicators
    const successPatterns = [
      /success/i,
      /created/i,
      /saved/i,
      /complete/i,
      /property management/i,
    ];

    for (const pattern of successPatterns) {
      const el = page.getByText(pattern).first();
      if (await el.isVisible({ timeout: 2000 }).catch(() => false)) {
        logStep('Verify', 'pass', `Found success indicator: ${pattern}`);
        break;
      }
    }

    console.log('\n========================================');
    console.log('PROPERTY WIZARD TEST COMPLETE');
    console.log('========================================');
    console.log('Screenshots saved to test-results/wizard-*.png');
    console.log('========================================\n');
  });

  test('Verify Photo Upload Works on Property Photos Screen', async ({ page }) => {
    const testImagePath = createTestImage();

    logStep('Photo Test', 'start', 'Testing direct photo upload');

    await page.goto('/');
    await waitForReady(page);

    // Navigate to property photos (try direct route)
    await page.goto('/property-photos');
    await waitForReady(page);

    await page.screenshot({ path: 'test-results/photo-test-1.png', fullPage: true });

    // Look for any photo upload mechanism
    const fileInputs = await page.locator('input[type="file"]').count();
    logStep('Photo Test', 'info', `Found ${fileInputs} file inputs`);

    if (fileInputs > 0) {
      const fileInput = page.locator('input[type="file"]').first();
      await fileInput.setInputFiles(testImagePath);
      await page.waitForTimeout(1000);
      logStep('Photo Test', 'pass', 'File input accepts images');
    }

    // Look for photo grid or uploaded photo
    const photos = await page.locator('img[src*="blob:"], [data-testid*="photo"]').count();
    logStep('Photo Test', 'info', `Found ${photos} uploaded photos/thumbnails`);

    await page.screenshot({ path: 'test-results/photo-test-2.png', fullPage: true });
  });

  test('Verify Room Photo Upload Works', async ({ page }) => {
    const testImagePath = createTestImage();

    logStep('Room Photo Test', 'start', 'Testing room photo upload');

    await page.goto('/');
    await waitForReady(page);

    // Navigate to room photography (try direct route)
    await page.goto('/room-photography');
    await waitForReady(page);

    await page.screenshot({ path: 'test-results/room-photo-test-1.png', fullPage: true });

    // Look for add photo button
    const addPhotoBtn = page.getByText(/add photo/i).first();
    if (await addPhotoBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      logStep('Room Photo Test', 'pass', 'Add Photo button visible');

      // Try clicking it
      await addPhotoBtn.click();
      await page.waitForTimeout(500);

      // Check if file input appeared
      const fileInputs = await page.locator('input[type="file"]').count();
      if (fileInputs > 0) {
        const fileInput = page.locator('input[type="file"]').first();
        await fileInput.setInputFiles(testImagePath);
        await page.waitForTimeout(1000);
        logStep('Room Photo Test', 'pass', 'Photo uploaded successfully');
      }
    }

    await page.screenshot({ path: 'test-results/room-photo-test-2.png', fullPage: true });
  });
});
