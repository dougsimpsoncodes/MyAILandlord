import { Page, expect } from '@playwright/test';
import { clickFirst } from '../utils/locators';

export class TenantPage {
  constructor(private page: Page) {}

  async acceptInviteFromLink(link: string) {
    await this.page.goto(link);
    await expect(this.page.getByTestId('invite-property-preview').or(this.page.getByRole('heading', { name: /invitation|invite/i }))).toBeVisible();

    await clickFirst(this.page, [
      () => this.page.getByTestId('invite-accept'),
      () => this.page.getByRole('button', { name: /accept/i }),
    ]);
  }

  async expectTenantPropertyVisible() {
    await expect(this.page.getByTestId('tenant-property-list').or(this.page.getByRole('heading', { name: /properties/i }))).toBeVisible();
  }

  async expectInviteInvalid() {
    await expect(this.page.getByTestId('invite-invalid').or(this.page.getByText(/invalid|expired/i))).toBeVisible();
  }
}
