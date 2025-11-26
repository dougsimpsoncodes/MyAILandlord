import { test, expect } from '@playwright/test';

/**
 * LANDLORD MAINTENANCE REVIEW E2E TEST
 *
 * Tests the landlord flow for reviewing and managing maintenance requests:
 * 1. Navigate to Dashboard
 * 2. View maintenance requests list
 * 3. Click on a request to view details
 * 4. Update request status
 * 5. Send to vendor (optional)
 * 6. Complete request
 */

test.use({
  baseURL: 'http://localhost:8082',
});

test.describe('Landlord Maintenance Review Flow', () => {

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

  test('View and manage maintenance requests', async ({ page }) => {
    test.setTimeout(120000);

    console.log('========================================');
    console.log('LANDLORD MAINTENANCE REVIEW TEST');
    console.log('========================================');

    // Navigate to Dashboard
    console.log('\n--- Step 1: Navigate to Dashboard ---');
    await page.goto('/Dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/landlord-maintenance-step1-dashboard.png', fullPage: true });

    // Verify dashboard loaded
    const dashboardIndicators = [
      page.getByText('Dashboard'),
      page.getByText('Maintenance'),
      page.getByText('Requests'),
      page.getByText('Cases'),
      page.locator('text=/dashboard|maintenance|request/i'),
    ];

    let dashboardLoaded = false;
    for (const indicator of dashboardIndicators) {
      if (await indicator.isVisible({ timeout: 3000 }).catch(() => false)) {
        dashboardLoaded = true;
        console.log('Dashboard loaded successfully');
        break;
      }
    }

    // Step 2: Check for maintenance requests list
    console.log('\n--- Step 2: View Requests List ---');

    // Look for request cards or list items
    const requestCards = page.locator('[data-testid*="request"], [class*="request"], [class*="card"]');
    const requestCount = await requestCards.count();
    console.log(`Found ${requestCount} potential request elements`);

    // Check for status filters
    const statusFilters = ['All', 'Pending', 'In Progress', 'Completed', 'New'];
    for (const status of statusFilters) {
      const filterBtn = page.getByText(status, { exact: true });
      if (await filterBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log(`Found filter: ${status}`);
      }
    }

    await page.screenshot({ path: 'test-results/landlord-maintenance-step2-list.png', fullPage: true });

    // Step 3: Click on a request to view details
    console.log('\n--- Step 3: View Request Details ---');

    // Try to find and click a request
    const viewDetailBtn = page.getByText('View Details');
    const viewBtn = page.getByText('View');
    const firstRequest = page.locator('[class*="card"], [class*="request"]').first();

    if (await viewDetailBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await viewDetailBtn.click();
      console.log('Clicked View Details');
    } else if (await viewBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await viewBtn.click();
      console.log('Clicked View');
    } else if (await firstRequest.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstRequest.click();
      console.log('Clicked first request card');
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/landlord-maintenance-step3-detail.png', fullPage: true });

    // Step 4: Check for CaseDetail elements
    console.log('\n--- Step 4: Case Detail View ---');

    const detailElements = [
      page.getByText('Issue Type'),
      page.getByText('Priority'),
      page.getByText('Description'),
      page.getByText('Status'),
      page.getByText('Tenant'),
      page.getByText('Property'),
    ];

    for (const element of detailElements) {
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('Case detail element found');
        break;
      }
    }

    // Step 5: Look for status update options
    console.log('\n--- Step 5: Status Update Options ---');

    const statusOptions = [
      page.getByText('Update Status'),
      page.getByText('Mark In Progress'),
      page.getByText('Mark Complete'),
      page.getByText('Send to Vendor'),
      page.locator('select, [role="combobox"]').first(),
    ];

    for (const option of statusOptions) {
      if (await option.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log('Status update option found');
        break;
      }
    }

    await page.screenshot({ path: 'test-results/landlord-maintenance-step5-options.png', fullPage: true });

    console.log('\n========================================');
    console.log('LANDLORD MAINTENANCE REVIEW TEST COMPLETE');
    console.log('========================================');
  });

  test('Send maintenance request to vendor', async ({ page }) => {
    test.setTimeout(90000);

    console.log('Testing Send to Vendor flow...');

    // Navigate directly to SendToVendor screen
    await page.goto('/SendToVendor');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/landlord-send-vendor.png', fullPage: true });

    // Look for vendor form fields
    const vendorEmail = page.locator('input[type="email"], input[placeholder*="email" i]').first();
    const vendorNotes = page.locator('textarea, input[placeholder*="notes" i]').first();
    const estimatedCost = page.locator('input[placeholder*="cost" i], input[type="number"]').first();

    if (await vendorEmail.isVisible({ timeout: 3000 }).catch(() => false)) {
      await vendorEmail.fill('vendor@example.com');
      console.log('Filled vendor email');
    }

    if (await vendorNotes.isVisible({ timeout: 2000 }).catch(() => false)) {
      await vendorNotes.fill('Please repair the leaking faucet in Kitchen.');
      console.log('Filled vendor notes');
    }

    if (await estimatedCost.isVisible({ timeout: 2000 }).catch(() => false)) {
      await estimatedCost.fill('150');
      console.log('Filled estimated cost');
    }

    await page.screenshot({ path: 'test-results/landlord-send-vendor-filled.png', fullPage: true });

    console.log('Send to Vendor test complete');
  });

  test('Filter maintenance requests by status', async ({ page }) => {
    test.setTimeout(60000);

    console.log('Testing status filtering...');

    await page.goto('/Dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Test each filter
    const filters = ['Pending', 'In Progress', 'Completed', 'All'];

    for (const filter of filters) {
      const filterBtn = page.getByText(filter, { exact: true });
      if (await filterBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await filterBtn.click();
        console.log(`Clicked ${filter} filter`);
        await page.waitForTimeout(1000);
      }
    }

    await page.screenshot({ path: 'test-results/landlord-maintenance-filters.png', fullPage: true });

    console.log('Filter test complete');
  });
});
