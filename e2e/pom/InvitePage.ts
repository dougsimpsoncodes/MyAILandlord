import { Page, expect } from '@playwright/test';
import { clickFirst, fillFirst } from '../utils/locators';

export class InvitePage {
  constructor(private page: Page) {}

  async createCodeInvite(): Promise<string> {
    await clickFirst(this.page, [
      () => this.page.getByTestId('invite-mode-code'),
      () => this.page.getByRole('tab', { name: /code/i }),
      () => this.page.getByRole('button', { name: /shareable code/i }),
    ]);

    await clickFirst(this.page, [
      () => this.page.getByTestId('invite-generate'),
      () => this.page.getByRole('button', { name: /generate/i }),
    ]);

    // Either full link or just the code is displayed
    const content = await this.page.getByTestId('invite-code').or(this.page.getByRole('textbox').or(this.page.locator('[data-testid^="invite-code"]'))).first().textContent();
    if (!content) throw new Error('No invite code/link visible.');
    return content.trim();
  }

  async sendEmailInvite(email: string) {
    await clickFirst(this.page, [
      () => this.page.getByTestId('invite-mode-email'),
      () => this.page.getByRole('tab', { name: /email/i }),
      () => this.page.getByRole('button', { name: /email invite/i }),
    ]);

    await fillFirst(this.page, [
      () => this.page.getByTestId('invite-email-input'),
      () => this.page.getByLabel(/email/i),
      () => this.page.locator('input[type="email"]'),
    ], email);

    await clickFirst(this.page, [
      () => this.page.getByTestId('invite-send'),
      () => this.page.getByRole('button', { name: /send invite|send/i }),
    ]);

    await expect(this.page.getByTestId('invite-sent-toast').or(this.page.getByText(/invite sent|email sent/i))).toBeVisible();
  }
}
