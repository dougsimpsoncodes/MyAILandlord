import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * AddPropertyPage - Page Object for the Add Property screen (Step 1 of 8)
 *
 * Handles property address entry and initial setup.
 */
export class AddPropertyPage extends BasePage {
  // Form inputs
  readonly addressInput: Locator;
  readonly address2Input: Locator;
  readonly cityInput: Locator;
  readonly stateSelect: Locator;
  readonly zipCodeInput: Locator;

  // Property type selection
  readonly singleFamilyOption: Locator;
  readonly multiUnitOption: Locator;
  readonly unitCountInput: Locator;

  // Progress indicator
  readonly progressBar: Locator;
  readonly progressText: Locator;

  // Actions
  readonly continueButton: Locator;
  readonly backButton: Locator;
  readonly saveDraftButton: Locator;

  // Validation messages
  readonly errorMessages: Locator;

  constructor(page: Page) {
    super(page);

    // Address form
    this.addressInput = page.locator(
      'input[placeholder*="street" i], input[name*="address" i], [data-testid="address-input"]'
    ).first();
    this.address2Input = page.locator(
      'input[placeholder*="apt" i], input[placeholder*="unit" i], input[placeholder*="suite" i]'
    ).first();
    this.cityInput = page.locator(
      'input[placeholder*="city" i], input[name*="city" i], [data-testid="city-input"]'
    ).first();
    this.stateSelect = page.locator(
      'select[name*="state" i], [data-testid="state-select"]'
    ).first();
    this.zipCodeInput = page.locator(
      'input[placeholder*="zip" i], input[name*="zip" i], [data-testid="zip-input"]'
    ).first();

    // Property type
    this.singleFamilyOption = page.getByText(/single family|single-family/i);
    this.multiUnitOption = page.getByText(/multi.?unit|apartment|duplex|triplex/i);
    this.unitCountInput = page.locator('input[name*="unit" i], [data-testid="unit-count"]').first();

    // Progress
    this.progressBar = page.locator('[role="progressbar"], [data-testid="progress-bar"]');
    this.progressText = page.getByText(/step \d|% complete|\d of \d/i);

    // Actions
    this.continueButton = page.getByRole('button', { name: /continue|next|save/i });
    this.backButton = page.locator('[data-testid="back-button"], [aria-label="Back"]');
    this.saveDraftButton = page.getByRole('button', { name: /save draft|save for later/i });

    // Validation
    this.errorMessages = page.locator('[role="alert"], .error-message, [data-testid*="error"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/add-property');
    await this.waitForLoad();
  }

  async isDisplayed(): Promise<boolean> {
    try {
      return await this.addressInput.isVisible({ timeout: 5000 });
    } catch {
      return false;
    }
  }

  /**
   * Fill the complete address form
   */
  async fillAddress(data: {
    street: string;
    apt?: string;
    city: string;
    state: string;
    zip: string;
  }): Promise<void> {
    await this.fillInput(this.addressInput, data.street);

    if (data.apt) {
      await this.fillInput(this.address2Input, data.apt);
    }

    await this.fillInput(this.cityInput, data.city);

    // Handle state select
    if (await this.stateSelect.evaluate(el => el.tagName) === 'SELECT') {
      await this.stateSelect.selectOption(data.state);
    } else {
      await this.fillInput(this.stateSelect, data.state);
    }

    await this.fillInput(this.zipCodeInput, data.zip);
  }

  /**
   * Select property type
   */
  async selectPropertyType(type: 'single-family' | 'multi-unit', unitCount?: number): Promise<void> {
    if (type === 'single-family') {
      await this.singleFamilyOption.click();
    } else {
      await this.multiUnitOption.click();
      if (unitCount && await this.unitCountInput.isVisible()) {
        await this.fillInput(this.unitCountInput, String(unitCount));
      }
    }
  }

  /**
   * Click Continue to proceed to next step
   */
  async clickContinue(): Promise<void> {
    await this.continueButton.click();
    await this.waitForLoadingComplete();
  }

  /**
   * Save current progress as draft
   */
  async saveDraft(): Promise<void> {
    if (await this.saveDraftButton.isVisible()) {
      await this.saveDraftButton.click();
      await this.waitForLoadingComplete();
    }
  }

  /**
   * Check if there are validation errors
   */
  async hasValidationErrors(): Promise<boolean> {
    return await this.errorMessages.isVisible({ timeout: 1000 }).catch(() => false);
  }

  /**
   * Get validation error text
   */
  async getValidationErrors(): Promise<string[]> {
    const errors: string[] = [];
    const count = await this.errorMessages.count();
    for (let i = 0; i < count; i++) {
      const text = await this.errorMessages.nth(i).textContent();
      if (text) errors.push(text);
    }
    return errors;
  }

  /**
   * Get current progress percentage
   */
  async getProgressPercentage(): Promise<number> {
    const text = await this.progressText.textContent();
    if (!text) return 0;

    const match = text.match(/(\d+)%/);
    return match ? parseInt(match[1], 10) : 0;
  }
}
