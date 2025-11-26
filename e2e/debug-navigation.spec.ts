import { test, expect } from '@playwright/test';

test.describe('Debug Navigation', () => {
  test('Check what renders at root', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({ path: 'test-results/debug-root.png', fullPage: true });

    // Get all text content
    const bodyText = await page.locator('body').textContent();
    console.log('=== Body text content ===');
    console.log(bodyText);

    // Get all visible elements
    const elements = await page.locator('*').allTextContents();
    console.log('=== All text elements ===');
    console.log(elements);

    // Check URL
    console.log('=== Current URL ===');
    console.log(page.url());
  });

  test('Check what renders at /properties', async ({ page }) => {
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({ path: 'test-results/debug-properties.png', fullPage: true });

    // Get all text content
    const bodyText = await page.locator('body').textContent();
    console.log('=== Body text content ===');
    console.log(bodyText);

    // Check for specific elements
    const hasPropertyManagement = await page.locator('text=Property Management').count();
    console.log('Has "Property Management":', hasPropertyManagement);

    const hasAddProperty = await page.locator('text=Add Property').count();
    console.log('Has "Add Property":', hasAddProperty);

    // Check URL
    console.log('=== Current URL ===');
    console.log(page.url());
  });
});
