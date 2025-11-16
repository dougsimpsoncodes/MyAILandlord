import { Page, expect } from '@playwright/test';

/**
 * Helper functions for Playwright tests
 * Provides common utilities for testing maintenance features
 */

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Mock authentication and navigate to landlord dashboard
   */
  async loginAsLandlord() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
    
    await this.page.evaluate(() => {
      localStorage.setItem('userRole', 'landlord');
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('userId', 'test-landlord-1');
    });
  }

  /**
   * Mock successful maintenance requests API response
   */
  async mockMaintenanceRequests(requests: any[] = []) {
    const defaultRequests = [
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
        priority: 'high',
        status: 'in_progress',
        created_at: '2025-01-14T15:30:00Z',
        estimated_cost: 75,
        images: ['image3.jpg'],
        profiles: { name: 'Jane Smith' }
      }
    ];

    await this.page.route('**/api/maintenance-requests', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(requests.length > 0 ? requests : defaultRequests)
      });
    });
  }

  /**
   * Mock case detail API response
   */
  async mockCaseDetail(caseId: string, caseData: any = {}) {
    const defaultCase = {
      id: caseId,
      tenantName: 'Test Tenant',
      tenantUnit: 'Apt 2B',
      tenantPhone: '+1 (555) 123-4567',
      tenantEmail: 'tenant@example.com',
      issueType: 'Plumbing',
      description: 'Kitchen faucet is leaking',
      location: 'Kitchen',
      urgency: 'Moderate',
      status: 'new',
      submittedAt: '2 hours ago',
      mediaUrls: ['photo1.jpg', 'photo2.jpg'],
      aiSummary: 'This appears to be a standard faucet repair issue.',
      estimatedCost: '$150-250',
      preferredTimeSlots: ['Tomorrow 2:00 PM - 6:00 PM'],
      ...caseData
    };

    await this.page.route(`**/api/cases/${caseId}`, async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(defaultCase)
      });
    });
  }

  /**
   * Mock vendor list API response
   */
  async mockVendors(vendors: any[] = []) {
    const defaultVendors = [
      {
        id: '1',
        name: 'Mike\'s Plumbing Services',
        email: 'mike@mikesplumbing.com',
        phone: '+1 (555) 987-6543',
        specialty: ['Plumbing', 'Emergency Repairs'],
        rating: 4.8,
        responseTime: '< 2 hours',
        isPreferred: true,
      },
      {
        id: '2',
        name: 'Quick Fix Maintenance',
        email: 'info@quickfixmaint.com',
        phone: '+1 (555) 456-7890',
        specialty: ['Plumbing', 'Electrical', 'HVAC'],
        rating: 4.6,
        responseTime: '< 4 hours',
        isPreferred: false,
      }
    ];

    await this.page.route('**/api/vendors', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(vendors.length > 0 ? vendors : defaultVendors)
      });
    });
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoading() {
    // Wait for any loading indicators to disappear
    await this.page.waitForLoadState('networkidle');
    
    // Wait for loading spinners to disappear
    const loadingSpinner = this.page.locator('[data-testid="loading-spinner"]');
    if (await loadingSpinner.isVisible()) {
      await loadingSpinner.waitFor({ state: 'hidden', timeout: 10000 });
    }

    // Wait for "Loading..." text to disappear
    const loadingText = this.page.locator('text=Loading');
    if (await loadingText.isVisible()) {
      await loadingText.waitFor({ state: 'hidden', timeout: 10000 });
    }
  }

  /**
   * Check if element is properly styled (has non-default styles)
   */
  async isProperlyStyled(selector: string): Promise<boolean> {
    const element = this.page.locator(selector).first();
    if (!await element.isVisible()) return false;

    const styles = await element.evaluate(el => {
      const computed = window.getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        color: computed.color,
        fontSize: computed.fontSize,
        padding: computed.padding,
        margin: computed.margin
      };
    });

    // Check if element has meaningful styling
    return (
      styles.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
      styles.color !== 'rgb(0, 0, 0)' ||
      parseFloat(styles.fontSize) > 0 ||
      styles.padding !== '0px' ||
      styles.margin !== '0px'
    );
  }

  /**
   * Get element dimensions
   */
  async getElementDimensions(selector: string) {
    const element = this.page.locator(selector).first();
    return await element.evaluate(el => {
      const rect = el.getBoundingClientRect();
      return {
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
        right: rect.right,
        bottom: rect.bottom
      };
    });
  }

  /**
   * Test responsive behavior across viewports
   */
  async testResponsiveLayout(selector: string) {
    const viewports = [
      { width: 390, height: 844, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1200, height: 800, name: 'desktop' }
    ];

    const results: Record<string, any> = {};

    for (const viewport of viewports) {
      await this.page.setViewportSize(viewport);
      await this.page.waitForTimeout(500); // Allow layout to settle

      const element = this.page.locator(selector).first();
      if (await element.isVisible()) {
        results[viewport.name] = await this.getElementDimensions(selector);
      }
    }

    return results;
  }

  /**
   * Simulate slow network conditions
   */
  async simulateSlowNetwork() {
    await this.page.route('**/*', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      await route.continue();
    });
  }

  /**
   * Mock API error responses
   */
  async mockAPIError(endpoint: string, statusCode: number = 500, errorMessage: string = 'Internal Server Error') {
    await this.page.route(`**${endpoint}`, async route => {
      await route.fulfill({
        status: statusCode,
        contentType: 'application/json',
        body: JSON.stringify({ error: errorMessage })
      });
    });
  }

  /**
   * Check accessibility features
   */
  async checkAccessibility(selector?: string) {
    const target = selector ? this.page.locator(selector) : this.page;
    
    // Check for ARIA labels
    const elementsWithAriaLabel = await target.locator('[aria-label]').count();
    
    // Check for proper heading structure
    const headings = await target.locator('h1, h2, h3, h4, h5, h6').count();
    
    // Check for alt text on images
    const images = await target.locator('img').count();
    const imagesWithAlt = await target.locator('img[alt]').count();
    
    // Check for keyboard focusable elements
    const focusableElements = await target.locator('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])').count();
    
    return {
      hasAriaLabels: elementsWithAriaLabel > 0,
      hasHeadings: headings > 0,
      imagesHaveAlt: images === 0 || imagesWithAlt === images,
      hasFocusableElements: focusableElements > 0
    };
  }

  /**
   * Take screenshot for visual regression testing
   */
  async takeScreenshot(name: string, options?: any) {
    await this.page.screenshot({
      path: `test-results/screenshots/${name}.png`,
      fullPage: true,
      ...options
    });
  }

  /**
   * Test form validation
   */
  async testFormValidation(formSelector: string, requiredFields: string[]) {
    const form = this.page.locator(formSelector);
    
    // Try to submit empty form
    const submitButton = form.locator('button[type="submit"], .submitButton, .sendButton').first();
    await submitButton.click();
    
    // Check for validation messages
    for (const field of requiredFields) {
      const fieldElement = form.locator(field);
      const hasValidationMessage = await fieldElement.evaluate(el => {
        return (el as HTMLInputElement).validationMessage?.length > 0;
      });
      
      if (!hasValidationMessage) {
        // Check for custom validation messages
        const validationText = form.locator(`text=/required|error|invalid/i`);
        await expect(validationText).toBeVisible();
      }
    }
  }
}

/**
 * Data factories for testing
 */
export class TestDataFactory {
  static createMaintenanceRequest(overrides: any = {}) {
    return {
      id: `req_${Math.random().toString(36).substr(2, 9)}`,
      issue_type: 'plumbing',
      description: 'Test maintenance request',
      area: 'kitchen',
      priority: 'medium',
      status: 'new',
      created_at: new Date().toISOString(),
      estimated_cost: 100,
      images: [],
      profiles: { name: 'Test Tenant' },
      ...overrides
    };
  }

  static createVendor(overrides: any = {}) {
    return {
      id: Math.random().toString(36).substr(2, 9),
      name: 'Test Vendor Services',
      email: 'vendor@example.com',
      phone: '+1 (555) 123-4567',
      specialty: ['General Maintenance'],
      rating: 4.5,
      responseTime: '< 4 hours',
      isPreferred: false,
      ...overrides
    };
  }

  static createCaseDetail(overrides: any = {}) {
    return {
      id: `case_${Math.random().toString(36).substr(2, 9)}`,
      tenantName: 'Test Tenant',
      tenantUnit: 'Apt 1A',
      tenantPhone: '+1 (555) 123-4567',
      tenantEmail: 'tenant@example.com',
      issueType: 'Plumbing',
      description: 'Test issue description',
      location: 'Kitchen',
      urgency: 'Moderate',
      status: 'new',
      submittedAt: '1 hour ago',
      mediaUrls: [],
      aiSummary: 'Test AI summary',
      estimatedCost: '$100-200',
      preferredTimeSlots: ['Today 2:00 PM - 6:00 PM'],
      ...overrides
    };
  }
}