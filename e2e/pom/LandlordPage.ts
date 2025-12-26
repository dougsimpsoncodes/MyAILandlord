import { Page, expect } from '@playwright/test';
import { clickFirst, fillFirst, firstVisible } from '../utils/locators';

export class LandlordPage {
  constructor(private page: Page) {}

  async goToProperties() {
    await clickFirst(this.page, [
      () => this.page.getByTestId('nav-properties'),
      () => this.page.getByRole('tab', { name: /properties/i }),
      () => this.page.getByRole('link', { name: /properties/i }),
      () => this.page.getByRole('link', { name: /manage.*properties/i }),
    ]);
    await expect(this.page).toHaveURL(/properties/i);
  }

  async ensureAtLeastOneProperty() {
    // Check if user is on the property intro/onboarding screen
    const onIntroScreen = await this.page.getByText(/let's add your property/i).isVisible().catch(() => false);

    if (onIntroScreen) {
      // User is on property setup wizard - complete it to create a property
      console.log('User on property setup wizard - creating property through wizard');

      // Click "Start Property Setup"
      await clickFirst(this.page, [
        () => this.page.getByText(/start property setup/i),
        () => this.page.getByRole('button', { name: /start property setup/i }),
      ]);

      // Fill out property basics (should navigate to PropertyBasics screen)
      await this.page.waitForTimeout(2000); // Wait for navigation

      // Fill property name (look for textbox after "Property Name" text)
      const propertyNameInput = this.page.locator('input').filter({ hasText: '' }).first();
      await propertyNameInput.fill('Test Property');

      // Fill street address
      const inputs = await this.page.locator('input[type="text"], input:not([type])').all();
      if (inputs.length >= 2) {
        await inputs[1].fill('123 Test St'); // Street Address
      }
      if (inputs.length >= 3) {
        await inputs[3].fill('Test City'); // City
      }
      if (inputs.length >= 4) {
        await inputs[4].fill('CA'); // State
      }
      if (inputs.length >= 5) {
        await inputs[5].fill('90210'); // Postal Code
      }

      // Click Continue
      await clickFirst(this.page, [
        () => this.page.getByRole('button', { name: /continue/i }),
      ]);

      // Property should now exist - wait for navigation away from wizard
      await this.page.waitForTimeout(3000);
      return;
    }

    await this.goToProperties();

    // Check if any property exists (by testID or by visible property name)
    const propertyByTestId = this.page.locator('[data-testid^="property-card-"]').first();
    const propertyByText = this.page.getByText(/test property|add another property/i).first();

    const hasProperty = (await propertyByTestId.count() > 0) || (await propertyByText.isVisible().catch(() => false));
    if (hasProperty) return;

    // Create a property through the UI, if button exists.
    await clickFirst(this.page, [
      () => this.page.getByTestId('property-add'),
      () => this.page.getByRole('button', { name: /add property|new property|create property/i }),
      () => this.page.getByRole('link',   { name: /add property|new property|create property/i }),
    ]);

    await fillFirst(this.page, [
      () => this.page.getByTestId('property-name'),
      () => this.page.getByLabel(/name/i),
    ], 'Test Property');

    await fillFirst(this.page, [
      () => this.page.getByTestId('property-address'),
      () => this.page.getByLabel(/address/i),
    ], '123 Test St');

    await clickFirst(this.page, [
      () => this.page.getByTestId('property-save'),
      () => this.page.getByRole('button', { name: /save|create/i }),
    ]);

    // Wait until at least one card appears
    await expect(this.page.locator('[data-testid^="property-card-"]').first()).toBeVisible();
  }

  async openFirstProperty() {
    await this.goToProperties();

    // Click on the property card - force click to bypass any overlays (like Google Maps images)
    const propertyCard = await firstVisible(this.page, [
      () => this.page.locator('[data-testid^="property-card-"]').first(),
      () => this.page.getByText(/test property/i).first(),
    ]);

    await propertyCard.first().click({ force: true });

    // Wait for property details to load
    await this.page.waitForTimeout(1000);
  }

  async openInvite() {
    await clickFirst(this.page, [
      () => this.page.getByTestId('invite-tenant'),
      () => this.page.getByRole('button', { name: /invite tenant/i }),
      () => this.page.getByText(/invite tenant/i).first(),
    ]);

    // Wait for invite screen to load
    await this.page.waitForTimeout(1000);

    // Verify we're on invite screen by checking for any success indicator
    const inviteScreen = this.page.getByTestId('invite-screen');
    const inviteHeading = this.page.getByRole('heading', { name: /invite/i });
    const inviteOptions = this.page.getByText(/send via email|get shareable code/i).first();

    await Promise.race([
      expect(inviteScreen).toBeVisible({ timeout: 5000 }),
      expect(inviteHeading).toBeVisible({ timeout: 5000 }),
      expect(inviteOptions).toBeVisible({ timeout: 5000 }),
    ]);
  }
}
