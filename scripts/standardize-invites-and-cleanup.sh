#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------------------------
# Claude Code Patch Script — Standardize Invites + E2E Reliability
#
# What this script does (idempotent, with backups):
# 1) Standardize invites on the "simple invites" system:
#    - Landlord onboarding uses create_invite RPC
#    - URLs use ?t= (not ?token=)
#    - Removes any legacy tokenized flow + feature flag references
# 2) Add a hidden "app-ready" test marker to AppNavigator for stable E2E waits
# 3) Pin Playwright baseURL and webServer to a single port for repeatable tests
# 4) Write a Supabase migration to remove legacy tokenized invites system
#    - Drops public.invite_tokens and legacy RPCs (generate_/validate_/accept_invite_token)
# 5) Print any remaining references to legacy RPCs/links (so you can clean up)
#
# Run:
#   Bash(scripts/standardize-invites-and-cleanup.sh --port 8081)
# Then:
#   EXPO_WEB_PORT=8081 npm run web
#   Clear browser site data + service worker, hard refresh (Cmd+Shift+R)
#   Generate a fresh invite and test auto-accept with a brand-new email
#   Apply the generated SQL migration in Supabase SQL Editor
# ------------------------------------------------------------------------------

PORT="8081"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --port) PORT="$2"; shift 2;;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
done

ONBOARDING_FILE="src/screens/onboarding/LandlordTenantInviteScreen.tsx"
APP_NAV_FILE="src/AppNavigator.tsx"
PW_CFG="playwright.config.ts"
SQL_MIGRATION_DIR="supabase/migrations"
SQL_MIGRATION_FILE="${SQL_MIGRATION_DIR}/$(date +%Y%m%d%H%M%S)_drop_legacy_invite_tokens.sql"

require() {
  command -v "$1" >/dev/null 2>&1 || { echo "Error: $1 is required"; exit 1; }
}
require node

patch_onboarding() {
  if [ ! -f "$ONBOARDING_FILE" ]; then
    echo "Skip: $ONBOARDING_FILE not found."
    return
  fi

  local BACKUP="${ONBOARDING_FILE}.bak.$(date +%Y%m%d%H%M%S)"
  cp "$ONBOARDING_FILE" "$BACKUP"
  echo "Backup created: $BACKUP"

  node - <<'NODE'
const fs = require('fs');
const path = 'src/screens/onboarding/LandlordTenantInviteScreen.tsx';
let s = fs.readFileSync(path, 'utf8');
let changed = false;

// 1) Remove legacy feature flag import (shouldUseTokenizedInvites) if present
s = s.replace(/^\s*import\s*{\s*shouldUseTokenizedInvites\s*}\s*from\s*['"][^'"]+['"];\s*$/m, () => { changed = true; return ''; });

// 2) Remove tokenized flow state if present
s = s.replace(/^\s*const\s*\[\s*useTokenizedFlow\s*,\s*setUseTokenizedFlow\s*\]\s*=\s*useState\([^\)]*\);\s*$/m, () => { changed = true; return ''; });
s = s.replace(/setUseTokenizedFlow\s*\([^\)]*\);\s*/g, () => { changed = true; return ''; });

// 3) Remove generateTokenizedInvite function if present
s = s.replace(/const\s+generateTokenizedInvite\s*=\s*async\s*\([^\)]*\)\s*=>\s*{[\s\S]*?\n\s*};\s*/m, () => { changed = true; return ''; });

// 4) Replace generateInviteUrl() with simple invites using create_invite and ?t=
const genFnRe = /const\s+generateInviteUrl\s*=\s*async\s*\([^\)]*\)\s*=>\s*{[\s\S]*?\n};/m;
if (genFnRe.test(s)) {
  const replacement = `
  const generateInviteUrl = async () => {
    setIsGenerating(true);
    try {
      const isWeb = Platform.OS === 'web';

      // Standardized flow: Simple invites (create_invite)
      const { data, error } = await supabase.rpc('create_invite', {
        p_property_id: propertyId,
        p_delivery_method: 'code',
        p_intended_email: null
      });

      if (error || !data || !Array.isArray(data) || !data[0]?.token) {
        const msg = error?.message || 'No token returned';
        console.error('[INVITES] ❌ RPC error (create_invite):', error);
        setGenerationError(msg);
        Alert.alert('Error', 'Failed to generate invite link. Please try again.');
        return;
      }

      const token = data[0].token;
      const origin = isWeb && typeof window !== 'undefined'
        ? window.location.origin
        : 'https://myailandlord.app';
      const url = (isWeb ? origin : 'myailandlord://') + \`/invite?t=\${token}\`;

      setInviteUrl(url);
      setGenerationError(null);
      if (__DEV__) console.log('[INVITES] ✅ Invite URL set (simple):', url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to generate invite link';
      console.error('[INVITES] ❌ Exception generating invite URL:', e);
      setGenerationError(msg);
      Alert.alert('Error', 'Failed to generate invite link. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };`;
  s = s.replace(genFnRe, replacement);
  changed = true;
}

// 5) Normalize any '?token=' leftovers in file to '?t='
s = s.replace(/\?token=/g, '?t=');

// Write back if changed
if (changed) {
  fs.writeFileSync(path, s);
  console.log('Updated file:', path);
} else {
  console.log('No changes needed (already standardized):', path);
}
NODE
}

patch_app_ready_marker() {
  if [ ! -f "$APP_NAV_FILE" ]; then
    echo "Skip: $APP_NAV_FILE not found."
    return
  fi

  local BACKUP="${APP_NAV_FILE}.bak.$(date +%Y%m%d%H%M%S)"
  cp "$APP_NAV_FILE" "$BACKUP"
  echo "Backup created: $BACKUP"

  node - <<'NODE'
const fs = require('fs');
const path = 'src/AppNavigator.tsx';
let s = fs.readFileSync(path, 'utf8');
let changed = false;

// Ensure import { View } from 'react-native'
if (!s.includes("import { Platform") && s.includes("from 'react-native';")) {
  // nothing
} else {
  // Try to add View alongside Platform (or add a separate import)
  if (s.includes("import { Platform } from 'react-native';") && !s.includes("import { Platform, View } from 'react-native';")) {
    s = s.replace("import { Platform } from 'react-native';", "import { Platform, View } from 'react-native';");
    changed = true;
  } else if (!s.includes("import { View } from 'react-native';") && s.includes("from 'react-native';")) {
    s = s.replace("from 'react-native';", ", View } from 'react-native';");
    changed = true;
  }
}

// Add hidden app-ready marker inside NavigationContainer (idempotent)
if (!s.includes('testID="app-ready"')) {
  s = s.replace(
    /<NavigationContainer[^>]*>/,
    (m) => `${m}\n      <View testID="app-ready" style={{ display: 'none' }} />`
  );
  changed = true;
}

if (changed) {
  fs.writeFileSync(path, s);
  console.log('Updated file:', path);
} else {
  console.log('No changes needed (app-ready marker present):', path);
}
NODE
}

patch_playwright() {
  if [ ! -f "$PW_CFG" ]; then
    echo "Note: $PW_CFG not found. Skipping Playwright config patch."
    return
  fi

  local BACKUP="${PW_CFG}.bak.$(date +%Y%m%d%H%M%S)"
  cp "$PW_CFG" "$BACKUP"
  echo "Backup created: $BACKUP"

  PORT_JS="$PORT" node - <<'NODE'
const fs = require('fs');
const path = 'playwright.config.ts';
const PORT = process.env.PORT_JS || '8081';
let s = fs.readFileSync(path, 'utf8');
let changed = false;

// 1) Set baseURL to http://localhost:PORT
if (/baseURL\s*:\s*['"].*?['"]/.test(s)) {
  s = s.replace(/baseURL\s*:\s*['"].*?['"]/, `baseURL: 'http://localhost:${PORT}'`);
  changed = true;
} else {
  // Insert into use: block if possible
  const useRe = /use:\s*{\s*([\s\S]*?)}/m;
  if (useRe.test(s)) {
    s = s.replace(useRe, (m, inner) => {
      if (/baseURL\s*:\s*['"]/.test(inner)) return m;
      return `use: {\n    baseURL: 'http://localhost:${PORT}',\n${inner}\n  }`;
    });
    changed = true;
  } else {
    // Fallback: add defineConfig({ use: { baseURL: ... } })
    const defRe = /defineConfig\(\{\s*/m;
    if (defRe.test(s)) {
      s = s.replace(defRe, `defineConfig({\n  use: { baseURL: 'http://localhost:${PORT}' },\n`);
      changed = true;
    }
  }
}

// 2) Add webServer config so Playwright starts Expo Web (idempotent-ish)
if (!/webServer\s*:\s*{/.test(s)) {
  const defRe = /defineConfig\(\{\s*/m;
  if (defRe.test(s)) {
    s = s.replace(defRe,
      `defineConfig({\n  webServer: {\n    command: 'EXPO_WEB_PORT=${PORT} npm run web',\n    url: 'http://localhost:${PORT}',\n    reuseExistingServer: !process.env.CI,\n    timeout: 120000\n  },\n`
    );
    changed = true;
  }
}

if (changed) {
  fs.writeFileSync(path, s);
  console.log('Updated file:', path);
} else {
  console.log('No changes needed (Playwright already configured):', path);
}
NODE
}

write_drop_legacy_migration() {
  mkdir -p "$SQL_MIGRATION_DIR"
  cat > "$SQL_MIGRATION_FILE" <<'SQL'
-- Drop legacy tokenized invites system (invite_tokens + legacy RPCs)
-- Keep the newer simple invites system (public.invites + create_invite/validate_invite/accept_invite)
-- Review before running in production.

BEGIN;

-- Drop legacy RPCs if they exist (signatures may vary; include common forms)
DROP FUNCTION IF EXISTS public.generate_invite_token(uuid, integer, integer);
DROP FUNCTION IF EXISTS public.generate_invite_token(uuid, int4, int4);
DROP FUNCTION IF EXISTS public.validate_invite_token(text);
DROP FUNCTION IF EXISTS public.accept_invite_token(text, uuid);

-- Drop legacy table (and dependent objects) if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invite_tokens') THEN
    EXECUTE 'DROP TABLE public.invite_tokens CASCADE';
  END IF;
END
$$;

COMMIT;

-- Notes:
-- - This migration removes the Dec 21 tokenized invites system.
-- - The Dec 24 simple invites system remains (public.invites + create_invite/validate_invite/accept_invite).
-- - Ensure no remaining application code references the legacy RPCs before applying.
SQL
  echo "Migration written: $SQL_MIGRATION_FILE"
}

scan_for_legacy_refs() {
  echo "Scanning for any remaining references to legacy tokenized RPCs..."
  if command -v rg >/dev/null 2>&1; then
    rg -n "generate_invite_token|validate_invite_token|accept_invite_token|\\?token=" || true
  else
    echo "Install ripgrep (rg) for detailed scanning (brew install ripgrep)."
    grep -Rn "generate_invite_token\\|validate_invite_token\\|accept_invite_token\\|\\?token=" . || true
  fi
}

main() {
  echo "Standardizing invites, adding E2E stability, and preparing legacy cleanup..."
  patch_onboarding
  patch_app_ready_marker
  patch_playwright
  write_drop_legacy_migration
  scan_for_legacy_refs

  echo ""
  echo "Next steps:"
  echo "1) Restart Expo Web on your test port and clear service worker + site data:"
  echo "   EXPO_WEB_PORT=${PORT} npm run web"
  echo "   - DevTools → Application → Service Workers → Unregister"
  echo "   - Application → Storage → Clear site data"
  echo "   - Network tab → Disable cache → Hard refresh (Cmd+Shift+R)"
  echo "2) Generate a fresh invite and test auto-accept with a brand-new email."
  echo "   Link format should be: http://localhost:${PORT}/invite?t=XXXXXXXXXXXX"
  echo "3) Apply the migration in Supabase SQL Editor to drop legacy tokenized invites:"
  echo "   ${SQL_MIGRATION_FILE}"
  echo "4) Playwright now auto-starts Expo Web and targets http://localhost:${PORT}."
  echo "   Run E2E: npx playwright test e2e/flows/invite-code-happy.spec.ts --project='Desktop Chrome'"
}

main
