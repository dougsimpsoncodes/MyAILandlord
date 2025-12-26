import { test, expect } from '@playwright/test';
import { AuthPage } from '../pom/AuthPage';
import { TenantPage } from '../pom/TenantPage';

test.describe('Invite (Negative) — human-true', () => {
  test('invalid token shows generic invalid', async ({ page, baseURL }) => {
    const tenant = new TenantPage(page);
    await page.goto(`${baseURL}/invite?t=THIS_IS_NOT_VALID_12345`);
    await tenant.expectInviteInvalid();
  });

  test('reuse blocked for different user (simulate as anonymous second visit)', async ({ page, baseURL }) => {
    // Simulate by visiting a bad link or previously used link.
    // If your run captured a real used link, you can pipe it via env and use here.
    await page.goto(`${baseURL}/invite?t=THIS_WAS_USED_OR_FAKE`);
    await expect(page.getByTestId('invite-invalid').or(page.getByText(/invalid|expired/i))).toBeVisible();
  });
});
