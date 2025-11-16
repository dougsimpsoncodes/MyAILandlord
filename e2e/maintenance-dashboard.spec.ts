import { test, expect } from '@playwright/test';

/**
 * Test suite for Maintenance Dashboard functionality
 * Tests the main landlord dashboard for viewing and managing maintenance requests
 */
test.describe('Maintenance Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app and complete login flow
    await page.goto('/');
    
    // Wait for app to load
    await page.waitForLoadState('networkidle');
    
    // Mock authentication state or complete login flow
    // This will need to be adapted based on your auth setup
    await page.evaluate(() => {
      // Mock logged in landlord user
      localStorage.setItem('userRole', 'landlord');
      localStorage.setItem('isAuthenticated', 'true');
    });
    
    // Navigate to dashboard
    await page.goto('/landlord/dashboard');
  });

  test('should display dashboard header and welcome message', async ({ page }) => {
    // Check for welcome message
    await expect(page.getByText('Welcome back!')).toBeVisible();
    await expect(page.getByText('Maintenance Dashboard')).toBeVisible();
    
    // Check for notification bell
    await expect(page.locator('[data-testid="notification-button"]', {
      hasNotText: 'notifications'
    })).toBeVisible();
  });

  test('should display maintenance request statistics cards', async ({ page }) => {
    // Check for stats cards
    await expect(page.getByText('New Cases')).toBeVisible();
    await expect(page.getByText('In Progress')).toBeVisible();
    await expect(page.getByText('Resolved')).toBeVisible();
    
    // Verify numbers are displayed (should be numeric)
    const newCasesCount = page.locator('text=New Cases').locator('..').locator('text=/\\d+/');
    await expect(newCasesCount).toBeVisible();
    
    const inProgressCount = page.locator('text=In Progress').locator('..').locator('text=/\\d+/');
    await expect(inProgressCount).toBeVisible();
    
    const resolvedCount = page.locator('text=Resolved').locator('..').locator('text=/\\d+/');
    await expect(resolvedCount).toBeVisible();
  });

  test('should display filter buttons with counts', async ({ page }) => {
    // Check filter buttons exist
    const allCasesFilter = page.getByRole('button', { name: /All Cases \\(\\d+\\)/ });
    const newFilter = page.getByRole('button', { name: /New \\(\\d+\\)/ });
    const inProgressFilter = page.getByRole('button', { name: /In Progress \\(\\d+\\)/ });
    const resolvedFilter = page.getByRole('button', { name: /Resolved \\(\\d+\\)/ });
    
    await expect(allCasesFilter).toBeVisible();
    await expect(newFilter).toBeVisible();
    await expect(inProgressFilter).toBeVisible();
    await expect(resolvedFilter).toBeVisible();
    
    // Verify "All Cases" is selected by default
    await expect(allCasesFilter).toHaveClass(/filterButtonActive/);
  });

  test('should filter cases when filter buttons are clicked', async ({ page }) => {
    // Click on "New" filter
    await page.getByRole('button', { name: /New \\(\\d+\\)/ }).click();
    
    // Verify filter is active
    await expect(page.getByRole('button', { name: /New \\(\\d+\\)/ })).toHaveClass(/filterButtonActive/);
    
    // Check that only new cases are shown (if any exist)
    const caseCards = page.locator('[data-testid="case-card"]');
    const caseCount = await caseCards.count();
    
    if (caseCount > 0) {
      // Verify all visible cases have "New" status
      for (let i = 0; i < caseCount; i++) {
        const statusBadge = caseCards.nth(i).locator('.statusBadge');
        await expect(statusBadge).toContainText('New');
      }
    }
  });

  test('should display maintenance case cards with required information', async ({ page }) => {
    // Wait for cases to load
    await page.waitForTimeout(2000);
    
    const caseCards = page.locator('[data-testid="case-card"]');
    const caseCount = await caseCards.count();
    
    if (caseCount > 0) {
      const firstCase = caseCards.first();
      
      // Check required case information
      await expect(firstCase.locator('.tenantName')).toBeVisible();
      await expect(firstCase.locator('.tenantUnit')).toBeVisible();
      await expect(firstCase.locator('.statusBadge')).toBeVisible();
      await expect(firstCase.locator('.urgencyBadge')).toBeVisible();
      await expect(firstCase.locator('.issueType')).toBeVisible();
      await expect(firstCase.locator('.description')).toBeVisible();
      await expect(firstCase.locator('.mediaCount')).toBeVisible();
      await expect(firstCase.locator('.timestamp')).toBeVisible();
      
      // Check action buttons
      await expect(firstCase.getByText('Message')).toBeVisible();
      await expect(firstCase.getByText('Send to Vendor')).toBeVisible();
      await expect(firstCase.getByText('Mark Resolved')).toBeVisible();
    }
  });

  test('should navigate to case detail when case card is clicked', async ({ page }) => {
    // Wait for cases to load
    await page.waitForTimeout(2000);
    
    const caseCards = page.locator('[data-testid="case-card"]');
    const caseCount = await caseCards.count();
    
    if (caseCount > 0) {
      // Click on first case
      await caseCards.first().click();
      
      // Wait for navigation
      await page.waitForLoadState('networkidle');
      
      // Verify we're on case detail page
      await expect(page.url()).toContain('/case-detail');
      
      // Verify case detail page loads
      await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Details' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Media' })).toBeVisible();
    }
  });

  test('should display empty state when no cases exist', async ({ page }) => {
    // Mock empty cases response
    await page.route('**/api/maintenance-requests', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });
    
    // Reload page to get empty data
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Check empty state
    await expect(page.getByText('No Cases Found')).toBeVisible();
    await expect(page.getByText('No maintenance cases have been reported yet.')).toBeVisible();
  });

  test('should support pull-to-refresh functionality', async ({ page }) => {
    // Simulate pull-to-refresh by scrolling to top and triggering refresh
    await page.evaluate(() => {
      window.scrollTo(0, 0);
    });
    
    // Look for refresh control or manually trigger refresh
    const refreshButton = page.locator('[data-testid="refresh-control"]');
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
    } else {
      // Alternative: trigger refresh programmatically
      await page.keyboard.press('F5');
    }
    
    // Wait for loading state
    await page.waitForLoadState('networkidle');
    
    // Verify data reloaded
    await expect(page.getByText('Welcome back!')).toBeVisible();
  });

  test('should display loading state while fetching cases', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/maintenance-requests', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });
    
    // Reload page to trigger loading
    await page.reload();
    
    // Check loading state
    await expect(page.getByText('Loading cases...')).toBeVisible();
    await expect(page.locator('[data-testid="loading-spinner"]')).toBeVisible();
    
    // Wait for loading to complete
    await page.waitForLoadState('networkidle');
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/maintenance-requests', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    // Reload page to trigger error
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should show error alert or message
    // Note: This might be an alert dialog
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Failed to load cases');
      await dialog.accept();
    });
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    
    // Verify mobile layout
    await expect(page.getByText('Welcome back!')).toBeVisible();
    
    // Check that stats cards are stacked properly on mobile
    const statsContainer = page.locator('.statsContainer');
    await expect(statsContainer).toBeVisible();
    
    // Verify horizontal scroll for filters works
    const filtersContainer = page.locator('.filtersContainer');
    await expect(filtersContainer).toBeVisible();
    
    // Test case cards are properly sized for mobile
    const caseCards = page.locator('[data-testid="case-card"]');
    if (await caseCards.count() > 0) {
      const firstCard = caseCards.first();
      const cardWidth = await firstCard.evaluate(el => el.getBoundingClientRect().width);
      expect(cardWidth).toBeLessThan(400); // Should fit mobile screen
    }
  });
});