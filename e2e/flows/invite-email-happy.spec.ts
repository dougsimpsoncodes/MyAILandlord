import { test, expect } from '@playwright/test';
import { AuthPage } from '../pom/AuthPage';
import { LandlordPage } from '../pom/LandlordPage';
import { InvitePage } from '../pom/InvitePage';
import { MailpitPage } from '../pom/MailpitPage';
import { TenantPage } from '../pom/TenantPage';
import { ensureLoggedIn, generateTestEmail } from '../utils/accounts';

test.describe('Invite (Email) — human-true', () => {
  test.skip(process.env.USE_MAILPIT !== 'true', 'Requires Mailpit web UI available');

  test('landlord sends email; tenant opens link from email UI while logged out → signup → auto-accept', async ({ page }) => {
    const auth = new AuthPage(page);
    const landlord = new LandlordPage(page);
    const invite = new InvitePage(page);
    const tenant = new TenantPage(page);

    const landlordPassword = process.env.LANDLORD_PASSWORD || process.env.DEFAULT_TEST_PASSWORD || 'Password123!';
    const tenantPassword = process.env.TENANT_PASSWORD || process.env.DEFAULT_TEST_PASSWORD || 'Password123!';
    const useUnique = process.env.USE_UNIQUE_EMAILS !== 'false';
    const landlordEmail = process.env.LANDLORD_EMAIL || (useUnique ? generateTestEmail('landlord') : 'landlord@test.com');
    const tenantEmail = process.env.TENANT_EMAIL || (useUnique ? generateTestEmail('tenant') : 'tenant@test.com');
    const mailpitUrl = process.env.MAILPIT_HTTP || 'http://127.0.0.1:8025';

    // Landlord logs in (or signs up + confirms)
    await ensureLoggedIn(page, { email: landlordEmail, password: landlordPassword });

    // Ensure a property exists and open invite screen
    await landlord.ensureAtLeastOneProperty();
    await landlord.openFirstProperty();
    await landlord.openInvite();

    // Send email invite
    await invite.sendEmailInvite(tenantEmail);

    // Landlord logs out
    await auth.logout();

    // Open Mailpit web UI and click the invite link like a human
    const mail = new MailpitPage(page, mailpitUrl);
    await mail.open();
    await mail.openLatestFor(tenantEmail);
    const maybeHref = await mail.clickFirstInviteLink();

    // Now we are on the invite preview page in our app (new tab or same window depending on Mailpit UI).
    // If Mailpit opened a new tab, current page may still be Mailpit; handle both cases:
    if (maybeHref && !(page.url().includes('/invite'))) {
      await page.goto(maybeHref);
    }

    // Accepting while logged out should redirect to signup
    await expect(page.getByTestId('invite-property-preview').or(page.getByRole('heading', { name: /invitation/i }))).toBeVisible();
    await page.getByTestId('invite-accept').or(page.getByRole('button', { name: /accept/i })).click();

    // Complete signup then confirm via Mailpit; after auth, auto-accept should complete
    await expect(page.getByTestId('auth-signup').or(page.getByRole('heading', { name: /sign up|create account/i }))).toBeVisible();
    await page.getByTestId('auth-email').or(page.getByLabel(/email/i)).fill(tenantEmail);
    await page.getByTestId('auth-password').or(page.getByLabel(/password/i)).fill(tenantPassword);
    await page.getByTestId('auth-submit').or(page.getByRole('button', { name: /sign up|sign in|continue/i })).click();

    // Confirm tenant email if required
    try {
      await ensureLoggedIn(page, { email: tenantEmail, password: tenantPassword });
    } catch {}

    await expect(page.getByTestId('tenant-property-list').or(page.getByRole('heading', { name: /properties/i }))).toBeVisible();
  });
});
