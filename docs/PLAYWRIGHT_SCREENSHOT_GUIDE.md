# Playwright Screenshot Automation Guide

## Quick Reference

This guide provides quick access to the patterns and techniques learned from documenting 61 screens of the MyAI Landlord app.

## Core Patterns

### 1. Basic Screen Capture Function

```javascript
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

const CONFIG = {
  baseUrl: 'http://localhost:8081',
  viewport: { width: 1280, height: 720 },
  screenshotsDir: 'docs/screenshots',
  metadataDir: 'docs/metadata',
  authDir: '.auth'
};

async function captureScreen(page, screenName, metadata) {
  const screenshotPath = path.join(CONFIG.screenshotsDir, `${screenName}.png`);
  const metadataPath = path.join(CONFIG.metadataDir, `${screenName}.json`);

  // Wait for content to settle
  await page.waitForTimeout(2000);

  // Capture screenshot
  await page.screenshot({ path: screenshotPath, fullPage: false });

  // Save metadata
  const metadataFull = {
    screenName,
    timestamp: new Date().toISOString(),
    url: page.url(),
    viewport: CONFIG.viewport,
    ...metadata
  };

  await fs.writeFile(metadataPath, JSON.stringify(metadataFull, null, 2));
  console.log(`  ✓ ${screenName}`);

  return metadataFull;
}
```

### 2. Authentication & State Saving

```javascript
async function authenticateAndSaveState(page, email, password, authStatePath) {
  await page.goto(`${CONFIG.baseUrl}/Auth`);
  await page.fill('[data-testid="auth-email"]', email);
  await page.fill('[data-testid="auth-password"]', password);
  await page.click('button:has-text("Sign In")');

  // Wait for successful navigation
  await page.waitForURL(/\/(Landlord|Tenant)/, { timeout: 10000 });
  await page.waitForTimeout(2000);

  // Save auth state
  await page.context().storageState({ path: authStatePath });
  console.log(`✓ Auth state saved: ${authStatePath}`);
}
```

### 3. Modular Flow Documentation Function

```javascript
async function documentFeatureFlow(browser, authStatePath) {
  console.log('\n📋 Feature Flow\n');

  const context = await browser.newContext({
    viewport: CONFIG.viewport,
    storageState: authStatePath
  });
  const page = await context.newPage();
  const screenshots = [];

  try {
    // Screen 1
    await page.goto(`${CONFIG.baseUrl}/FeatureScreen1`, {
      waitUntil: 'domcontentloaded'
    });
    screenshots.push(await captureScreen(page, 'feature-screen-1', {
      flow: 'Feature',
      role: 'user',
      purpose: 'First screen of feature'
    }));

    // Screen 2
    await page.goto(`${CONFIG.baseUrl}/FeatureScreen2`, {
      waitUntil: 'domcontentloaded'
    });
    screenshots.push(await captureScreen(page, 'feature-screen-2', {
      flow: 'Feature',
      role: 'user',
      purpose: 'Second screen of feature'
    }));

    console.log(`✅ ${screenshots.filter(s => s).length} screens captured\n`);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  } finally {
    await context.close();
  }

  return screenshots.filter(s => s);
}
```

## Common Recipes

### Recipe 1: Document New Feature (5 screens)

```javascript
// scripts/document-new-feature.js
const { chromium } = require('playwright');

async function main() {
  const browser = await chromium.launch({ headless: true });

  try {
    // Use existing auth state
    const authPath = '.auth/landlord-completed.json';

    const screenshots = await documentNewFeature(browser, authPath);

    console.log(`\n📊 Total: ${screenshots.length} screenshots`);
  } finally {
    await browser.close();
  }
}

async function documentNewFeature(browser, authStatePath) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    storageState: authStatePath
  });
  const page = await context.newPage();
  const screenshots = [];

  try {
    // Capture each screen in the flow
    await page.goto('http://localhost:8081/NewFeature', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    screenshots.push(await captureScreen(page, 'new-feature-main', {
      flow: 'New Feature',
      role: 'landlord',
      purpose: 'Main screen of new feature'
    }));

    // ... more screens ...

  } catch (error) {
    console.error(`Error: ${error.message}`);
  } finally {
    await context.close();
  }

  return screenshots.filter(s => s);
}

main().catch(console.error);
```

### Recipe 2: Capture Empty/Error States

```javascript
async function documentEdgeStates(browser, authStatePath, userId) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    storageState: authStatePath
  });
  const page = await context.newPage();
  const screenshots = [];

  try {
    // Empty state - clear data first
    await clearUserProperties(userId); // Your DB helper
    await page.goto('http://localhost:8081/Dashboard', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    screenshots.push(await captureScreen(page, 'dashboard-empty', {
      flow: 'Dashboard',
      role: 'landlord',
      purpose: 'Dashboard with no properties',
      state: 'empty'
    }));

    // Error state - trigger validation error
    await page.goto('http://localhost:8081/AddProperty', { waitUntil: 'domcontentloaded' });
    await page.click('button:has-text("Submit")'); // Submit without filling
    await page.waitForSelector('[data-testid="error-message"]', { timeout: 3000 });
    await page.waitForTimeout(1000);
    screenshots.push(await captureScreen(page, 'add-property-error', {
      flow: 'Property Management',
      role: 'landlord',
      purpose: 'Add property with validation errors',
      state: 'error'
    }));

  } catch (error) {
    console.error(`Error: ${error.message}`);
  } finally {
    await context.close();
  }

  return screenshots.filter(s => s);
}
```

### Recipe 3: Multi-Role Flow (Invite Acceptance)

```javascript
async function documentInviteFlow(browser) {
  const screenshots = [];

  try {
    // Part 1: Landlord creates invite
    const landlordContext = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      storageState: '.auth/landlord.json'
    });
    const landlordPage = await landlordContext.newPage();

    await landlordPage.goto('http://localhost:8081/InviteTenant', {
      waitUntil: 'domcontentloaded'
    });
    await landlordPage.waitForTimeout(2000);

    // Get the invite link
    const inviteLink = await landlordPage.textContent('[data-testid="invite-link"]');

    screenshots.push(await captureScreen(landlordPage, 'landlord-invite-created', {
      flow: 'Invite Flow',
      role: 'landlord',
      purpose: 'Invite created with link'
    }));

    await landlordContext.close();

    // Part 2: Tenant accepts invite (no auth)
    const tenantContext = await browser.newContext({
      viewport: { width: 1280, height: 720 }
      // No auth state - fresh session
    });
    const tenantPage = await tenantContext.newPage();

    await tenantPage.goto(inviteLink, { waitUntil: 'domcontentloaded' });
    await tenantPage.waitForTimeout(2000);

    screenshots.push(await captureScreen(tenantPage, 'tenant-invite-landing', {
      flow: 'Invite Flow',
      role: 'tenant',
      purpose: 'Tenant views invite before signup'
    }));

    await tenantContext.close();

  } catch (error) {
    console.error(`Invite flow error: ${error.message}`);
  }

  return screenshots.filter(s => s);
}
```

### Recipe 4: Parameterized Detail Screens

```javascript
async function documentDetailScreens(browser, authStatePath) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    storageState: authStatePath
  });
  const page = await context.newPage();
  const screenshots = [];

  try {
    // Get test IDs from database
    const propertyId = '2a17b6c7-5f4f-4cdb-a707-d5b24d364fc7';
    const assetId = 'a1111111-1111-1111-1111-111111111111';
    const requestId = 'r1111111-1111-1111-1111-111111111111';

    // Property details
    await page.goto(
      `http://localhost:8081/PropertyDetails?propertyId=${propertyId}`,
      { waitUntil: 'domcontentloaded' }
    );
    await page.waitForTimeout(2000);
    screenshots.push(await captureScreen(page, 'property-details', {
      flow: 'Property Management',
      role: 'landlord',
      purpose: 'View individual property details'
    }));

    // Asset details
    await page.goto(
      `http://localhost:8081/AssetDetails?assetId=${assetId}`,
      { waitUntil: 'domcontentloaded' }
    );
    await page.waitForTimeout(2000);
    screenshots.push(await captureScreen(page, 'asset-details', {
      flow: 'Asset Management',
      role: 'landlord',
      purpose: 'View/edit individual asset'
    }));

    // Request details
    await page.goto(
      `http://localhost:8081/RequestDetails?requestId=${requestId}`,
      { waitUntil: 'domcontentloaded' }
    );
    await page.waitForTimeout(2000);
    screenshots.push(await captureScreen(page, 'request-details', {
      flow: 'Maintenance',
      role: 'landlord',
      purpose: 'View maintenance request details'
    }));

  } catch (error) {
    console.error(`Detail screens error: ${error.message}`);
  } finally {
    await context.close();
  }

  return screenshots.filter(s => s);
}
```

## Troubleshooting

### Problem: "Element not found"

```javascript
// Check if element exists before interacting
const elementCount = await page.locator('[data-testid="target"]').count();
if (elementCount === 0) {
  console.log('Element not found, using fallback navigation');
  await page.goto('http://localhost:8081/DirectRoute', { waitUntil: 'domcontentloaded' });
} else {
  await page.click('[data-testid="target"]');
}
```

### Problem: Screenshot captures mid-animation

```javascript
// Wait longer for animations to complete
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForLoadState('networkidle'); // Wait for network to settle
await page.waitForTimeout(3000); // Extra buffer for animations
await page.screenshot({ path: screenshotPath });
```

### Problem: Navigation redirects to wrong screen

```javascript
// Check app state in database before automation
await checkAndFixAppState(userId); // Your helper function

async function checkAndFixAppState(userId) {
  // Ensure user is in correct state for target screens
  await db.query(`
    UPDATE profiles
    SET onboarding_completed = true
    WHERE id = $1
  `, [userId]);
}
```

### Problem: Auth state becomes invalid

```javascript
// Regenerate auth state
async function ensureFreshAuth(email, password, authPath) {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await authenticateAndSaveState(page, email, password, authPath);

  await browser.close();
  console.log('✓ Fresh auth state created');
}

// Use before main automation
await ensureFreshAuth('landlord@example.com', 'password', '.auth/landlord.json');
```

## Best Practices Checklist

Before running screenshot automation:

- [ ] Dev server running (`npx expo start --web --port 8081`)
- [ ] Test data seeded in database
- [ ] App state flags set correctly (onboarding_completed, etc.)
- [ ] Auth states exist and are valid (`.auth/*.json`)
- [ ] Output directories created (`docs/screenshots`, `docs/metadata`)
- [ ] Previous screenshots backed up (if updating existing)

During automation:

- [ ] Use direct URL navigation, not clicks
- [ ] Wait 2+ seconds after page load before screenshot
- [ ] Log progress for each screen
- [ ] Handle errors gracefully (try-catch-finally)
- [ ] Close contexts properly
- [ ] Capture metadata alongside screenshots

After automation:

- [ ] Verify all screenshots captured
- [ ] Check screenshot quality (clear, no loading states)
- [ ] Validate metadata files generated
- [ ] Review for consistency
- [ ] Generate/update HTML documentation
- [ ] Stop dev server
- [ ] Clean up test data (optional)

## Performance Tips

1. **Reuse auth states** - 60-80% faster than logging in each time
2. **Run flows in parallel** - Use `Promise.all()` for independent flows
3. **Batch process** - Process 10-20 screens at a time to manage memory
4. **Skip unchanged screens** - Only re-capture modified screens
5. **Use headless mode** - Faster than headed browser

## File Organization

```
project/
├── .auth/                          # Auth states
│   ├── landlord.json
│   ├── landlord-completed.json
│   └── tenant.json
├── docs/
│   ├── screenshots/                # PNG screenshots
│   │   ├── landlord-dashboard.png
│   │   └── tenant-home.png
│   ├── metadata/                   # JSON metadata
│   │   ├── landlord-dashboard.json
│   │   └── tenant-home.json
│   └── COMPLETE_APP_DOCUMENTATION.html
├── scripts/
│   ├── generate-app-documentation-comprehensive.js
│   ├── document-new-feature.js
│   └── build-documentation-html.js
└── .claude/
    └── agents/
        └── playwright-screenshot-specialist.md
```

## Next Steps

After capturing screenshots:

1. **Generate HTML documentation**:
   ```bash
   node scripts/build-documentation-html.js
   ```

2. **Review documentation**:
   ```bash
   open docs/COMPLETE_APP_DOCUMENTATION.html
   ```

3. **Update coverage tracking**:
   ```bash
   # Update COVERAGE_SUMMARY.md with new screen counts
   ```

4. **Commit to repository**:
   ```bash
   git add docs/screenshots docs/metadata docs/*.html
   git commit -m "docs: update screenshots for [feature name]"
   ```

## Resources

- **Full Specialist Agent**: `.claude/agents/playwright-screenshot-specialist.md`
- **Comprehensive Script**: `scripts/generate-app-documentation-comprehensive.js`
- **Current Documentation**: `docs/COMPLETE_APP_DOCUMENTATION.html`
- **Coverage Summary**: `docs/COVERAGE_SUMMARY.md`
- **Playwright Docs**: https://playwright.dev/docs/intro

---

**This guide represents battle-tested patterns from documenting 61 screens across landlord, tenant, and shared flows.**
