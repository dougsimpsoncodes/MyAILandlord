import { Page, Locator, expect } from '@playwright/test';

/**
 * BasePage - Foundation for all Page Object Models
 *
 * Implements common patterns and utilities shared across all pages.
 * Follows Playwright best practices from https://playwright.dev/docs/pom
 */
export abstract class BasePage {
  readonly page: Page;

  // Common loading indicators across the app
  readonly loadingSpinner: Locator;
  readonly loadingOverlay: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loadingSpinner = page.locator('[data-testid="loading-spinner"], [role="progressbar"], .loading-spinner');
    this.loadingOverlay = page.locator('[data-testid="loading-overlay"], .loading-overlay');
  }

  /**
   * Navigate to this page's URL
   * Subclasses should override to provide specific paths
   */
  abstract goto(): Promise<void>;

  /**
   * Wait for the page to be fully loaded
   * Subclasses can override for specific loading criteria
   */
  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    await this.waitForLoadingComplete();
  }

  /**
   * Wait for all loading indicators to disappear
   */
  async waitForLoadingComplete(timeout = 10000): Promise<void> {
    try {
      // Wait for loading spinner to disappear if visible
      if (await this.loadingSpinner.isVisible({ timeout: 1000 }).catch(() => false)) {
        await this.loadingSpinner.waitFor({ state: 'hidden', timeout });
      }

      // Wait for loading overlay to disappear if visible
      if (await this.loadingOverlay.isVisible({ timeout: 500 }).catch(() => false)) {
        await this.loadingOverlay.waitFor({ state: 'hidden', timeout });
      }
    } catch {
      // Ignore timeout - loading may have completed before we checked
    }
  }

  /**
   * Check if we're on the expected page
   * Subclasses should override with specific checks
   */
  abstract isDisplayed(): Promise<boolean>;

  /**
   * Take a screenshot of the current page state
   */
  async screenshot(name: string): Promise<Buffer> {
    return await this.page.screenshot({
      path: `e2e/screenshots/${name}.png`,
      fullPage: true,
    });
  }

  /**
   * Get current URL
   */
  getUrl(): string {
    return this.page.url();
  }

  /**
   * Helper to find React Native Web elements by testID
   */
  getByTestId(testId: string): Locator {
    return this.page.locator(`[data-testid="${testId}"]`);
  }

  /**
   * Helper for role-based locators (preferred over CSS)
   */
  getByRole(role: string, options?: { name?: string | RegExp; exact?: boolean }): Locator {
    return this.page.getByRole(role as any, options);
  }

  /**
   * Helper for text-based locators
   */
  getByText(text: string | RegExp): Locator {
    return this.page.getByText(text);
  }

  /**
   * Wait for an element and return it
   */
  async waitForElement(locator: Locator, timeout = 10000): Promise<Locator> {
    await locator.waitFor({ state: 'visible', timeout });
    return locator;
  }

  /**
   * Scroll element into view and wait for it to be stable
   */
  async scrollToElement(locator: Locator): Promise<void> {
    await locator.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(100); // Brief pause for scroll animation
  }

  /**
   * Fill input with retry logic for React Native Web inputs
   */
  async fillInput(locator: Locator, value: string): Promise<void> {
    await locator.click();
    await locator.clear();
    await locator.fill(value);

    // Verify value was set (React Native Web can be finicky)
    const inputValue = await locator.inputValue();
    if (inputValue !== value) {
      // Retry with type instead of fill
      await locator.clear();
      await locator.type(value, { delay: 50 });
    }
  }

  /**
   * Click with auto-retry for elements that may be temporarily blocked
   */
  async clickWithRetry(locator: Locator, retries = 3): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        await locator.click({ timeout: 5000 });
        return;
      } catch (error) {
        if (i === retries - 1) throw error;
        await this.page.waitForTimeout(500);
      }
    }
  }
}
