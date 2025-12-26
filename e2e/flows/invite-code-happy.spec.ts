import { test, expect } from '@playwright/test';
import { waitForAppReady } from '../utils/app-ready';
import { AuthPage } from '../pom/AuthPage';
import { LandlordPage } from '../pom/LandlordPage';
import { InvitePage } from '../pom/InvitePage';
import { TenantPage } from '../pom/TenantPage';
import { ensureLoggedIn, generateTestEmail } from '../utils/accounts';

test.describe('Invite (Code) — human-true', () => {
  test('landlord creates code; tenant accepts while logged in', async ({ browser, baseURL }) => {
    // Use existing test users to avoid email confirmation issues
    const landlordEmail = 'landlord@test.com';
    const tenantEmail = 'tenant@test.com';
    const landlordPassword = 'Password123!';
    const tenantPassword = 'Password123!';

    // ============================================================================
    // LANDLORD SESSION (separate browser context)
    // ============================================================================
    const landlordContext = await browser.newContext();
    const landlordPage = await landlordContext.newPage();

    // Capture console logs for debugging
    landlordPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('[InviteTenant]') || text.includes('session') || text.includes('auth')) {
        console.log(`LANDLORD BROWSER: ${text}`);
      }
    });

    const landlordAuth = new AuthPage(landlordPage);
    const landlord = new LandlordPage(landlordPage);
    const invite = new InvitePage(landlordPage);

    // Landlord logs in
    await ensureLoggedIn(landlordPage, {
      email: landlordEmail,
      password: landlordPassword,
    });

    // Create invite code
    await landlord.ensureAtLeastOneProperty();
    await landlord.openFirstProperty();
    await landlord.openInvite();

    const codeOrLink = await invite.createCodeInvite();
    const link = codeOrLink.startsWith('http') ? codeOrLink : `${baseURL}/invite?t=${codeOrLink}`;

    console.log(`\n🔗 INVITE LINK CREATED: ${link}\n`);

    // Close landlord session (simulates different device)
    await landlordContext.close();

    // ============================================================================
    // TENANT SESSION (separate browser context = different device/user)
    // ============================================================================
    const tenantContext = await browser.newContext();
    const tenantPage = await tenantContext.newPage();

    tenantPage.on('console', msg => {
      const text = msg.text();
      if (text.includes('invite') || text.includes('accept')) {
        console.log(`TENANT BROWSER: ${text}`);
      }
    });

    const tenantAuth = new AuthPage(tenantPage);
    const tenant = new TenantPage(tenantPage);

    // Tenant logs in
    await ensureLoggedIn(tenantPage, {
      email: tenantEmail,
      password: tenantPassword,
    });

    // CORE TEST: Does the invite link work?
    await tenant.acceptInviteFromLink(link);
    await tenant.expectTenantPropertyVisible();

    // Verify idempotency: same user accepting same invite again
    await tenantPage.goto(link);
    await tenant.expectInviteInvalid();

    await tenantContext.close();
  });
});
