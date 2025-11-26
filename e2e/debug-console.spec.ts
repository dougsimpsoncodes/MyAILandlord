import { test, expect } from '@playwright/test';

test.describe('Debug Console Errors', () => {
  test('Check console errors', async ({ page }) => {
    // Listen to console messages
    page.on('console', msg => {
      console.log(`[Browser ${msg.type()}]:`, msg.text());
    });

    // Listen to page errors
    page.on('pageerror', error => {
      console.log('[Page Error]:', error.message);
    });

    // Listen to failed requests
    page.on('requestfailed', request => {
      console.log('[Request Failed]:', request.url(), request.failure()?.errorText);
    });

    await page.goto('/');
    await page.waitForTimeout(5000);

    // Check if root div has content
    const rootContent = await page.locator('#root').innerHTML();
    console.log('=== Root div content ===');
    console.log(rootContent);

    // Check for script tags
    const scripts = await page.locator('script[src]').count();
    console.log('=== Script tags found ===');
    console.log(scripts);

    if (scripts > 0) {
      const scriptSrcs = await page.locator('script[src]').evaluateAll(els => els.map(el => (el as HTMLScriptElement).src));
      console.log('Script sources:', scriptSrcs);
    }
  });
});
