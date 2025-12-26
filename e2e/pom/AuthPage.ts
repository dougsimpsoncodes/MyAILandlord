import { Page, expect } from '@playwright/test';
import { clickFirst, fillFirst } from '../utils/locators';

export class AuthPage {
  constructor(private page: Page) {}

  async gotoLogin() {
    await this.page.goto('/login');
    await expect(this.page).toHaveURL(/\/login/i);
  }

  async gotoSignup() {
    await this.page.goto('/signup');
    await expect(this.page).toHaveURL(/\/signup/i);
  }

  async login(email: string, password: string) {
    await this.gotoLogin();
    await fillFirst(this.page, [
      () => this.page.getByTestId('auth-email'),
      () => this.page.getByLabel(/email/i),
      () => this.page.locator('input[name="email"]'),
      () => this.page.getByRole('textbox', { name: /email/i }),
    ], email);

    await fillFirst(this.page, [
      () => this.page.getByTestId('auth-password'),
      () => this.page.getByLabel(/password/i),
      () => this.page.locator('input[type="password"]'),
    ], password);

    await clickFirst(this.page, [
      () => this.page.getByTestId('auth-submit'),
      () => this.page.getByRole('button', { name: /sign in|log in/i }),
    ]);

    // Consider login successful when we leave auth pages or see any app nav
    await Promise.race([
      this.page.getByTestId('nav-dashboard').first().waitFor({ state: 'visible', timeout: 3000 }).catch(() => {}),
      this.page.getByTestId('nav-properties').first().waitFor({ state: 'visible', timeout: 3000 }).catch(() => {}),
      this.page.waitForURL(url => !/\/(login|signup)(\b|$)/i.test(url.toString()), { timeout: 8000 }).catch(() => {}),
    ]);
  }

  async signup(email: string, password: string) {
    await this.gotoSignup();

    await fillFirst(this.page, [
      () => this.page.getByTestId('auth-email'),
      () => this.page.getByLabel(/email/i),
      () => this.page.locator('input[name="email"]'),
    ], email);

    await fillFirst(this.page, [
      () => this.page.getByTestId('auth-password'),
      () => this.page.getByLabel(/password/i),
      () => this.page.locator('input[type="password"]'),
    ], password);

    await clickFirst(this.page, [
      () => this.page.getByTestId('auth-submit'),
      () => this.page.getByRole('button', { name: /sign up|create account/i }),
    ]);

    await Promise.race([
      this.page.getByTestId('nav-dashboard').first().waitFor({ state: 'visible', timeout: 3000 }).catch(() => {}),
      this.page.getByTestId('nav-properties').first().waitFor({ state: 'visible', timeout: 3000 }).catch(() => {}),
      this.page.waitForURL(url => !/\/(login|signup)(\b|$)/i.test(url.toString()), { timeout: 8000 }).catch(() => {}),
    ]);
  }

  async logout() {
    // Navigate to Profile tab if not already there
    await clickFirst(this.page, [
      () => this.page.getByRole('tab', { name: /profile/i }),
      () => this.page.getByTestId('nav-profile'),
      () => this.page.getByRole('button', { name: /account|profile|user/i }),
    ]);

    // Wait for profile screen to load
    await this.page.waitForTimeout(1000);

    // Click logout button
    await clickFirst(this.page, [
      () => this.page.getByTestId('nav-logout'),
      () => this.page.getByRole('menuitem', { name: /log out|sign out/i }),
      () => this.page.getByRole('button', { name: /log out|sign out/i }),
      () => this.page.getByText(/log out|sign out/i).first(),
    ]);

    // Wait for confirmation dialog and click "Sign Out" button
    await this.page.waitForTimeout(1000);

    // Look for the "Sign Out" button in the dialog
    // Use .last() to get the confirmation button (not the initial logout button)
    const dialogSignOutButton = this.page.locator('button:has-text("Sign Out")').last();
    const isDialogVisible = await dialogSignOutButton.isVisible().catch(() => false);

    if (isDialogVisible) {
      await dialogSignOutButton.click();
    }

    await expect(this.page.getByTestId('auth-submit').or(this.page.getByRole('button', { name: /sign in|log in/i }))).toBeVisible();
  }
}
