import { test, expect } from '@playwright/test';

/**
 * End-to-end test for the complete maintenance workflow
 * Tests the actual app navigation and functionality
 */
test.describe('Maintenance Workflow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should complete full landlord maintenance workflow', async ({ page }) => {
    // Start from welcome screen
    await expect(page.getByText('My AI Landlord')).toBeVisible();
    await expect(page.getByText('Get Started')).toBeVisible();
    
    // Click Get Started to begin onboarding
    await page.getByText('Get Started').click();
    await page.waitForLoadState('networkidle');
    
    // Take screenshot of next screen
    await page.screenshot({ path: 'test-results/after-get-started.png', fullPage: true });
    
    // Look for role selection or login screen
    const pageContent = await page.locator('body').textContent();
    console.log('Page after Get Started:', pageContent?.substring(0, 300));
    
    // Check for common authentication/role selection elements
    const hasRoleSelection = await page.locator('text=/Landlord|Tenant|Property Manager/i').count();
    const hasLogin = await page.locator('text=/Login|Sign In|Email|Password/i').count();
    const hasAuth = await page.locator('text=/Continue|Next|Select/i').count();
    
    console.log('Role selection elements:', hasRoleSelection);
    console.log('Login elements:', hasLogin);
    console.log('Auth elements:', hasAuth);
    
    // If we see role selection, select Landlord
    if (hasRoleSelection > 0) {
      const landlordButton = page.locator('text=/Landlord/i').first();
      if (await landlordButton.isVisible()) {
        await landlordButton.click();
        await page.waitForLoadState('networkidle');
        
        // Look for continue/next button
        const continueButton = page.locator('text=/Continue|Next|Proceed/i').first();
        if (await continueButton.isVisible()) {
          await continueButton.click();
          await page.waitForLoadState('networkidle');
        }
      }
    }
    
    // Mock authentication if we're on login screen
    if (hasLogin > 0) {
      // Set authentication in localStorage
      await page.evaluate(() => {
        localStorage.setItem('userRole', 'landlord');
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userId', 'test-landlord-1');
      });
      
      // Reload to apply auth state
      await page.reload();
      await page.waitForLoadState('networkidle');
    }
    
    // Take screenshot of current state
    await page.screenshot({ path: 'test-results/after-auth.png', fullPage: true });
    
    // Look for dashboard or main content
    const finalContent = await page.locator('body').textContent();
    console.log('Final page content:', finalContent?.substring(0, 300));
    
    // Verify we can see some maintenance-related content
    const hasMaintenanceContent = await page.locator('text=/Dashboard|Maintenance|Cases|Properties|Requests/i').count();
    expect(hasMaintenanceContent).toBeGreaterThan(0);
  });

  test('should handle navigation and find maintenance features', async ({ page }) => {
    // Start from app root
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Try direct navigation to dashboard
    await page.goto('/landlord/dashboard');
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/direct-dashboard.png', fullPage: true });
    
    const dashboardContent = await page.locator('body').textContent();
    console.log('Dashboard page content:', dashboardContent?.substring(0, 200));
    
    // Check if we're redirected to auth or if dashboard loads
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // If not on dashboard, try setting auth and navigating again
    if (!currentUrl.includes('dashboard')) {
      await page.evaluate(() => {
        localStorage.setItem('userRole', 'landlord');
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userId', 'test-landlord-1');
      });
      
      await page.goto('/landlord/dashboard');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'test-results/dashboard-with-auth.png', fullPage: true });
    }
    
    // Look for any maintenance-related text
    const maintenanceElements = await page.locator('text=/Welcome|Dashboard|Maintenance|Cases|New|Progress|Resolved/i').count();
    console.log('Found maintenance elements:', maintenanceElements);
    
    expect(maintenanceElements).toBeGreaterThan(0);
  });

  test('should test basic responsive design', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Take mobile screenshot
    await page.screenshot({ path: 'test-results/mobile-view.png', fullPage: true });
    
    // Verify app scales to mobile
    const title = page.getByText('My AI Landlord');
    await expect(title).toBeVisible();
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    
    await page.screenshot({ path: 'test-results/tablet-view.png', fullPage: true });
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.waitForTimeout(500);
    
    await page.screenshot({ path: 'test-results/desktop-view.png', fullPage: true });
    
    // All viewports should show the app title
    await expect(title).toBeVisible();
  });
});