const { chromium } = require('@playwright/test');

async function setupDualRoles() {
  console.log('🚀 Setting up dual role testing (FIXED)...\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-web-security']
  });

  // Create landlord context
  console.log('📊 Opening Landlord view...');
  const landlordContext = await browser.newContext();
  const landlordPage = await landlordContext.newPage();

  // Set landlord role BEFORE navigation
  await landlordPage.addInitScript(() => {
    localStorage.setItem('@MyAILandlord:userRole', 'landlord');
  });

  await landlordPage.goto('http://localhost:8081');
  await landlordPage.waitForLoadState('networkidle');
  console.log('✅ Landlord view ready!\n');

  // Create tenant context with aggressive role setting
  console.log('🏘️  Opening Tenant view...');
  const tenantContext = await browser.newContext();
  const tenantPage = await tenantContext.newPage();

  // CRITICAL: Set tenant role BEFORE navigation AND block profile sync override
  await tenantPage.addInitScript(() => {
    // Set role immediately
    localStorage.setItem('@MyAILandlord:userRole', 'tenant');

    // Intercept and force tenant role in the profile sync
    const originalSetItem = localStorage.setItem.bind(localStorage);
    localStorage.setItem = function(key, value) {
      if (key === '@MyAILandlord:userRole') {
        console.log('🔒 Blocking role override, keeping tenant role');
        return originalSetItem(key, 'tenant');
      }
      return originalSetItem(key, value);
    };
  });

  await tenantPage.goto('http://localhost:8081');
  await tenantPage.waitForLoadState('networkidle');

  // Double-check the role was set correctly
  const tenantRole = await tenantPage.evaluate(() => localStorage.getItem('@MyAILandlord:userRole'));
  console.log(`🔍 Tenant window role: ${tenantRole}`);

  if (tenantRole !== 'tenant') {
    console.log('⚠️  Role not set correctly, forcing it again...');
    await tenantPage.evaluate(() => {
      localStorage.setItem('@MyAILandlord:userRole', 'tenant');
    });
    await tenantPage.reload();
    await tenantPage.waitForLoadState('networkidle');
  }

  console.log('✅ Tenant view ready!\n');

  console.log('🎉 Both views are now open!');
  console.log('   - First window: Landlord Dashboard');
  console.log('   - Second window: Tenant Home\n');
  console.log('💡 Press Ctrl+C to close both windows when done testing.\n');

  // Keep the script running
  await new Promise(() => {});
}

setupDualRoles().catch(console.error);
