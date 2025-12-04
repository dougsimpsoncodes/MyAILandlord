import { test, expect } from '@playwright/test';

/**
 * Test suite for API integration and data flow in maintenance features
 * Tests API endpoints, data persistence, and integration with Supabase
 *
 * SKIP: These tests require specific routes (/landlord/dashboard, /landlord/case-detail)
 * and mock API routes that don't match the actual application routes.
 * Enable when API testing infrastructure is implemented.
 */
test.describe.skip('Maintenance API Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication state
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await page.evaluate(() => {
      localStorage.setItem('userRole', 'landlord');
      localStorage.setItem('isAuthenticated', 'true');
    });
  });

  test('should fetch maintenance requests from API successfully', async ({ page }) => {
    // Mock successful API response
    const mockMaintenanceRequests = [
      {
        id: 'req_1',
        issue_type: 'plumbing',
        description: 'Kitchen faucet leaking',
        area: 'kitchen',
        priority: 'medium',
        status: 'new',
        created_at: '2025-01-15T10:00:00Z',
        estimated_cost: 150,
        images: ['image1.jpg', 'image2.jpg'],
        profiles: { name: 'John Doe' }
      },
      {
        id: 'req_2',
        issue_type: 'electrical',
        description: 'Light switch not working',
        area: 'bedroom',
        priority: 'low',
        status: 'in_progress',
        created_at: '2025-01-14T15:30:00Z',
        estimated_cost: 75,
        images: ['image3.jpg'],
        profiles: { name: 'Jane Smith' }
      }
    ];

    await page.route('**/api/maintenance-requests', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMaintenanceRequests)
      });
    });

    // Navigate to dashboard
    await page.goto('/landlord/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify requests are displayed
    await expect(page.getByText('John Doe')).toBeVisible();
    await expect(page.getByText('Jane Smith')).toBeVisible();
    await expect(page.getByText('Kitchen faucet leaking')).toBeVisible();
    await expect(page.getByText('Light switch not working')).toBeVisible();

    // Verify transformed data is correct
    await expect(page.getByText('Plumbing')).toBeVisible(); // Capitalized
    await expect(page.getByText('Electrical')).toBeVisible(); // Capitalized
    await expect(page.getByText('$150')).toBeVisible();
    await expect(page.getByText('$75')).toBeVisible();
  });

  test('should handle API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/maintenance-requests', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });

    // Navigate to dashboard
    await page.goto('/landlord/dashboard');
    await page.waitForLoadState('networkidle');

    // Should handle error gracefully
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Failed to load cases');
      await dialog.accept();
    });
  });

  test('should handle authentication errors', async ({ page }) => {
    // Mock authentication error
    await page.route('**/api/maintenance-requests', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' })
      });
    });

    // Navigate to dashboard
    await page.goto('/landlord/dashboard');
    await page.waitForLoadState('networkidle');

    // Should redirect to login or show auth error
    const isLoginPage = page.url().includes('/login') || page.url().includes('/auth');
    const hasAuthError = await page.locator('[data-testid="auth-error"]').isVisible().catch(() => false);
    
    expect(isLoginPage || hasAuthError).toBeTruthy();
  });

  test('should send case status updates to API', async ({ page }) => {
    // Mock initial case data
    await page.route('**/api/cases/test-case-1', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-case-1',
          tenantName: 'Test Tenant',
          status: 'new',
          issueType: 'Plumbing',
          description: 'Test issue'
        })
      });
    });

    // Mock status update API
    let updateCalled = false;
    await page.route('**/api/cases/test-case-1/status', async route => {
      updateCalled = true;
      expect(route.request().method()).toBe('PUT');
      const requestBody = await route.request().postDataJSON();
      expect(requestBody.status).toBe('resolved');
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      });
    });

    // Navigate to case detail
    await page.goto('/landlord/case-detail/test-case-1');
    await page.waitForLoadState('networkidle');

    // Mark case as resolved
    page.once('dialog', async dialog => {
      await dialog.accept(); // Confirm resolution
    });
    
    page.once('dialog', async dialog => {
      await dialog.accept(); // Accept success message
    });

    await page.locator('.primaryButton').click();
    await page.waitForTimeout(1000);

    // Verify API was called
    expect(updateCalled).toBeTruthy();
  });

  test('should send vendor email through API', async ({ page }) => {
    // Mock case data
    await page.route('**/api/cases/test-case-1', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-case-1',
          tenantName: 'Test Tenant',
          issueType: 'Plumbing'
        })
      });
    });

    // Mock vendor email API
    let emailSent = false;
    await page.route('**/api/send-to-vendor', async route => {
      emailSent = true;
      expect(route.request().method()).toBe('POST');
      const requestBody = await route.request().postDataJSON();
      
      expect(requestBody.caseId).toBe('test-case-1');
      expect(requestBody.vendorId).toBeTruthy();
      expect(requestBody.emailContent).toBeTruthy();
      expect(requestBody.options).toBeTruthy();
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, messageId: 'msg_123' })
      });
    });

    // Navigate to send to vendor screen
    await page.goto('/landlord/send-to-vendor/test-case-1');
    await page.waitForLoadState('networkidle');

    // Select vendor and send
    const vendorCards = page.locator('.vendorCard');
    if (await vendorCards.count() > 0) {
      await vendorCards.first().click();
      
      // Handle success dialog
      page.once('dialog', async dialog => {
        await dialog.accept();
      });
      
      await page.locator('.sendButton').click();
      await page.waitForTimeout(1000);

      // Verify email API was called
      expect(emailSent).toBeTruthy();
    }
  });

  test('should handle data transformation correctly', async ({ page }) => {
    // Mock API response with various data formats
    const mockResponse = [
      {
        id: 'req_1',
        issue_type: 'hvac',
        description: 'Air conditioning not working',
        area: 'living room',
        priority: 'high',
        status: 'new',
        created_at: '2025-01-15T08:30:00Z',
        estimated_cost: null,
        images: [],
        profiles: null
      }
    ];

    await page.route('**/api/maintenance-requests', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockResponse)
      });
    });

    await page.goto('/landlord/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify data transformation
    await expect(page.getByText('Hvac')).toBeVisible(); // Capitalized
    await expect(page.getByText('Very urgent')).toBeVisible(); // Priority mapped
    await expect(page.getByText('Tenant User')).toBeVisible(); // Default tenant name
    await expect(page.getByText('TBD')).toBeVisible(); // Default cost
    await expect(page.getByText('0 photos')).toBeVisible(); // No images
  });

  test('should handle pagination or large datasets', async ({ page }) => {
    // Mock large dataset
    const largeMockResponse = Array.from({ length: 50 }, (_, i) => ({
      id: `req_${i + 1}`,
      issue_type: 'maintenance',
      description: `Issue ${i + 1}`,
      area: 'various',
      priority: 'medium',
      status: 'new',
      created_at: new Date().toISOString(),
      estimated_cost: 100,
      images: [],
      profiles: { name: `Tenant ${i + 1}` }
    }));

    await page.route('**/api/maintenance-requests', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(largeMockResponse)
      });
    });

    await page.goto('/landlord/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify performance with large dataset
    const caseCards = page.locator('[data-testid="case-card"]');
    const cardCount = await caseCards.count();
    
    // Should handle large datasets (either through pagination or virtualization)
    expect(cardCount).toBeGreaterThan(0);
    
    // Test scrolling performance
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    
    // Should remain responsive
    await expect(page.getByText('Welcome back!')).toBeVisible();
  });

  test('should validate RLS (Row Level Security) policies', async ({ page }) => {
    // Mock different user contexts
    const landlord1Cases = [
      {
        id: 'req_1',
        issue_type: 'plumbing',
        description: 'Landlord 1 case',
        area: 'kitchen',
        priority: 'medium',
        status: 'new',
        created_at: '2025-01-15T10:00:00Z',
        profiles: { name: 'Tenant A' }
      }
    ];

    await page.route('**/api/maintenance-requests', async route => {
      const authHeader = route.request().headers()['authorization'];
      
      // Verify authorization header is present
      expect(authHeader).toBeTruthy();
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(landlord1Cases)
      });
    });

    await page.goto('/landlord/dashboard');
    await page.waitForLoadState('networkidle');

    // Should only see cases for current landlord
    await expect(page.getByText('Landlord 1 case')).toBeVisible();
  });

  test('should handle real-time updates', async ({ page }) => {
    // Initial data
    const initialCases = [
      {
        id: 'req_1',
        issue_type: 'plumbing',
        description: 'Initial case',
        area: 'kitchen',
        priority: 'medium',
        status: 'new',
        created_at: '2025-01-15T10:00:00Z',
        profiles: { name: 'Test Tenant' }
      }
    ];

    // Updated data with new case
    const updatedCases = [
      ...initialCases,
      {
        id: 'req_2',
        issue_type: 'electrical',
        description: 'New urgent case',
        area: 'bedroom',
        priority: 'high',
        status: 'new',
        created_at: '2025-01-15T11:00:00Z',
        profiles: { name: 'Test Tenant 2' }
      }
    ];

    let callCount = 0;
    await page.route('**/api/maintenance-requests', async route => {
      callCount++;
      const data = callCount === 1 ? initialCases : updatedCases;
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(data)
      });
    });

    await page.goto('/landlord/dashboard');
    await page.waitForLoadState('networkidle');

    // Initial state
    await expect(page.getByText('Initial case')).toBeVisible();
    await expect(page.getByText('New urgent case')).not.toBeVisible();

    // Simulate real-time update (pull-to-refresh or automatic refresh)
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should show updated data
    await expect(page.getByText('Initial case')).toBeVisible();
    await expect(page.getByText('New urgent case')).toBeVisible();
  });

  test('should handle offline scenarios', async ({ page }) => {
    await page.goto('/landlord/dashboard');
    await page.waitForLoadState('networkidle');

    // Simulate network offline
    await page.context().setOffline(true);

    // Try to refresh data
    await page.reload();
    
    // Should handle offline gracefully
    const hasOfflineMessage = await page.locator('[data-testid="offline-indicator"]').isVisible().catch(() => false);
    const hasNetworkError = await page.locator('text=/network/i').isVisible().catch(() => false);
    
    // Should indicate offline state or show cached data
    expect(hasOfflineMessage || hasNetworkError).toBeTruthy();

    // Restore online
    await page.context().setOffline(false);
  });

  test('should validate API request headers and authentication', async ({ page }) => {
    let requestHeaders: Record<string, string> = {};
    
    await page.route('**/api/maintenance-requests', async route => {
      requestHeaders = route.request().headers();
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.goto('/landlord/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify required headers
    expect(requestHeaders['authorization']).toBeTruthy();
    expect(requestHeaders['content-type']).toBeTruthy();
    expect(requestHeaders['user-agent']).toBeTruthy();
  });
});