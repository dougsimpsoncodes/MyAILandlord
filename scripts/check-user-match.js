// Script to check if logged-in user matches property owner
// Based on: https://mokkapps.de/blog/login-at-supabase-via-rest-api-in-playwright-e2e-test
// and: https://playwright.dev/docs/auth
// Supabase stores auth in localStorage with key: sb-{appId}-auth-token
// Run with: node scripts/check-user-match.js

const { chromium } = require('playwright');

// Supabase app ID extracted from EXPO_PUBLIC_SUPABASE_URL
const SUPABASE_APP_ID = 'zxqhxjuwmkxevhkpqfzf';
const PROPERTY_OWNER_ID = '8399535c-7037-47d9-a9a2-a042f531ed1d';

async function checkUserMatch() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Navigate to the app
  await page.goto('http://localhost:8081');

  console.log('Please log in manually in the browser window...');
  console.log('The script will check your user ID after you log in.');
  console.log('Waiting up to 60 seconds for login...\n');

  // Poll for session to appear in localStorage
  let attempts = 0;
  let result = null;
  const maxAttempts = 60; // 60 seconds

  while (attempts < maxAttempts) {
    result = await page.evaluate((appId) => {
      const storageKey = `sb-${appId}-auth-token`;
      const rawSession = localStorage.getItem(storageKey);

      if (!rawSession) {
        return null; // Not logged in yet
      }

      try {
        const session = JSON.parse(rawSession);
        return {
          userId: session?.user?.id,
          email: session?.user?.email,
          role: session?.user?.role,
          expiresAt: session?.expires_at
        };
      } catch (e) {
        return { error: `Failed to parse session: ${e.message}` };
      }
    }, SUPABASE_APP_ID);

    if (result && !result.error) {
      break;
    }

    attempts++;
    await page.waitForTimeout(1000);
    process.stdout.write(`\rWaiting for login... ${attempts}s`);
  }

  console.log('\n');

  if (!result) {
    console.log('⚠️ No login detected after 60 seconds');
    await browser.close();
    return;
  }

  if (result.error) {
    console.log('⚠️ Error:', result.error);
    await browser.close();
    return;
  }

  console.log('=== Supabase Session Found ===');
  console.log(JSON.stringify(result, null, 2));

  console.log('\n=== User Match Check ===');
  console.log(`Logged in user ID: ${result.userId}`);
  console.log(`Property owner ID: ${PROPERTY_OWNER_ID}`);

  if (result.userId === PROPERTY_OWNER_ID) {
    console.log('\n✅ User IDs MATCH - RLS should allow the insert');
  } else {
    console.log('\n❌ User IDs DO NOT MATCH - This is why RLS is blocking!');
    console.log('   The logged-in user is not the owner of the property.');
  }

  await browser.close();
}

checkUserMatch().catch(console.error);
