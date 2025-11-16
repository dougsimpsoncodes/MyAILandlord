const { chromium } = require('@playwright/test');

async function setupDualRoles() {
  console.log('🚀 Setting up dual role testing...\n');

  const browser = await chromium.launch({
    headless: false, // Show the browser windows
    args: ['--disable-web-security'] // Allow multiple contexts
  });

  // Create landlord context (normal browsing)
  console.log('📊 Opening Landlord view...');
  const landlordContext = await browser.newContext();
  const landlordPage = await landlordContext.newPage();
  await landlordPage.goto('http://localhost:8081');
  await landlordPage.evaluate(() => {
    localStorage.setItem('@MyAILandlord:userRole', 'landlord');
  });
  await landlordPage.reload();
  await landlordPage.waitForLoadState('networkidle');
  console.log('✅ Landlord view ready!\n');

  // Create tenant context (incognito-like)
  console.log('🏘️  Opening Tenant view...');
  const tenantContext = await browser.newContext();
  const tenantPage = await tenantContext.newPage();
  await tenantPage.goto('http://localhost:8081');
  await tenantPage.evaluate(() => {
    localStorage.setItem('@MyAILandlord:userRole', 'tenant');
  });
  await tenantPage.reload();
  await tenantPage.waitForLoadState('networkidle');
  console.log('✅ Tenant view ready!\n');

  console.log('🎉 Both views are now open!');
  console.log('   - First window: Landlord Dashboard');
  console.log('   - Second window: Tenant Home\n');
  console.log('💡 Press Ctrl+C to close both windows when done testing.\n');

  // Keep the script running until user presses Ctrl+C
  await new Promise(() => {});
}

setupDualRoles().catch(console.error);
