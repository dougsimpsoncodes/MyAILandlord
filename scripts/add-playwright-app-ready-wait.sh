#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------------------------
# Claude Code Patch Script — Playwright app-ready wait
#
# What this does (idempotent, with backups):
# 1) Adds e2e/utils/app-ready.ts with waitForAppReady(page)
#    - Waits for testID="app-ready" (hidden marker mounted in AppNavigator)
#    - Waits for DOM content ready + a short settle
# 2) Integrates wait into the invite E2E flow
#    - e2e/flows/invite-code-happy.spec.ts: waits at top of test
# 3) Optionally bumps default expect timeout a bit (non-destructive)
# ------------------------------------------------------------------------------

APP_READY_UTIL="e2e/utils/app-ready.ts"
INVITE_SPEC="e2e/flows/invite-code-happy.spec.ts"
PW_CFG="playwright.config.ts"

mkdir -p e2e/utils

# 1) Add helper util (idempotent overwrite is fine)
cat > "$APP_READY_UTIL" <<'TS'
import { Page } from '@playwright/test';

export async function waitForAppReady(page: Page, opts?: { timeout?: number }) {
  const timeout = opts?.timeout ?? 30000;

  // Ensure DOM is loaded
  await page.waitForLoadState('domcontentloaded', { timeout });

  // Wait for the hidden "app-ready" test marker
  // This is rendered in AppNavigator outside NavigationContainer
  const marker = page.getByTestId('app-ready');
  await marker.waitFor({ timeout });

  // Short settle for hydration/React initial work
  await page.waitForTimeout(250);
}
TS
echo "✅ Wrote: $APP_READY_UTIL"

# 2) Patch invite-code-happy.spec.ts to call waitForAppReady(page) at start of test
if [ -f "$INVITE_SPEC" ]; then
  BACKUP="${INVITE_SPEC}.bak.$(date +%Y%m%d%H%M%S)"
  cp "$INVITE_SPEC" "$BACKUP"
  echo "✅ Backup created: $BACKUP"

  node - <<'NODE'
const fs = require('fs');
const path = 'e2e/flows/invite-code-happy.spec.ts';
let s = fs.readFileSync(path, 'utf8');
let changed = false;

// Add import for waitForAppReady if missing
if (!/from ['"]..\/utils\/app-ready['"]/.test(s)) {
  s = s.replace(
    /import\s+\{\s*test,\s*expect\s*\}\s*from\s*['"]@playwright\/test['"];?/,
    (m) => `${m}\nimport { waitForAppReady } from '../utils/app-ready';`
  );
  changed = true;
}

// Insert waitForAppReady(page) near top of test body.
// We will add right after the first opening of the test block.
const testBlockRe = /(test\([^)]+\)\s*=>\s*\(\s*\{\s*page[^}]*\}\s*\)\s*=>\s*\{\s*)([\s\S]*?)/m;
if (testBlockRe.test(s) && !/waitForAppReady\(page\)/.test(s)) {
  s = s.replace(testBlockRe, (m, start, rest) => {
    const inject = `  // Ensure app has hydrated before interactions\n  await waitForAppReady(page);\n\n`;
    return `${start}${inject}${rest}`;
  });
  changed = true;
}

// Fallback pattern if the test signature differs (classic form)
const classicRe = /(test\([^)]+\)\s*async\s*\(\s*\{\s*page[^}]*\}\s*\)\s*\{\s*)([\s\S]*?)/m;
if (!/waitForAppReady\(page\)/.test(s) && classicRe.test(s)) {
  s = s.replace(classicRe, (m, start, rest) => {
    const inject = `  // Ensure app has hydrated before interactions\n  await waitForAppReady(page);\n\n`;
    return `${start}${inject}${rest}`;
  });
  changed = true;
}

if (changed) {
  fs.writeFileSync(path, s);
  console.log('✅ Updated file:', path);
} else {
  console.log('ℹ️  No changes needed:', path);
}
NODE
else
  echo "⚠️  Note: $INVITE_SPEC not found. Skipping test integration patch."
fi

# 3) Optional: bump default expect timeout slightly (non-destructive)
if [ -f "$PW_CFG" ]; then
  BACKUP_CFG="${PW_CFG}.bak.$(date +%Y%m%d%H%M%S)"
  cp "$PW_CFG" "$BACKUP_CFG"
  echo "✅ Backup created: $BACKUP_CFG"

  node - <<'NODE'
const fs = require('fs');
const path = 'playwright.config.ts';
let s = fs.readFileSync(path, 'utf8');
let changed = false;

// Ensure expect: { timeout: 10000 } (or bump existing if lower)
if (/expect:\s*\{\s*timeout:\s*\d+\s*\}/.test(s)) {
  s = s.replace(/expect:\s*\{\s*timeout:\s*\d+\s*\}/, (m) => {
    const current = Number((m.match(/\d+/) || [0])[0]);
    if (current < 10000) {
      changed = true;
      return 'expect: { timeout: 10000 }';
    }
    return m;
  });
} else {
  // Insert expect into use: {} if present
  const useRe = /use:\s*\{\s*([\s\S]*?)\}/m;
  if (useRe.test(s)) {
    s = s.replace(useRe, (m, inner) => {
      if (/expect:\s*\{/.test(inner)) return m;
      changed = true;
      return `use: {\n    expect: { timeout: 10000 },\n    ${inner}\n  }`;
    });
  } else {
    // Add defineConfig({ use: { expect: { timeout: 10000 } } })
    const defRe = /defineConfig\(\{\s*/m;
    if (defRe.test(s)) {
      s = s.replace(defRe, `defineConfig({\n  use: { expect: { timeout: 10000 } },\n  `);
      changed = true;
    }
  }
}

if (changed) {
  fs.writeFileSync(path, s);
  console.log('✅ Updated file:', path);
} else {
  console.log('ℹ️  No changes needed:', path);
}
NODE
else
  echo "⚠️  Note: $PW_CFG not found. Skipping expect timeout patch."
fi

echo ""
echo "✅ All done."
echo ""
echo "Next steps:"
echo "- Re-run the invite E2E with a fresh server instance on the same port you configured."
echo "  npx playwright test e2e/flows/invite-code-happy.spec.ts --project='Desktop Chrome' --reporter=line"
echo "- If a different flow needs the wait, import { waitForAppReady } from '../utils/app-ready' and call it at the top."
