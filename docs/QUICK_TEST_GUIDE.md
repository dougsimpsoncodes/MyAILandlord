# Quick Test Guide - iPhone Invite Flow

## TL;DR

```bash
# Fresh test (recommended when Metro was acting weird):
./scripts/claude-test-invite-on-iphone.sh --clean

# Quick test (if Metro is already running fine):
./scripts/claude-test-invite-on-iphone.sh
```

## What This Tests

End-to-end tenant invite acceptance flow:
1. Landlord creates invite → generates token
2. Tenant clicks link → opens PropertyInviteAcceptScreen
3. Tenant accepts → lands on Tenant Home (NOT landlord onboarding)

**Critical bugs this catches:**
- Race condition between ProfileContext and useProfileSync
- Metro serving stale cached JavaScript
- Deep link not routing to PropertyInviteAcceptScreen
- Wrong role assignment (landlord vs tenant)

## When to Use

- After fixing bugs in invite flow logic
- After modifying ProfileContext or useProfileSync
- Before merging any authentication or navigation changes
- When Metro cache seems off (use `--clean`)

## Prerequisites

- iPhone connected to same network as Mac (for Expo Go)
- OR iPhone connected via USB (for dev client build)
- Expo Go app installed (easiest) OR dev client built (`npx expo run:ios --device`)
- `.env` file with `SUPABASE_DB_PASSWORD`

## Test Flow

The script automates:
1. **Token generation** - Creates fresh invite in database
2. **Metro setup** - Guides starting Expo (Tunnel mode)
3. **Deep link trigger** - Instructions for opening invite on iPhone
4. **Log monitoring** - Streams filtered logs showing success/failure markers

## Success Criteria

### Logs Should Show:
```
✅ ProfileContext: Profile cached { role: 'tenant' }
✅ useProfileSync: Using database role (source of truth): tenant
✅ PropertyInviteAccept: Invite accepted successfully
✅ PropertyInviteAccept: Navigating directly to tenant home
```

### Visual on iPhone:
- Tenant Home screen with **GREEN tab bar** (not orange landlord tabs)
- Bottom navigation shows: Home, Requests, Messages, Profile
- Should NOT see "Let's add your first property" (landlord onboarding)

## Failure Patterns

### ❌ Race Condition Bug (FIXED)
```
useProfileSync: Creating new profile with role: landlord
useProfileSync error: { ... }
```
**Visual:** "Let's add your first property" screen appears instead of Tenant Home

**If you see this:** The three-state ProfileContext fix isn't working. Check:
- `src/context/ProfileContext.tsx:47` - `profile` should start as `undefined`
- `src/hooks/useProfileSync.ts:80` - Should wait for `profile !== undefined`

### ❌ Metro Serving Stale Code
```
# Old buggy logs appear even after fixing code
useProfileSync: Creating new profile...  # Should not happen after fix
```
**Visual:** App behavior doesn't match your code changes

**Fix:**
```bash
./scripts/claude-test-invite-on-iphone.sh --clean
```

### ❌ Deep Link Not Working
```
# No logs appear after pasting link
```
**Visual:** App doesn't navigate to PropertyInviteAcceptScreen

**Fix:** Use Tunnel mode + manual URL entry in Expo Go (Metro auto-discovery bug on physical iOS)

## Related Scripts

- `scripts/device-invite-test.sh` - Token generation only (used by main script)
- `scripts/cleanup-db-except-whitelist.sh` - Reset database to clean state

## Known Issues

### Metro Auto-Discovery on Physical iPhone
**Problem:** After scanning QR in Expo Go, iPhone shows "No dev servers found"

**Root Cause:** Expo SDK has known mDNS/Bonjour auto-discovery bug with physical iOS devices (issues #29005, #40791)

**Workaround:**
1. Use Tunnel mode (`npm start` → DevTools → Connection = Tunnel)
2. In Expo Go: tap "Enter URL manually"
3. Paste Tunnel URL from DevTools (e.g., `exp://xyz.tunnel.dev`)
4. OR use your Mac's IP:8081 (find with `ipconfig getifaddr en0`)

### Session Persistence
If sessions don't persist after closing app, verify:
- `src/lib/supabaseClient.ts` has `storage: AsyncStorage` configured
- AsyncStorage package is installed: `@react-native-async-storage/async-storage`

## Architecture Notes

This test validates the zero-flash navigation architecture (RootNavigator → Bootstrap → decision):

```
User clicks invite link
  ↓
Deep link captured by Expo
  ↓
PendingInviteService saves token to AsyncStorage
  ↓
Bootstrap screen detects pending invite
  ↓
navigation.reset() to PropertyInviteAcceptScreen
  ↓
User accepts invite (sets role='tenant' in DB)
  ↓
ProfileContext loads profile with role='tenant'
  ↓
useProfileSync waits for ProfileContext, uses DB role as source of truth
  ↓
Bootstrap makes final decision: navigation.reset() to Main (tenant)
  ↓
Tenant Home screen renders with green tab bar
```

**Critical timing:** ProfileContext MUST finish loading before useProfileSync creates a new profile. This is enforced by:
- Three-state pattern: `undefined` (not checked) → `null` (checked, no profile) → `object` (checked, profile exists)
- Wait logic in useProfileSync: `if (profile === undefined) return;`
- Refresh-once logic: Double-check database before creating new profile

## Debugging Tips

### View Full Logs
```bash
npx expo logs
```

### Filter for Specific Component
```bash
npx expo logs | grep "ProfileContext"
npx expo logs | grep "useProfileSync"
npx expo logs | grep "Bootstrap"
```

### Check Pending Invite in AsyncStorage
- Use React Native Debugger or Flipper
- Look for `@MyAILandlord:pendingInvite` key

### Verify Database Role
```bash
# After accepting invite
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
  "postgresql://postgres.zxqhxjuwmkxevhkpqfzf:$SUPABASE_DB_PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres" \
  -c "SELECT email, role FROM profiles WHERE email = 'm@man.com';"
```

## Lessons Learned

From 4+ hours of debugging this flow:

1. **Metro cache is aggressive** - Always use `--clean` when debugging
2. **Three-state pattern prevents race conditions** - `undefined` ≠ `null` ≠ `object`
3. **ProfileContext is source of truth** - useProfileSync should wait for it
4. **Physical iOS devices need Tunnel mode** - QR scan auto-discovery fails
5. **Linters can solve problems humans can't** - The `refreshedOnceRef` fix came from auto-fix
6. **Visual confirmation matters** - Green tab bar = tenant, orange = landlord

## See Also

- [Metro/Expo Expert Skill](.claude/skills/metro-expo-expert/README.md) - Deep dive into Metro cache management
- [Zero-Flash Navigation Architecture](./docs/ZERO_FLASH_NAVIGATION.md) - Full architectural explanation
