import { test, expect } from '@playwright/test';

test('Debug Alert modal', async ({ page }) => {
  // Navigate and fill Steps 1-2
  await page.goto('/properties');
  await page.waitForLoadState('networkidle');

  const addButton = page.locator('text=Add Property').first();
  await expect(addButton).toBeVisible({ timeout: 10000 });
  await addButton.click();
  await page.waitForTimeout(1500);

  // Fill Step 1
  const nameInput = page.locator('input').first();
  await nameInput.fill('Test Property');
  await page.locator('#section-property-line1').fill('123 Test St');
  await page.locator('#section-property-city').fill('TestCity');
  await page.locator('#section-property-state').fill('CA');
  await page.locator('#section-property-zip').fill('90210');
  await page.locator('text="House"').first().click();

  // Continue to Step 2
  await page.locator('text=Continue').first().click();
  await page.waitForTimeout(2000);

  // Click Skip
  const skipButton = page.locator('text=Skip');
  await expect(skipButton).toBeVisible({ timeout: 10000 });
  await skipButton.click();
  await page.waitForTimeout(2000);

  // Take screenshot
  await page.screenshot({ path: 'test-results/debug-alert-modal.png', fullPage: true });

  // Get all text on page
  const allText = await page.locator('body').textContent();
  console.log('=== All text after clicking Skip ===');
  console.log(allText);

  // Find all buttons
  const buttons = await page.locator('button').all();
  console.log(`=== Found ${buttons.length} buttons ===`);
  for (let i = 0; i < buttons.length; i++) {
    const text = await buttons[i].textContent();
    const visible = await buttons[i].isVisible();
    console.log(`Button ${i}: "${text}" (visible: ${visible})`);
  }
});
