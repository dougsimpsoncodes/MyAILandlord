import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * PropertyManagementPage - Page Object for the Property Management screen
 *
 * This is the landlord's main hub for managing properties.
 */
export class PropertyManagementPage extends BasePage {
  // Header elements
  readonly pageTitle: Locator;
  readonly backButton: Locator;

  // Property list elements
  readonly propertyCards: Locator;
  readonly emptyStateMessage: Locator;

  // Action buttons
  readonly addPropertyButton: Locator;

  // Drafts section
  readonly draftsSection: Locator;
  readonly draftCards: Locator;

  // Property card elements (use .nth() or .first() to select specific ones)
  readonly propertyAddress: Locator;
  readonly propertyStatus: Locator;
  readonly propertyProgress: Locator;

  constructor(page: Page) {
    super(page);

    // Header
    this.pageTitle = page.getByText(/Property Management|My Properties/i);
    this.backButton = page.locator('[data-testid="back-button"], [aria-label="Back"]');

    // Property list
    this.propertyCards = page.locator('[data-testid="property-card"]');
    this.emptyStateMessage = page.getByText(/No properties yet|Add your first property/i);

    // Actions
    this.addPropertyButton = page.getByRole('button', { name: /Add Property|New Property|\+/i });

    // Drafts
    this.draftsSection = page.locator('[data-testid="drafts-section"]');
    this.draftCards = page.locator('[data-testid="draft-card"]');

    // Card details
    this.propertyAddress = page.locator('[data-testid="property-address"]');
    this.propertyStatus = page.locator('[data-testid="property-status"]');
    this.propertyProgress = page.locator('[data-testid="property-progress"]');
  }

  async goto(): Promise<void> {
    await this.page.goto('/property-management');
    await this.waitForLoad();
  }

  async isDisplayed(): Promise<boolean> {
    try {
      // Check for either properties or empty state
      const hasTitle = await this.pageTitle.isVisible({ timeout: 5000 });
      const hasAddButton = await this.addPropertyButton.isVisible({ timeout: 1000 }).catch(() => false);
      return hasTitle || hasAddButton;
    } catch {
      return false;
    }
  }

  /**
   * Click Add Property button to start the property creation wizard
   */
  async clickAddProperty(): Promise<void> {
    await this.addPropertyButton.click();
    await this.waitForLoadingComplete();
  }

  /**
   * Get count of existing properties
   */
  async getPropertyCount(): Promise<number> {
    return await this.propertyCards.count();
  }

  /**
   * Get count of draft properties
   */
  async getDraftCount(): Promise<number> {
    return await this.draftCards.count();
  }

  /**
   * Select a property by index (0-based)
   */
  async selectProperty(index: number): Promise<void> {
    await this.propertyCards.nth(index).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Select a draft to resume
   */
  async selectDraft(index: number): Promise<void> {
    await this.draftCards.nth(index).click();
    await this.waitForLoadingComplete();
  }

  /**
   * Get property address text by index
   */
  async getPropertyAddressByIndex(index: number): Promise<string> {
    const card = this.propertyCards.nth(index);
    const address = card.locator('[data-testid="property-address"], .property-address').first();
    return await address.textContent() || '';
  }

  /**
   * Find property card by address text
   */
  getPropertyByAddress(address: string): Locator {
    return this.propertyCards.filter({ hasText: address });
  }

  /**
   * Check if empty state is shown
   */
  async hasEmptyState(): Promise<boolean> {
    return await this.emptyStateMessage.isVisible({ timeout: 3000 }).catch(() => false);
  }

  /**
   * Wait for properties to load
   */
  async waitForPropertiesLoaded(): Promise<void> {
    await this.waitForLoadingComplete();
    // Wait for either properties or empty state
    await expect(
      this.propertyCards.first().or(this.emptyStateMessage)
    ).toBeVisible({ timeout: 10000 });
  }
}
