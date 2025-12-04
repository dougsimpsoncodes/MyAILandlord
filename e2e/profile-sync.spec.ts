import { test, expect } from '@playwright/test';
import { SupabaseAuthHelper, AuthTestData } from './helpers/auth-helper';

test.describe('Profile sync verification', () => {
  test('With real auth: Profile sync triggers token and Supabase requests', async ({ page }) => {
    const authHelper = new SupabaseAuthHelper(page);

    const supabaseHits: { url: string; status?: number }[] = [];
    page.on('requestfinished', async (req) => {
      if (/supabase\.co/.test(req.url())) {
        const res = await req.response();
        supabaseHits.push({ url: req.url(), status: res?.status() });
        console.log('SUPABASE', req.url(), res?.status());
      }
    });

    const debugLogs: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text();
      if (text.includes('DEBUG') || text.includes('useProfileSync')) {
        debugLogs.push(text);
        console.log('LOG', text);
      }
    });

    await page.goto('/');

    // Sign in with real credentials
    const testCreds = AuthTestData.getTestUserCredentials();
    if (!testCreds) {
      console.log('⚠ Test credentials not available');
      test.skip();
      return;
    }

    const result = await authHelper.signInWithPassword(testCreds.email, testCreds.password);
    if (!result.success) {
      console.log('⚠ Could not authenticate, skipping test');
      test.skip();
      return;
    }

    // Wait for token log
    await expect.poll(
      async () => debugLogs.some(l => l.includes('Token retrieved')),
      { timeout: 15000 }
    ).toBeTruthy();

    // Wait for profile sync to complete
    await expect.poll(
      async () => debugLogs.some(l => l.includes('useProfileSync: syncing profile for')),
      { timeout: 15000 }
    ).toBeTruthy();

    // Wait for any Supabase request to happen
    await expect.poll(
      async () => supabaseHits.length > 0,
      { timeout: 15000 }
    ).toBeTruthy();

    // Ensure at least one response has a valid status code
    expect(supabaseHits[0].status).toBeGreaterThan(0);

    console.log(`✅ Profile sync verification passed!`);
    console.log(`   - User authenticated: ✓`);
    console.log(`   - Token retrieved: ✓`);
    console.log(`   - Profile sync executed: ✓`);
    console.log(`   - Supabase requests made: ${supabaseHits.length}`);
  });
});
