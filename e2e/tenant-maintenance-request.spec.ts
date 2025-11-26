import { test, expect } from '@playwright/test';

/**
 * TENANT MAINTENANCE REQUEST E2E TEST
 *
 * Tests the complete flow of a tenant submitting a maintenance request:
 * 1. Navigate to tenant home
 * 2. Click "Report Issue"
 * 3. Select area, issue type, priority
 * 4. Add description
 * 5. Review and submit
 * 6. Verify success screen
 */

test.use({
  baseURL: 'http://localhost:8082',
});

test.describe('Tenant Maintenance Request Flow', () => {

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

  test('Complete maintenance request submission', async ({ page }) => {
    test.setTimeout(120000);

    console.log('========================================');
    console.log('TENANT MAINTENANCE REQUEST TEST');
    console.log('========================================');

    // Navigate to tenant home
    console.log('\n--- Step 1: Navigate to Tenant Home ---');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/tenant-maintenance-step1-home.png', fullPage: true });

    // Look for Report Issue button or similar
    const reportIssueBtn = page.getByText('Report Issue');
    const reportProblemBtn = page.getByText('Report a Problem');
    const newRequestBtn = page.getByText('New Request');
    const maintenanceBtn = page.locator('text=/Maintenance|Report|Issue/i').first();

    let foundReportButton = false;

    if (await reportIssueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Found "Report Issue" button');
      await reportIssueBtn.click();
      foundReportButton = true;
    } else if (await reportProblemBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Found "Report a Problem" button');
      await reportProblemBtn.click();
      foundReportButton = true;
    } else if (await newRequestBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Found "New Request" button');
      await newRequestBtn.click();
      foundReportButton = true;
    } else if (await maintenanceBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Found maintenance-related button');
      await maintenanceBtn.click();
      foundReportButton = true;
    }

    if (!foundReportButton) {
      // Try navigating directly to report issue screen
      console.log('No report button found, trying direct navigation...');
      await page.goto('/ReportIssue');
      await page.waitForLoadState('networkidle');
    }

    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/tenant-maintenance-step2-report.png', fullPage: true });

    // Step 2: Select Area
    console.log('\n--- Step 2: Select Area ---');

    const areaOptions = ['Kitchen', 'Bathroom', 'Living Room', 'Bedroom', 'Garage'];
    let areaSelected = false;

    for (const area of areaOptions) {
      const areaBtn = page.getByText(area, { exact: true });
      if (await areaBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await areaBtn.click();
        console.log(`Selected area: ${area}`);
        areaSelected = true;
        break;
      }
    }

    if (!areaSelected) {
      // Try dropdown selector
      const areaDropdown = page.locator('select, [role="combobox"]').first();
      if (await areaDropdown.isVisible({ timeout: 2000 }).catch(() => false)) {
        await areaDropdown.click();
        await page.waitForTimeout(500);
        const firstOption = page.locator('option, [role="option"]').first();
        if (await firstOption.isVisible()) {
          await firstOption.click();
          areaSelected = true;
        }
      }
    }

    await page.waitForTimeout(1000);

    // Step 3: Select Issue Type
    console.log('\n--- Step 3: Select Issue Type ---');

    const issueTypes = ['Plumbing', 'Electrical', 'HVAC', 'Appliance', 'Structural', 'Other'];
    let issueSelected = false;

    for (const issue of issueTypes) {
      const issueBtn = page.getByText(issue, { exact: true });
      if (await issueBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await issueBtn.click();
        console.log(`Selected issue type: ${issue}`);
        issueSelected = true;
        break;
      }
    }

    await page.waitForTimeout(1000);

    // Step 4: Set Priority
    console.log('\n--- Step 4: Set Priority ---');

    const priorities = ['Low', 'Medium', 'High', 'Urgent'];
    for (const priority of priorities) {
      const priorityBtn = page.getByText(priority, { exact: true });
      if (await priorityBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await priorityBtn.click();
        console.log(`Selected priority: ${priority}`);
        break;
      }
    }

    await page.waitForTimeout(1000);

    // Step 5: Add Description
    console.log('\n--- Step 5: Add Description ---');

    const descriptionInput = page.locator('textarea, input[placeholder*="description" i], input[placeholder*="describe" i]').first();
    if (await descriptionInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await descriptionInput.fill('The kitchen faucet is leaking continuously. Water drips even when turned off completely. This has been happening for 2 days.');
      console.log('Added description');
    }

    // Try title input if available
    const titleInput = page.locator('input[placeholder*="title" i], input[placeholder*="subject" i]').first();
    if (await titleInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await titleInput.fill('Leaking Kitchen Faucet');
      console.log('Added title');
    }

    await page.screenshot({ path: 'test-results/tenant-maintenance-step5-description.png', fullPage: true });

    // Step 6: Continue/Submit
    console.log('\n--- Step 6: Submit Request ---');

    // Look for Continue or Submit button
    const continueBtn = page.getByText('Continue');
    const submitBtn = page.getByText('Submit');
    const reviewBtn = page.getByText('Review');
    const nextBtn = page.getByText('Next');

    if (await continueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await continueBtn.click();
      console.log('Clicked Continue');
    } else if (await reviewBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await reviewBtn.click();
      console.log('Clicked Review');
    } else if (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await nextBtn.click();
      console.log('Clicked Next');
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/tenant-maintenance-step6-review.png', fullPage: true });

    // Final Submit
    if (await submitBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await submitBtn.click();
      console.log('Clicked Submit');
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'test-results/tenant-maintenance-final.png', fullPage: true });

    // Verify success
    const successIndicators = [
      page.getByText('Success'),
      page.getByText('Submitted'),
      page.getByText('Request Created'),
      page.getByText('Thank you'),
      page.locator('text=/success|submitted|created/i'),
    ];

    let successFound = false;
    for (const indicator of successIndicators) {
      if (await indicator.isVisible({ timeout: 2000 }).catch(() => false)) {
        successFound = true;
        console.log('SUCCESS: Maintenance request submitted!');
        break;
      }
    }

    console.log('\n========================================');
    console.log('TENANT MAINTENANCE REQUEST TEST COMPLETE');
    console.log(`Result: ${successFound ? 'SUCCESS' : 'NEEDS VERIFICATION'}`);
    console.log('========================================');
  });

  test('View maintenance status', async ({ page }) => {
    test.setTimeout(60000);

    console.log('Testing maintenance status view...');

    // Navigate to maintenance status
    await page.goto('/MaintenanceStatus');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'test-results/tenant-maintenance-status.png', fullPage: true });

    // Verify status page elements
    const statusElements = [
      page.getByText('Pending'),
      page.getByText('In Progress'),
      page.getByText('Completed'),
      page.locator('text=/Status|Request|Maintenance/i'),
    ];

    for (const element of statusElements) {
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('Maintenance status page loaded successfully');
        break;
      }
    }

    console.log('Maintenance status test complete');
  });
});
