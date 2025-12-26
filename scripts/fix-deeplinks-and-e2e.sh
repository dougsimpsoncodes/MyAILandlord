#!/usr/bin/env bash
set -euo pipefail

# Usage:
# Bash(scripts/fix-deeplinks-and-e2e.sh)               # defaults to port 8082
# Bash(scripts/fix-deeplinks-and-e2e.sh --port 8081)   # custom port
#
# What it does:
# - Backs up files
# - Patches src/AppNavigator.tsx to support /invite?t=... on web (devPrefix)
# - Verifies linking config for PropertyInviteAccept and t param
# - Aligns Playwright baseURL to http://localhost:<PORT>
#
# Requirements: node, jq (only for validation output; optional)

PORT="8082"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --port) PORT="$2"; shift 2;;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
done

ROOT="${ROOT:-$(pwd)}"
APP_NAV="src/AppNavigator.tsx"
PW_CFG="playwright.config.ts"

echo "🔧 Fixing deep-links and E2E config (port=${PORT})"

# Check files
[ -f "$APP_NAV" ] || { echo "❌ Error: $APP_NAV not found"; exit 1; }
[ -f "$PW_CFG" ] || echo "⚠️  Note: $PW_CFG not found (skipping baseURL update)"

# Backups
cp "$APP_NAV" "$APP_NAV.bak.$(date +%Y%m%d%H%M%S)"
[ -f "$PW_CFG" ] && cp "$PW_CFG" "$PW_CFG.bak.$(date +%Y%m%d%H%M%S)"
echo "✅ Backups created"

# 1) Patch AppNavigator.tsx
node - <<'NODE'
const fs = require('fs');
const path = 'src/AppNavigator.tsx';
let s = fs.readFileSync(path, 'utf8');
let changed = false;

// Ensure Platform import (after NavigationContainer import)
if (!s.includes("import { Platform } from 'react-native'")) {
  s = s.replace(
    /import\s+\{\s*NavigationContainer\s*\}\s+from\s+'@react-navigation\/native';\n/,
    "import { NavigationContainer } from '@react-navigation/native';\nimport { Platform } from 'react-native';\n"
  );
  changed = true;
}

// Ensure devPrefix exists before linking
if (!s.includes('const devPrefix = ')) {
  const anchor = /\n\s*const\s+linking\s*=\s*{\s*\n/;
  if (anchor.test(s)) {
    s = s.replace(
      anchor,
      "\n  const devPrefix = Platform.OS === 'web' && typeof window !== 'undefined'\n" +
      "    ? window.location.origin\n" +
      "    : Linking.createURL('/');\n\n  const linking = {\n"
    );
    changed = true;
  }
}

// Force prefixes to include devPrefix first
const prefixesRe = /prefixes:\s*\[[\s\S]*?\],/m;
if (prefixesRe.test(s)) {
  const desired =
    "prefixes: [\n" +
    "      devPrefix,\n" +
    "      'myailandlord://',\n" +
    "      'https://myailandlord.app',\n" +
    "      'https://www.myailandlord.app',\n" +
    "    ],";
  s = s.replace(prefixesRe, desired);
  changed = true;
}

// Ensure PropertyInviteAccept.path = 'invite' and parse includes t
if (!/PropertyInviteAccept:\s*{[\s\S]*?path:\s*'invite'/.test(s)) {
  // Try to insert minimal route if missing (non-destructive fallback)
  s = s.replace(
    /screens:\s*{\s*/m,
    "screens: {\n        PropertyInviteAccept: {\n          path: 'invite',\n          parse: { t: (t: string) => t }\n        },\n"
  );
  changed = true;
} else {
  // Ensure parse has t
  const routeRe = /(PropertyInviteAccept:\s*{[\s\S]*?)(parse:\s*{[\s\S]*?})([\s\S]*?})/m;
  if (routeRe.test(s)) {
    s = s.replace(routeRe, (m, a, parseBlock, c) => {
      if (/parse:\s*\{[\s\S]*\bt:\s*\(/.test(parseBlock)) return m;
      const patched = parseBlock.replace(/parse:\s*\{/, "parse: { t: (t: string) => t, ");
      return a + patched + c;
    });
    changed = true;
  } else {
    // No parse block present, add one
    s = s.replace(/(PropertyInviteAccept:\s*\{[\s\S]*?path:\s*'invite')/, "$1,\n          parse: { t: (t: string) => t }");
    changed = true;
  }
}

if (changed) {
  fs.writeFileSync(path, s);
  console.log('✅ Updated file:', path);
} else {
  console.log('✓ No changes needed in', path);
}
NODE

# 2) Update Playwright baseURL (if present)
if [ -f "$PW_CFG" ]; then
  node - <<NODE
const fs = require('fs');
const path = 'playwright.config.ts';
const PORT = process.env.PORT || '${PORT}';
let s = fs.readFileSync(path, 'utf8');
let changed = false;

// Normalize existing baseURL to http://localhost:PORT
if (/baseURL\s*:\s*['"].*?['"]/.test(s)) {
  s = s.replace(/baseURL\s*:\s*['"].*?['"]/, "baseURL: 'http://localhost:" + PORT + "'");
  changed = true;
} else {
  // Insert baseURL into use: {} if possible
  const useBlock = /use:\s*{\s*([\s\S]*?)}/m;
  if (useBlock.test(s)) {
    s = s.replace(useBlock, (m, inner) => {
      if (/baseURL\s*:\s*['"]/.test(inner)) return m;
      const withBase = "use: {\n    baseURL: 'http://localhost:" + PORT + "',\n" + inner + "\n  }";
      return withBase;
    });
    changed = true;
  } else {
    // As last resort, inject a use block under defineConfig
    const defineRe = /defineConfig\(\{\s*/m;
    if (defineRe.test(s)) {
      s = s.replace(defineRe, "defineConfig({\n  use: { baseURL: 'http://localhost:" + PORT + "' },\n");
      changed = true;
    }
  }
}

if (changed) {
  fs.writeFileSync(path, s);
  console.log('✅ Updated file:', path);
} else {
  console.log('✓ No changes needed in', path);
}
NODE
fi

echo ""
echo "✅ All done."
echo ""
echo "📋 Next steps:"
echo "1) Restart Expo Web on a consistent port (e.g., ${PORT}):"
echo "   EXPO_WEB_PORT=${PORT} npm run web"
echo "2) Manually verify deep-link:"
echo "   Open http://localhost:${PORT}/invite?t=YOUR_CODE in a browser."
echo "   You should land on the invite accept screen."
echo "3) Run E2E for invite code flow:"
echo "   npm run test:e2e -- e2e/flows/invite-code-happy.spec.ts"
echo "4) If your tests use a different port, re-run this script with --port <PORT>."
