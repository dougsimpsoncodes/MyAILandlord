import { Page, expect } from '@playwright/test';

export class MailpitPage {
  constructor(private page: Page, private mailpitUrl: string) {}

  async open() {
    await this.page.goto(this.mailpitUrl);
    await expect(this.page).toHaveTitle(/mailpit/i);
    // Wait for messages list to render
    await this.page.waitForTimeout(1000);
  }

  async openLatestFor(recipient: string) {
    // Mailpit UI shows a list; filter by recipient if UI supports it, otherwise click first and verify inside.
    // Try a search box (Mailpit has a search bar at top):
    const search = this.page.locator('input[type="search"], input[type="text"][placeholder*="search" i]');
    if (await search.count() > 0) {
      await search.first().fill(`to:${recipient}`);
      await search.first().press('Enter');
      await this.page.waitForTimeout(1000);
    }

    // Click the first row in message list
    const firstRow = this.page.locator('table tbody tr').first().or(this.page.locator('[role="row"]').nth(1));
    await firstRow.click();

    // Verify the preview pane loads
    await expect(this.page.locator('iframe, .content, #message, .message')).toBeVisible({ timeout: 5000 });
  }

  async clickFirstInviteLink() {
    // Mailpit renders HTML; sometimes inside an iframe or right pane.
    // Try links in the main document:
    let linkLoc = this.page.locator('a:has-text("invite"), a[href*="/invite?"]');
    if (await linkLoc.count() === 0) {
      // If HTML body inside iframe, search there
      const ifr = this.page.frameLocator('iframe');
      linkLoc = ifr.locator('a:has-text("invite"), a[href*="/invite?"]');
    }
    await expect(linkLoc.first()).toBeVisible();
    const href = await linkLoc.first().getAttribute('href');
    await linkLoc.first().click();
    return href;
  }
}
