import { test, expect } from '@playwright/test';

test('Debug Step 3 Continue button', async ({ page }) => {
  // Listen for console errors
  const consoleMessages: string[] = [];
  page.on('console', msg => {
    consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
  });

  page.on('pageerror', error => {
    consoleMessages.push(`[ERROR] ${error.message}`);
  });

  // Navigate through steps 1-3
  await page.goto('/properties');
  await page.waitForLoadState('networkidle');

  const addButton = page.locator('text=Add Property').first();
  await expect(addButton).toBeVisible({ timeout: 10000 });
  await addButton.click();
  await page.waitForTimeout(1500);

  // Step 1
  await page.locator('input').first().fill('Test Property');
  await page.locator('#section-property-line1').fill('123 Test St');
  await page.locator('#section-property-city').fill('TestCity');
  await page.locator('#section-property-state').fill('CA');
  await page.locator('#section-property-zip').fill('90210');
  await page.locator('text="House"').first().click();
  await page.locator('text=Continue').first().click();
  await page.waitForTimeout(2000);

  // Step 2 - Continue to Rooms
  const step2Continue = page.locator('text="Continue to Rooms"');
  await expect(step2Continue).toBeVisible({ timeout: 10000 });
  await step2Continue.click();
  await page.waitForTimeout(3000);

  // Step 3 - Verify we're here
  await expect(page.locator('text="Select Rooms"')).toBeVisible();
  console.log('✓ On Step 3: Room Selection');

  // Try to click Continue to Room Photos
  const continueBtn = page.locator('text="Continue to Room Photos"');
  await expect(continueBtn).toBeVisible();

  console.log('Clicking Continue to Room Photos...');
  await continueBtn.click();

  await page.waitForTimeout(5000);

  // Check what's on the page now
  const bodyText = await page.locator('body').textContent();
  console.log('=== Page content after click ===');
  console.log(bodyText?.substring(0, 500));

  // Check URL
  console.log('=== Current URL ===');
  console.log(page.url());

  // Print console messages
  console.log('=== Console messages ===');
  consoleMessages.forEach(msg => console.log(msg));

  // Take screenshot
  await page.screenshot({ path: 'test-results/debug-step3-continue.png', fullPage: true });
});
