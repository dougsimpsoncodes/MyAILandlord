import { test, expect } from '@playwright/test';

/**
 * Test suite for Case Detail Screen functionality
 * Tests detailed view of maintenance requests including tabs, actions, and data display
 */
test.describe('Case Detail Screen', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app and complete login flow
    await page.goto('/');
    
    // Wait for app to load
    await page.waitForLoadState('networkidle');
    
    // Mock authentication state
    await page.evaluate(() => {
      localStorage.setItem('userRole', 'landlord');
      localStorage.setItem('isAuthenticated', 'true');
    });
    
    // Navigate to a specific case detail page
    // This assumes we have a case with ID 'test-case-1'
    await page.goto('/landlord/case-detail/test-case-1');
    await page.waitForLoadState('networkidle');
  });

  test('should display case header with tenant information and status', async ({ page }) => {
    // Check tenant information in header
    await expect(page.locator('.tenantName')).toBeVisible();
    await expect(page.locator('.tenantUnit')).toBeVisible();
    
    // Check status badges
    await expect(page.locator('.statusBadge')).toBeVisible();
    await expect(page.locator('.urgencyBadge')).toBeVisible();
    
    // Check issue description
    await expect(page.locator('.issueDescription')).toBeVisible();
  });

  test('should display navigation tabs (Overview, Details, Media)', async ({ page }) => {
    // Check all tabs are present
    await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Details' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Media' })).toBeVisible();
    
    // Verify Overview tab is active by default
    await expect(page.getByRole('tab', { name: 'Overview' })).toHaveClass(/tabActive/);
  });

  test('should display Overview tab content correctly', async ({ page }) => {
    // Ensure Overview tab is selected
    await page.getByRole('tab', { name: 'Overview' }).click();
    
    // Check AI Analysis section
    await expect(page.getByText('AI Analysis')).toBeVisible();
    await expect(page.getByText('AI Summary')).toBeVisible();
    await expect(page.locator('.aiText')).toBeVisible();
    await expect(page.getByText('Estimated Cost:')).toBeVisible();
    await expect(page.locator('.costValue')).toBeVisible();
    
    // Check Preferred Time Slots section
    await expect(page.getByText('Preferred Time Slots')).toBeVisible();
    const timeSlots = page.locator('.timeSlot');
    await expect(timeSlots.first()).toBeVisible();
    
    // Check Quick Actions section
    await expect(page.getByText('Quick Actions')).toBeVisible();
    await expect(page.getByText('Call Tenant')).toBeVisible();
    await expect(page.getByText('Email Tenant')).toBeVisible();
    await expect(page.getByText('Send to Vendor')).toBeVisible();
  });

  test('should display Details tab content correctly', async ({ page }) => {
    // Click Details tab
    await page.getByRole('tab', { name: 'Details' }).click();
    
    // Wait for tab content to load
    await page.waitForTimeout(500);
    
    // Check Issue Details section
    await expect(page.getByText('Issue Details')).toBeVisible();
    await expect(page.getByText('Issue Type')).toBeVisible();
    await expect(page.getByText('Location')).toBeVisible();
    await expect(page.getByText('Duration')).toBeVisible();
    await expect(page.getByText('Timing')).toBeVisible();
    await expect(page.getByText('Submitted')).toBeVisible();
    
    // Check Q&A Log section
    await expect(page.getByText('Q&A Log')).toBeVisible();
    const conversationItems = page.locator('.conversationItem');
    if (await conversationItems.count() > 0) {
      await expect(conversationItems.first().locator('.questionText')).toBeVisible();
      await expect(conversationItems.first().locator('.answerText')).toBeVisible();
    }
  });

  test('should display Media tab content correctly', async ({ page }) => {
    // Click Media tab
    await page.getByRole('tab', { name: 'Media' }).click();
    
    // Wait for tab content to load
    await page.waitForTimeout(500);
    
    // Check media section
    await expect(page.getByText('Attached Media')).toBeVisible();
    
    // Check for media grid
    const mediaGrid = page.locator('.mediaGrid');
    await expect(mediaGrid).toBeVisible();
    
    // Check for media items (photos)
    const mediaItems = page.locator('.mediaItem');
    if (await mediaItems.count() > 0) {
      await expect(mediaItems.first()).toBeVisible();
      await expect(mediaItems.first().locator('.mediaPlaceholder')).toBeVisible();
    }
    
    // Check media note
    await expect(page.getByText(/Tap any image to view full size/)).toBeVisible();
  });

  test('should allow tab navigation and maintain state', async ({ page }) => {
    // Start on Overview tab
    await expect(page.getByRole('tab', { name: 'Overview' })).toHaveClass(/tabActive/);
    
    // Switch to Details tab
    await page.getByRole('tab', { name: 'Details' }).click();
    await expect(page.getByRole('tab', { name: 'Details' })).toHaveClass(/tabActive/);
    await expect(page.getByRole('tab', { name: 'Overview' })).not.toHaveClass(/tabActive/);
    
    // Switch to Media tab
    await page.getByRole('tab', { name: 'Media' }).click();
    await expect(page.getByRole('tab', { name: 'Media' })).toHaveClass(/tabActive/);
    await expect(page.getByRole('tab', { name: 'Details' })).not.toHaveClass(/tabActive/);
    
    // Go back to Overview
    await page.getByRole('tab', { name: 'Overview' }).click();
    await expect(page.getByRole('tab', { name: 'Overview' })).toHaveClass(/tabActive/);
  });

  test('should handle Quick Actions correctly', async ({ page }) => {
    // Ensure Overview tab is active
    await page.getByRole('tab', { name: 'Overview' }).click();
    
    // Test Call Tenant action
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Calling');
      await dialog.accept();
    });
    await page.getByText('Call Tenant').click();
    
    // Test Email Tenant action
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Opening email to');
      await dialog.accept();
    });
    await page.getByText('Email Tenant').click();
    
    // Test Send to Vendor action (should navigate)
    await page.getByText('Send to Vendor').click();
    await page.waitForLoadState('networkidle');
    
    // Should navigate to Send to Vendor screen
    await expect(page.url()).toContain('/send-to-vendor');
  });

  test('should handle footer action buttons', async ({ page }) => {
    // Check footer buttons exist
    await expect(page.locator('.secondaryButton')).toBeVisible();
    await expect(page.locator('.primaryButton')).toBeVisible();
    
    // Test Send to Vendor button
    await page.locator('.secondaryButton').click();
    await page.waitForLoadState('networkidle');
    await expect(page.url()).toContain('/send-to-vendor');
    
    // Go back to case detail
    await page.goBack();
    await page.waitForLoadState('networkidle');
    
    // Test Mark Resolved button
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Are you sure this issue has been resolved?');
      await dialog.dismiss(); // Cancel the action
    });
    await page.locator('.primaryButton').click();
  });

  test('should handle Mark Resolved workflow', async ({ page }) => {
    // Click Mark Resolved button
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Are you sure this issue has been resolved?');
      await dialog.accept(); // Confirm resolution
    });
    
    // Handle success dialog
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Case marked as resolved!');
      await dialog.accept();
    });
    
    await page.locator('.primaryButton').click();
    
    // Should navigate back to dashboard
    await page.waitForLoadState('networkidle');
    await expect(page.url()).toContain('/dashboard');
  });

  test('should display status colors correctly', async ({ page }) => {
    // Check status badge has appropriate color class
    const statusBadge = page.locator('.statusBadge');
    await expect(statusBadge).toBeVisible();
    
    // Check urgency badge has appropriate color
    const urgencyBadge = page.locator('.urgencyBadge');
    await expect(urgencyBadge).toBeVisible();
    
    // Verify status colors by checking computed styles
    const statusColor = await statusBadge.evaluate(el => 
      window.getComputedStyle(el).backgroundColor
    );
    expect(statusColor).toBeTruthy();
    
    const urgencyColor = await urgencyBadge.evaluate(el => 
      window.getComputedStyle(el).borderColor
    );
    expect(urgencyColor).toBeTruthy();
  });

  test('should handle media item clicks', async ({ page }) => {
    // Navigate to Media tab
    await page.getByRole('tab', { name: 'Media' }).click();
    await page.waitForTimeout(500);
    
    const mediaItems = page.locator('.mediaItem');
    const mediaCount = await mediaItems.count();
    
    if (mediaCount > 0) {
      // Click on first media item
      await mediaItems.first().click();
      
      // Should open media in full-screen or modal view
      // This depends on implementation - might open modal or new page
      await page.waitForTimeout(1000);
      
      // Check if modal opened or page changed
      const isModal = await page.locator('[data-testid="media-modal"]').isVisible().catch(() => false);
      const urlChanged = !page.url().includes('/case-detail');
      
      expect(isModal || urlChanged).toBeTruthy();
    }
  });

  test('should be responsive on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 390, height: 844 });
    
    // Verify mobile layout
    await expect(page.locator('.tenantName')).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Overview' })).toBeVisible();
    
    // Check that tabs are properly sized for mobile
    const tabsContainer = page.locator('.tabsContainer');
    await expect(tabsContainer).toBeVisible();
    
    // Verify footer buttons stack properly on mobile
    const footer = page.locator('.footer');
    await expect(footer).toBeVisible();
    
    // Test tab switching on mobile
    await page.getByRole('tab', { name: 'Details' }).click();
    await expect(page.getByRole('tab', { name: 'Details' })).toHaveClass(/tabActive/);
  });

  test('should handle loading states', async ({ page }) => {
    // Mock slow API response for case details
    await page.route('**/api/cases/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-case-1',
          tenantName: 'Test Tenant',
          issueType: 'Plumbing',
          description: 'Test issue description'
        })
      });
    });
    
    // Reload page to trigger loading
    await page.reload();
    
    // Should show loading state
    const loadingElements = await page.locator('[data-testid="loading"]').count();
    if (loadingElements > 0) {
      await expect(page.locator('[data-testid="loading"]')).toBeVisible();
    }
    
    // Wait for loading to complete
    await page.waitForLoadState('networkidle');
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Mock API error for case details
    await page.route('**/api/cases/*', async route => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Case not found' })
      });
    });
    
    // Reload page to trigger error
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Should show error state or redirect
    const errorElements = await page.locator('[data-testid="error"]').count();
    const isOnErrorPage = page.url().includes('/error') || page.url().includes('/404');
    
    expect(errorElements > 0 || isOnErrorPage).toBeTruthy();
  });
});