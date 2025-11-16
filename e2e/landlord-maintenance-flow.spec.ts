import { test, expect } from '@playwright/test';

/**
 * Real maintenance workflow test following the actual app navigation
 */
test.describe('Landlord Maintenance Features', () => {
  
  async function navigateToLandlordDashboard(page: any) {
    // Start from welcome screen
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Click Get Started
    await page.getByText('Get Started').click();
    await page.waitForLoadState('networkidle');
    
    // Select "I'm a Landlord" role
    const landlordCard = page.locator('text=I\'m a Landlord').locator('..');
    await landlordCard.click();
    await page.waitForLoadState('networkidle');
    
    // Look for continue/next button and click it
    const continueButton = page.locator('text=/Continue|Next|Proceed|Get Started/i').first();
    if (await continueButton.isVisible()) {
      await continueButton.click();
      await page.waitForLoadState('networkidle');
    }
    
    // Take screenshot of current state
    await page.screenshot({ path: 'test-results/landlord-flow.png', fullPage: true });
  }

  test('should navigate to landlord role and access features', async ({ page }) => {
    await navigateToLandlordDashboard(page);
    
    // Check current URL and content
    const currentUrl = page.url();
    const pageContent = await page.locator('body').textContent();
    
    console.log('Current URL after landlord selection:', currentUrl);
    console.log('Page content preview:', pageContent?.substring(0, 300));
    
    // Look for landlord-specific features
    const hasLandlordFeatures = await page.locator('text=/Dashboard|Properties|Maintenance|Manage|Cases|Requests/i').count();
    console.log('Found landlord features:', hasLandlordFeatures);
    
    // If we see maintenance-related content, test it
    if (hasLandlordFeatures > 0) {
      // Try to find and click maintenance/dashboard link
      const maintenanceLink = page.locator('text=/Dashboard|Maintenance/i').first();
      if (await maintenanceLink.isVisible()) {
        await maintenanceLink.click();
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'test-results/maintenance-dashboard.png', fullPage: true });
      }
    }
    
    // Verify we have some landlord functionality
    expect(hasLandlordFeatures).toBeGreaterThan(0);
  });

  test('should test maintenance dashboard if accessible', async ({ page }) => {
    await navigateToLandlordDashboard(page);
    
    // Try direct navigation to dashboard
    await page.goto('/landlord/dashboard');
    await page.waitForTimeout(2000);
    
    let dashboardContent = await page.locator('body').textContent();
    console.log('Dashboard attempt 1:', dashboardContent?.substring(0, 200));
    
    // If redirected, try setting auth state
    if (!dashboardContent?.includes('Dashboard') && !dashboardContent?.includes('Maintenance')) {
      await page.evaluate(() => {
        localStorage.setItem('userRole', 'landlord');
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userId', 'test-landlord-1');
      });
      
      await page.reload();
      await page.waitForLoadState('networkidle');
      dashboardContent = await page.locator('body').textContent();
      console.log('Dashboard attempt 2:', dashboardContent?.substring(0, 200));
    }
    
    await page.screenshot({ path: 'test-results/final-dashboard.png', fullPage: true });
    
    // Look for dashboard elements
    const dashboardElements = [
      'Welcome',
      'Dashboard', 
      'Maintenance',
      'Cases',
      'New',
      'Progress',
      'Resolved'
    ];
    
    let foundElements = 0;
    for (const element of dashboardElements) {
      const count = await page.locator(`text=${element}`).count();
      if (count > 0) {
        foundElements++;
        console.log(`Found dashboard element: ${element}`);
      }
    }
    
    console.log(`Total dashboard elements found: ${foundElements}`);
    
    // At least some dashboard-like content should be present
    expect(foundElements).toBeGreaterThan(0);
  });

  test('should test responsive design across viewports', async ({ page }) => {
    const viewports = [
      { width: 390, height: 844, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1200, height: 800, name: 'desktop' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      // Take screenshot for each viewport
      await page.screenshot({ 
        path: `test-results/responsive-${viewport.name}.png`, 
        fullPage: true 
      });
      
      // Verify core elements are visible
      await expect(page.getByText('My AI Landlord')).toBeVisible();
      await expect(page.getByText('Get Started')).toBeVisible();
      
      // Test navigation on each viewport
      await page.getByText('Get Started').click();
      await page.waitForLoadState('networkidle');
      
      // Take screenshot of role selection on each viewport
      await page.screenshot({ 
        path: `test-results/role-selection-${viewport.name}.png`, 
        fullPage: true 
      });
      
      // Verify role selection is visible
      await expect(page.getByText('Who are you?')).toBeVisible();
      await expect(page.getByText('I\'m a Landlord')).toBeVisible();
      
      console.log(`${viewport.name} viewport test completed`);
    }
  });

  test('should test landlord card interaction and features', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.getByText('Get Started').click();
    await page.waitForLoadState('networkidle');
    
    // Test landlord card hover/focus states
    const landlordCard = page.locator('text=I\'m a Landlord').locator('..');
    
    // Check if card is interactive
    await landlordCard.hover();
    await page.waitForTimeout(500);
    
    // Take screenshot of hover state
    await page.screenshot({ path: 'test-results/landlord-card-hover.png', fullPage: true });
    
    // Verify landlord features are described
    await expect(page.getByText('Organized dashboard')).toBeVisible();
    await expect(page.getByText('AI-powered insights')).toBeVisible();
    await expect(page.getByText('Vendor communication')).toBeVisible();
    
    // Click landlord card
    await landlordCard.click();
    await page.waitForLoadState('networkidle');
    
    // Take screenshot after selection
    await page.screenshot({ path: 'test-results/after-landlord-selection.png', fullPage: true });
    
    // Check what happens after selection
    const postSelectionContent = await page.locator('body').textContent();
    console.log('After landlord selection:', postSelectionContent?.substring(0, 300));
    
    // Should either show next step or redirect to auth/dashboard
    const hasNextStep = await page.locator('text=/Continue|Next|Sign|Login|Dashboard/i').count();
    expect(hasNextStep).toBeGreaterThan(0);
  });
});