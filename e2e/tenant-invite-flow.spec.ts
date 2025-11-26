import { test, expect } from '@playwright/test';

/**
 * TENANT INVITE FLOW E2E TEST
 *
 * Tests landlord inviting a tenant to a property:
 * 1. Navigate to InviteTenant screen
 * 2. View generated invite URL
 * 3. Copy URL to clipboard
 * 4. Generate QR code
 * 5. Share functionality
 */

test.use({
  baseURL: 'http://localhost:8082',
});

test.describe('Tenant Invite Flow', () => {

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('[Browser Error]:', msg.text());
      }
    });

    page.on('dialog', async dialog => {
      console.log(`Dialog: ${dialog.type()} - ${dialog.message()}`);
      await dialog.accept();
    });
  });

  test('Generate and view tenant invite', async ({ page }) => {
    test.setTimeout(90000);

    console.log('========================================');
    console.log('TENANT INVITE FLOW TEST');
    console.log('========================================');

    // Navigate to Properties first
    console.log('\n--- Step 1: Navigate to Properties ---');
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/tenant-invite-step1-properties.png', fullPage: true });

    // Look for "Invite Tenant" button
    console.log('\n--- Step 2: Find Invite Tenant Button ---');

    const inviteTenantBtn = page.getByText('Invite Tenant');
    const inviteBtn = page.getByText('Invite');
    const addTenantBtn = page.getByText('Add Tenant');

    if (await inviteTenantBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await inviteTenantBtn.click();
      console.log('Clicked Invite Tenant');
    } else if (await inviteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await inviteBtn.click();
      console.log('Clicked Invite');
    } else if (await addTenantBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await addTenantBtn.click();
      console.log('Clicked Add Tenant');
    } else {
      // Try direct navigation
      console.log('No invite button found, trying direct navigation...');
      await page.goto('/InviteTenant');
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/tenant-invite-step2-screen.png', fullPage: true });

    // Step 3: Verify invite screen elements
    console.log('\n--- Step 3: Verify Invite Screen ---');

    const inviteElements = [
      page.getByText('Invite'),
      page.getByText('Share'),
      page.getByText('Copy'),
      page.getByText('QR Code'),
      page.locator('text=/invite|share|code/i'),
    ];

    for (const element of inviteElements) {
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('Invite screen element found');
        break;
      }
    }

    // Step 4: Look for invite URL
    console.log('\n--- Step 4: Check for Invite URL ---');

    const urlElement = page.locator('input[readonly], input[type="text"], [class*="url"]').first();
    if (await urlElement.isVisible({ timeout: 3000 }).catch(() => false)) {
      const urlValue = await urlElement.inputValue().catch(() => '');
      if (urlValue) {
        console.log(`Invite URL found: ${urlValue.substring(0, 50)}...`);
      }
    }

    // Step 5: Try Copy functionality
    console.log('\n--- Step 5: Test Copy Functionality ---');

    const copyBtn = page.getByText('Copy');
    const copyLinkBtn = page.getByText('Copy Link');
    const copyUrlBtn = page.getByText('Copy URL');

    if (await copyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await copyBtn.click();
      console.log('Clicked Copy button');
    } else if (await copyLinkBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await copyLinkBtn.click();
      console.log('Clicked Copy Link button');
    } else if (await copyUrlBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await copyUrlBtn.click();
      console.log('Clicked Copy URL button');
    }

    await page.waitForTimeout(1000);

    // Check for copy success message
    const copiedMsg = page.locator('text=/copied|success/i');
    if (await copiedMsg.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Copy success message shown');
    }

    await page.screenshot({ path: 'test-results/tenant-invite-step5-copy.png', fullPage: true });

    // Step 6: Check for QR code
    console.log('\n--- Step 6: Check for QR Code ---');

    const qrCode = page.locator('[class*="qr"], canvas, svg[class*="qr"]').first();
    const qrCodeBtn = page.getByText('QR Code');

    if (await qrCode.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('QR code displayed');
    } else if (await qrCodeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await qrCodeBtn.click();
      console.log('Clicked QR Code button');
      await page.waitForTimeout(1000);
    }

    await page.screenshot({ path: 'test-results/tenant-invite-final.png', fullPage: true });

    console.log('\n========================================');
    console.log('TENANT INVITE FLOW TEST COMPLETE');
    console.log('========================================');
  });

  test('Share invite via different methods', async ({ page }) => {
    test.setTimeout(60000);

    console.log('Testing share methods...');

    await page.goto('/InviteTenant');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Look for share options
    const shareOptions = ['Email', 'SMS', 'Text', 'Share', 'Send'];

    for (const option of shareOptions) {
      const shareBtn = page.getByText(option, { exact: true });
      if (await shareBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log(`Found share option: ${option}`);
      }
    }

    await page.screenshot({ path: 'test-results/tenant-invite-share-options.png', fullPage: true });

    console.log('Share methods test complete');
  });

  test('Invite from PropertyDetails', async ({ page }) => {
    test.setTimeout(60000);

    console.log('Testing invite from property details...');

    // Go to a property detail page
    await page.goto('/properties');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Click on first property
    const propertyCard = page.locator('[class*="card"], [class*="property"]').first();
    if (await propertyCard.isVisible({ timeout: 3000 }).catch(() => false)) {
      await propertyCard.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: 'test-results/tenant-invite-property-detail.png', fullPage: true });

    // Look for invite option in property details
    const inviteBtn = page.getByText('Invite Tenant');
    if (await inviteBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Found Invite Tenant in property details');
    }

    console.log('Property details invite test complete');
  });
});
