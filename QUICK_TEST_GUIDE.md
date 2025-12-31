# Quick Test Guide - Invite Flow Fix

## Fresh Token Generated
**Token:** `TEST0711AB12`
**Property:** 3101 Vista Drive
**Expires:** 48 hours from now

## Quick Setup (2 minutes)

```bash
# 1. Kill all processes
pkill -f "expo start" && pkill -f "metro" && lsof -ti:8081 | xargs kill -9 2>/dev/null || true

# 2. Uninstall app (clears AsyncStorage)
xcrun simctl uninstall "iPhone 15 Pro" com.example.myailandlord

# 3. Start Metro
rm -f /tmp/metro.log
EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0 npx expo start --port 8081 > /tmp/metro.log 2>&1 &

# 4. Wait for Metro to be ready
sleep 10

# 5. Build and install (in new terminal or background)
npx expo run:ios --device "iPhone 15 Pro" &

# Wait ~2 minutes for build to complete...
```

## Test Steps

1. **Open invite link:**
   ```bash
   xcrun simctl openurl "iPhone 15 Pro" "myailandlord://invite?t=TEST0711AB12"
   ```

2. **You should see:** PropertyInviteAccept screen with "3101 Vista" property details

3. **Tap:** "Sign Up & Accept" button

4. **Complete signup** with NEW email: `test-fix-$(date +%s)@example.com`

5. **CRITICAL:** Monitor logs during signup:
   ```bash
   tail -f /tmp/metro.log | grep -E "(Auth guard|useProfileSync|redirect|PropertyInviteAccept)"
   ```

## Expected Log Sequence (The Fix)

```
✅ Auth state changed (SIGNED_IN)
✅ Auth guard: Effect triggered
✅ useProfileSync: Skipping - pending invite is being processed  ← THE FIX!
✅ Auth guard: Pending invite detected, setting redirect state
✅ PropertyInviteAccept: Starting accept flow
✅ PropertyInviteAccept: Calling accept_invite RPC
✅ PropertyInviteAccept: Invite accepted successfully
✅ PropertyInviteAccept: Setting tenant role
✅ Navigation to TENANT HOME
```

## Success Criteria

After signup completes, user should:
- ✅ Land on **TENANT HOME** screen
- ❌ NOT see "Let's add your property" (landlord onboarding)
- ✅ See property "3101 Vista" in their tenant view

## If It Fails

Check logs for:
- ❌ `useProfileSync: Creating new profile with role: landlord` ← BAD (fix didn't work)
- ✅ `useProfileSync: Skipping - pending invite is being processed` ← GOOD (fix worked)

## Clean Up After Test

```bash
# Delete test user
PGPASSWORD="0KjIkPbSG2sACfLJ" psql \
  "postgresql://postgres.zxqhxjuwmkxevhkpqfzf:0KjIkPbSG2sACfLJ@aws-0-us-west-1.pooler.supabase.com:6543/postgres" \
  -c "DELETE FROM public.profiles WHERE email LIKE '%test-fix-%@example.com%';"
```
