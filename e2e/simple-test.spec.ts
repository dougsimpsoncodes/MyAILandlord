import { test, expect } from '@playwright/test';

/**
 * Simple test to verify the app loads and we can navigate
 */
test.describe('App Loading Test', () => {
  test('should load the app and display initial content', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot to see what's actually loading
    await page.screenshot({ path: 'test-results/app-initial-load.png', fullPage: true });
    
    // Check if we can see the app title or any content
    const title = await page.title();
    console.log('Page title:', title);
    
    // Check what text content is visible
    const bodyText = await page.locator('body').textContent();
    console.log('Page content preview:', bodyText?.substring(0, 200));
    
    // Try to find any text that indicates the app loaded
    const hasAppContent = await page.locator('text=/My AI Landlord|Welcome|Login|Sign|Dashboard/i').count();
    expect(hasAppContent).toBeGreaterThan(0);
  });

  test('should handle authentication flow', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Mock authentication by setting localStorage
    await page.evaluate(() => {
      localStorage.setItem('userRole', 'landlord');
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userId', 'test-landlord-1');
    });
    
    // Try to navigate to dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of authenticated state
    await page.screenshot({ path: 'test-results/app-authenticated.png', fullPage: true });
    
    // Check for any landlord-specific content
    const hasLandlordContent = await page.locator('text=/Dashboard|Properties|Maintenance|Cases/i').count();
    console.log('Found landlord content elements:', hasLandlordContent);
  });
});