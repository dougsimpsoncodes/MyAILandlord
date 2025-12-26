/**
 * Basic Tenant Invite Flow - Manual E2E Test
 *
 * Tests the core invite acceptance flow without requiring service role key.
 * Uses existing test data from the database.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8082';
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Use existing test token from database (generated manually)
const TEST_TOKEN = 'A6NXnrv9i6d0';
const TEST_PROPERTY_NAME = 'test';

test.describe('Basic Tenant Invite Flow', () => {
  test.beforeEach(async ({ context }) => {
    // Clear all auth state to simulate incognito
    await context.clearCookies();
  });

  test('should validate invite token via Edge Function', async () => {
    // Direct Edge Function call (simulates what the app does)
    const response = await fetch(`${SUPABASE_URL}/functions/v1/validate-invite-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ token: TEST_TOKEN }),
    });

    expect(response.ok).toBeTruthy();

    const result = await response.json();
    console.log('✅ Edge Function response:', JSON.stringify(result, null, 2));

    // Verify response structure
    expect(Array.isArray(result)).toBeTruthy();
    expect(result[0].valid).toBeTruthy();
    expect(result[0].property).toBeTruthy();
    expect(result[0].property.name).toBe(TEST_PROPERTY_NAME);
    expect(result[0].error).toBeNull();
  });

  test('should load invite preview screen with property details', async ({ page }) => {
    const inviteUrl = `${BASE_URL}/invite?token=${TEST_TOKEN}`;

    // Capture console logs and errors
    const consoleLogs: string[] = [];
    const consoleErrors: string[] = [];

    page.on('console', msg => {
      const text = msg.text();
      consoleLogs.push(`[${msg.type()}] ${text}`);
      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });

    page.on('pageerror', error => {
      consoleErrors.push(`PAGE ERROR: ${error.message}`);
    });

    // Navigate to invite URL (simulates clicking link in email)
    await page.goto(inviteUrl, { waitUntil: 'domcontentloaded' });

    // Wait for React to mount (look for root element to have children)
    try {
      await page.waitForFunction(
        () => {
          const root = document.getElementById('root');
          return root && root.children.length > 0;
        },
        { timeout: 30000 }
      );
      console.log('✅ React app mounted successfully');
    } catch (e) {
      console.log('❌ React app failed to mount after 30s');
      console.log('Console logs:', consoleLogs.slice(-20));
      console.log('Console errors:', consoleErrors);
    }

    // Wait for content to render instead of networkidle (which may timeout)
    await page.waitForTimeout(5000);

    // Take screenshot for debugging
    await page.screenshot({ path: '/tmp/invite-preview.png' });

    // Verify invite screen loaded
    const hasInviteContent = await page.locator('text=/invite|property|accept/i').isVisible({ timeout: 5000 }).catch(() => false);
    console.log('✅ Invite content visible:', hasInviteContent);

    // Verify property name displayed
    const hasPropertyName = await page.locator(`text=/${TEST_PROPERTY_NAME}/i`).isVisible({ timeout: 5000 }).catch(() => false);
    console.log('✅ Property name visible:', hasPropertyName);

    // Verify no error messages
    const hasError = await page.locator('text=/error|invalid|expired|connection issue/i').isVisible({ timeout: 5000 }).catch(() => false);
    console.log('❌ Error message visible:', hasError);

    // Log errors for debugging
    if (consoleErrors.length > 0) {
      console.log('🐛 Console errors detected:', consoleErrors);
    }

    expect(hasError).toBeFalsy();
    expect(hasInviteContent || hasPropertyName).toBeTruthy();
  });

  test('should display Accept button on invite screen', async ({ page }) => {
    const inviteUrl = `${BASE_URL}/invite?token=${TEST_TOKEN}`;

    await page.goto(inviteUrl);
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Look for Accept button or similar CTA
    const acceptButton = page.locator('button:has-text("Accept"), button:has-text("Join"), button[data-testid*="accept"]');
    const isAcceptVisible = await acceptButton.isVisible({ timeout: 10000 });

    console.log('✅ Accept button visible:', isAcceptVisible);

    if (isAcceptVisible) {
      const isEnabled = await acceptButton.isEnabled();
      console.log('✅ Accept button enabled:', isEnabled);
      expect(isEnabled).toBeTruthy();
    } else {
      // Check if already authenticated or other state
      const pageContent = await page.textContent('body');
      console.log('📄 Page content preview:', pageContent?.substring(0, 500));
    }

    expect(isAcceptVisible).toBeTruthy();
  });

  test('should show error for invalid token', async ({ page }) => {
    const invalidToken = 'ZZZZZZZZZZZ1';
    const inviteUrl = `${BASE_URL}/invite?token=${invalidToken}`;

    await page.goto(inviteUrl);
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Should show error for invalid token
    const hasError = await page.locator('text=/invalid|not found|not valid|error/i').isVisible({ timeout: 10000 });
    console.log('✅ Error message shown for invalid token:', hasError);

    expect(hasError).toBeTruthy();
  });

  test('should handle missing token parameter', async ({ page }) => {
    const inviteUrl = `${BASE_URL}/invite`;

    await page.goto(inviteUrl);
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Should show error or prompt
    const hasErrorOrPrompt = await page.locator('text=/invalid|required|missing|error|enter.*code/i').isVisible({ timeout: 10000 });
    console.log('✅ Error/prompt shown for missing token:', hasErrorOrPrompt);

    expect(hasErrorOrPrompt).toBeTruthy();
  });

  test('should work in incognito mode (fresh browser context)', async ({ browser }) => {
    // Create completely fresh browser context (simulates incognito)
    const context = await browser.newContext({
      storageState: undefined, // No saved state
      viewport: { width: 1280, height: 1024 },
    });

    const page = await context.newPage();
    const inviteUrl = `${BASE_URL}/invite?token=${TEST_TOKEN}`;

    await page.goto(inviteUrl);
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Verify works in clean state
    const hasInviteContent = await page.locator('text=/invite|property|accept/i').isVisible();
    const hasError = await page.locator('text=/error|connection issue|invalid/i').isVisible();

    console.log('✅ Incognito mode - Invite content visible:', hasInviteContent);
    console.log('❌ Incognito mode - Error visible:', hasError);

    expect(hasError).toBeFalsy();
    expect(hasInviteContent).toBeTruthy();

    await context.close();
  });

  test('should validate token format requirements', async ({ page }) => {
    const testCases = [
      { token: '', label: 'empty' },
      { token: 'abc', label: 'too short (3 chars)' },
      { token: 'ABCDEFGHIJKLM', label: 'too long (13 chars)' },
      { token: 'abc!@#$%^&*(', label: 'special characters' },
      { token: 'abcdef12345', label: 'valid length (11 chars)' }, // Should still be invalid in DB
    ];

    for (const { token, label } of testCases) {
      await page.goto(`${BASE_URL}/invite?token=${token}`);
      await page.waitForLoadState('networkidle', { timeout: 15000 });

      const hasError = await page.locator('text=/invalid|error|not found/i').isVisible({ timeout: 5000 });
      console.log(`✅ Token "${label}" → Error shown: ${hasError}`);

      // All invalid tokens should show errors
      if (token !== TEST_TOKEN) {
        expect(hasError).toBeTruthy();
      }
    }
  });
});

test.describe('Invite Edge Function CORS', () => {
  test('should allow native app requests (no Origin header)', async () => {
    // Direct fetch without Origin header (simulates React Native app)
    const response = await fetch(`${SUPABASE_URL}/functions/v1/validate-invite-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        // No Origin header
      },
      body: JSON.stringify({ token: TEST_TOKEN }),
    });

    expect(response.ok).toBeTruthy();
    const result = await response.json();
    expect(result[0].valid).toBeTruthy();

    console.log('✅ Native app request (no Origin) allowed');
  });
});
