import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Models for common screens
 * Provides reusable selectors and actions for E2E tests
 */

export class WelcomeScreenPO {
  readonly page: Page;
  readonly getStartedButton: Locator;
  readonly signInLink: Locator;
  readonly title: Locator;

  constructor(page: Page) {
    this.page = page;
    this.getStartedButton = page.locator('text=/Get Started|Sign Up|Create Account/i').first();
    this.signInLink = page.locator('text=/Sign In|Log In|Already have an account/i').first();
    this.title = page.locator('text=/Welcome|My AI Landlord/i').first();
  }

  async navigate() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async clickGetStarted() {
    await this.getStartedButton.click();
  }

  async clickSignIn() {
    await this.signInLink.click();
  }

  async isVisible(): Promise<boolean> {
    return await this.title.isVisible({ timeout: 5000 }).catch(() => false);
  }
}

export class LoginScreenPO {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly googleButton: Locator;
  readonly appleButton: Locator;
  readonly signUpLink: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[name="emailAddress"], input[type="email"], input[placeholder*="email" i]').first();
    this.passwordInput = page.locator('input[name="password"], input[type="password"], input[placeholder*="password" i]').first();
    this.signInButton = page.locator('button:has-text("Sign In"), button:has-text("Log In")').first();
    this.googleButton = page.locator('button:has-text("Google"), button[aria-label*="google" i]').first();
    this.appleButton = page.locator('button:has-text("Apple"), button[aria-label*="apple" i]').first();
    this.signUpLink = page.locator('text=/Don\'t have an account|Sign Up|Create Account/i').first();
    this.errorMessage = page.locator('[role="alert"], .error-message, text=/invalid|incorrect|error/i').first();
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signInButton.click();
  }

  async clickGoogleSignIn() {
    await this.googleButton.click();
  }

  async clickAppleSignIn() {
    await this.appleButton.click();
  }

  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible({ timeout: 3000 }).catch(() => false);
  }
}

export class SignUpScreenPO {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signUpButton: Locator;
  readonly googleButton: Locator;
  readonly appleButton: Locator;
  readonly signInLink: Locator;
  readonly errorMessage: Locator;
  readonly verificationCodeInput: Locator;
  readonly verifyButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input[name="emailAddress"], input[type="email"], input[placeholder*="email" i]').first();
    this.passwordInput = page.locator('input[name="password"], input[type="password"], input[placeholder*="password" i]').first();
    this.signUpButton = page.locator('button:has-text("Create Account"), button:has-text("Sign Up")').first();
    this.googleButton = page.locator('button:has-text("Google"), button[aria-label*="google" i]').first();
    this.appleButton = page.locator('button:has-text("Apple"), button[aria-label*="apple" i]').first();
    this.signInLink = page.locator('text=/Already have an account|Sign In|Log In/i').first();
    this.errorMessage = page.locator('[role="alert"], .error-message').first();
    this.verificationCodeInput = page.locator('input[name="code"], input[placeholder*="code" i], input[placeholder*="verification" i]').first();
    this.verifyButton = page.locator('button:has-text("Verify"), button:has-text("Continue")').first();
  }

  async signUp(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.signUpButton.click();
  }

  async verifyEmail(code: string) {
    await this.verificationCodeInput.fill(code);
    await this.verifyButton.click();
  }

  async hasError(): Promise<boolean> {
    return await this.errorMessage.isVisible({ timeout: 3000 }).catch(() => false);
  }
}

export class RoleSelectScreenPO {
  readonly page: Page;
  readonly tenantCard: Locator;
  readonly landlordCard: Locator;
  readonly title: Locator;

  constructor(page: Page) {
    this.page = page;
    this.tenantCard = page.locator('text=/I\'m a Tenant|Tenant/i, [data-role="tenant"]').first();
    this.landlordCard = page.locator('text=/I\'m a Landlord|Landlord/i, [data-role="landlord"]').first();
    this.title = page.locator('text=/Select your role|Who are you/i').first();
  }

  async selectTenant() {
    await this.tenantCard.click();
  }

  async selectLandlord() {
    await this.landlordCard.click();
  }

  async isVisible(): Promise<boolean> {
    return await this.title.isVisible({ timeout: 5000 }).catch(() => false);
  }
}

export class DashboardPO {
  readonly page: Page;
  readonly title: Locator;
  readonly maintenanceRequests: Locator;
  readonly newRequestButton: Locator;
  readonly profileButton: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.locator('text=/Dashboard|Welcome/i').first();
    this.maintenanceRequests = page.locator('[data-testid*="maintenance"], .maintenance-card');
    this.newRequestButton = page.locator('button:has-text("New Request"), button:has-text("Report Issue")').first();
    this.profileButton = page.locator('[aria-label*="profile" i], button:has-text("Profile")').first();
    this.logoutButton = page.locator('text=/Log Out|Sign Out/i').first();
  }

  async isVisible(): Promise<boolean> {
    return await this.title.isVisible({ timeout: 5000 }).catch(() => false);
  }

  async getMaintenanceRequestCount(): Promise<number> {
    return await this.maintenanceRequests.count();
  }

  async clickNewRequest() {
    await this.newRequestButton.click();
  }

  async logout() {
    // Try to find and click logout button
    if (await this.logoutButton.isVisible({ timeout: 2000 })) {
      await this.logoutButton.click();
      return;
    }

    // Try profile menu
    if (await this.profileButton.isVisible({ timeout: 2000 })) {
      await this.profileButton.click();
      await this.page.waitForTimeout(500);
      await this.logoutButton.click();
    }
  }
}

export class MaintenanceRequestFormPO {
  readonly page: Page;
  readonly issueTypeSelect: Locator;
  readonly descriptionInput: Locator;
  readonly areaSelect: Locator;
  readonly prioritySelect: Locator;
  readonly photoUploadButton: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.issueTypeSelect = page.locator('select[name*="issue"], select[name*="type"], [aria-label*="issue type" i]').first();
    this.descriptionInput = page.locator('textarea[name*="description"], input[name*="description"], [aria-label*="description" i]').first();
    this.areaSelect = page.locator('select[name*="area"], select[name*="location"], [aria-label*="area" i]').first();
    this.prioritySelect = page.locator('select[name*="priority"], [aria-label*="priority" i]').first();
    this.photoUploadButton = page.locator('button:has-text("Upload"), button:has-text("Add Photo"), input[type="file"]').first();
    this.submitButton = page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Create Request")').first();
  }

  async fillForm(data: {
    issueType?: string;
    description: string;
    area?: string;
    priority?: string;
  }) {
    if (data.issueType) {
      await this.issueTypeSelect.selectOption(data.issueType);
    }

    await this.descriptionInput.fill(data.description);

    if (data.area) {
      await this.areaSelect.selectOption(data.area);
    }

    if (data.priority) {
      await this.prioritySelect.selectOption(data.priority);
    }
  }

  async submit() {
    await this.submitButton.click();
  }
}

export class PropertyFormPO {
  readonly page: Page;
  readonly addressInput: Locator;
  readonly cityInput: Locator;
  readonly stateInput: Locator;
  readonly zipInput: Locator;
  readonly unitCountInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.addressInput = page.locator('input[name*="address"], [aria-label*="address" i]').first();
    this.cityInput = page.locator('input[name*="city"], [aria-label*="city" i]').first();
    this.stateInput = page.locator('input[name*="state"], select[name*="state"], [aria-label*="state" i]').first();
    this.zipInput = page.locator('input[name*="zip"], input[name*="postal"], [aria-label*="zip" i]').first();
    this.unitCountInput = page.locator('input[name*="unit"], [aria-label*="unit" i]').first();
    this.submitButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Create Property")').first();
  }

  async fillForm(data: {
    address: string;
    city: string;
    state: string;
    zip: string;
    unitCount?: number;
  }) {
    await this.addressInput.fill(data.address);
    await this.cityInput.fill(data.city);

    if (await this.stateInput.evaluate(el => el.tagName) === 'SELECT') {
      await this.stateInput.selectOption(data.state);
    } else {
      await this.stateInput.fill(data.state);
    }

    await this.zipInput.fill(data.zip);

    if (data.unitCount) {
      await this.unitCountInput.fill(String(data.unitCount));
    }
  }

  async submit() {
    await this.submitButton.click();
  }
}

export class PropertyInvitePO {
  readonly page: Page;
  readonly inviteCodeDisplay: Locator;
  readonly copyButton: Locator;
  readonly shareButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.inviteCodeDisplay = page.locator('[data-testid*="invite-code"], .invite-code, text=/invite code|link/i').first();
    this.copyButton = page.locator('button:has-text("Copy"), button[aria-label*="copy" i]').first();
    this.shareButton = page.locator('button:has-text("Share"), button[aria-label*="share" i]').first();
  }

  async getInviteCode(): Promise<string | null> {
    return await this.inviteCodeDisplay.textContent();
  }

  async copyInviteCode() {
    await this.copyButton.click();
  }
}

/**
 * Helper to wait for navigation and loading
 */
export class NavigationHelper {
  constructor(private page: Page) {}

  async waitForPageLoad(timeout = 10000) {
    await this.page.waitForLoadState('networkidle', { timeout });
  }

  async waitForLoading() {
    // Wait for loading indicators to disappear
    const loadingSelectors = [
      '[data-testid="loading"]',
      '.loading-spinner',
      'text=/Loading/i',
      '[role="progressbar"]'
    ];

    for (const selector of loadingSelectors) {
      const element = this.page.locator(selector);
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        await element.waitFor({ state: 'hidden', timeout: 10000 });
      }
    }
  }

  async navigateAndWait(path: string) {
    await this.page.goto(path);
    await this.waitForPageLoad();
    await this.waitForLoading();
  }
}
