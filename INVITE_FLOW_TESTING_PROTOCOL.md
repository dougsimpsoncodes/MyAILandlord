# Invite Flow Testing Protocol

## The Golden Rule

**NEVER reuse old invite links or test with stale app state.**

Every invite flow test MUST start with:
1. ✅ Fresh Metro server
2. ✅ Clean app installation (no cached data)
3. ✅ Brand new invite token
4. ✅ Fresh database state (optional: delete test users)

## Why This Matters

**Reusing old invite links causes false failures:**
- Tokens expire or get consumed
- AsyncStorage retains old invite data
- Database state becomes inconsistent
- You can't tell if bugs are real or artifacts

**The race condition we're testing is subtle:**
- useProfileSync vs Auth Guard timing
- Profile creation with/without pending invite
- Role determination logic

Starting fresh every time ensures:
- **Reproducible results**
- **Accurate debugging**
- **Confidence in fixes**

## Quick Start

### Option 1: Automated Script (Recommended)

```bash
# Run the full automated testing protocol
./scripts/test-invite-flow-fresh.sh

# Specify a different simulator
./scripts/test-invite-flow-fresh.sh "iPhone 14 Pro"
```

This script:
1. Kills all Metro/Expo processes
2. Uninstalls app from simulator (clears AsyncStorage)
3. Generates a fresh invite token from database
4. Starts Metro with clean logs
5. Builds and installs app
6. Opens the fresh invite link
7. Monitors logs in real-time

**Total time: ~3 minutes** (mostly build time)

### Option 1b: Real iPhone (Expo Go) — Quickest Device Test

```bash
# 1) Generate token + get ready-to-use links (copied to clipboard)
./scripts/device-invite-test.sh

# 2) Start Expo with Tunnel so your iPhone can connect
npm start  # choose Tunnel in DevTools
```

On your iPhone:
- Install “Expo Go” from the App Store
- Scan the QR from DevTools to open the project in Expo Go
- In Safari, paste the Expo Go link printed by the script (exp+myailandlord://invite?t=TOKEN)
  - Or copy the raw token and tap the “Paste Invite” dev button on the Bootstrap spinner

Expected: App routes to PropertyInviteAccept, then to tenant home after acceptance (zero-flash).

### Option 1c: Real iPhone (Dev Client) — Full Scheme Test

```bash
# 1) Generate a token + see both custom and universal links
./scripts/device-invite-test.sh

# 2) Install a dev client build directly to your iPhone (USB)
npx expo run:ios --device "<Your iPhone Name>"
```

On your iPhone:
- Open Safari and paste the custom scheme link shown by the script:
  `myailandlord://invite?t=TOKEN`

Note:
- Universal links (`https://myailandlord.app/invite?...`) require AASA and will work on a real build (TestFlight/adhoc). Expo Go won’t handle universal links.

### Option 2: Manual Steps

If you need more control:

```bash
# 1. Kill processes
pkill -f "expo start" && pkill -f "metro" && lsof -ti:8081 | xargs kill -9

# 2. Uninstall app
xcrun simctl uninstall "iPhone 15 Pro" com.example.myailandlord

# 3. Generate fresh token
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
  "postgresql://postgres.zxqhxjuwmkxevhkpqfzf:$SUPABASE_DB_PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres" \
  -t -c "
    SELECT token FROM public.create_invite(
      p_property_id := '761b06b1-e32a-43e9-b885-644e58df1005'::uuid,
      p_delivery_method := 'code',
      p_intended_email := NULL
    );
  "

# 4. Start Metro
rm -f /tmp/metro.log
EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0 npx expo start --port 8081 > /tmp/metro.log 2>&1 &

# 5. Build and install
npx expo run:ios --device "iPhone 15 Pro"

# 6. Open invite link with fresh token
xcrun simctl openurl "iPhone 15 Pro" "myailandlord://invite?t=YOUR_FRESH_TOKEN"
```

## Test Checklist

### Before Starting Test
- [ ] All Metro/Expo processes killed
- [ ] App uninstalled from simulator (or simulator reset)
- [ ] Fresh invite token generated
- [ ] Metro logs cleared (`/tmp/metro.log`)
- [ ] (Optional) Previous test user deleted from database

### During Test
- [ ] Monitor Metro logs in real-time
- [ ] Use NEW test email for signup (never reuse)
- [ ] Watch for auth guard log sequence

### Expected Log Sequence

```
✅ 1. Auth state changed (SIGNED_IN)
✅ 2. Auth guard: Effect triggered
✅ 3. useProfileSync: Skipping - pending invite is being processed
✅ 4. Auth guard: Pending invite detected, setting redirect state
✅ 5. PropertyInviteAccept: Starting accept flow
✅ 6. PropertyInviteAccept: Creating minimal profile (role will be set after accept)
✅ 7. PropertyInviteAccept: Calling accept_invite RPC
✅ 8. PropertyInviteAccept: Invite accepted successfully
✅ 9. PropertyInviteAccept: Setting tenant role after successful acceptance
✅ 10. Navigation to tenant home
```

### Success Criteria
- [ ] User sees PropertyInviteAccept screen with property details
- [ ] Signup completes without errors
- [ ] Auth guard detects pending invite (log confirms)
- [ ] useProfileSync SKIPS profile creation (log confirms)
- [ ] accept_invite RPC succeeds
- [ ] User role set to 'tenant' (not 'landlord')
- [ ] **User lands on TENANT HOME screen** (not landlord onboarding)

## Common Issues

### Issue: "Token invalid or expired"
**Cause:** Reusing an old token
**Fix:** Generate a fresh token with the script or manually

### Issue: User lands on landlord onboarding
**Cause:** useProfileSync created profile with role='landlord' before accept
**Fix:** Check logs for "useProfileSync: Skipping - pending invite" message. If missing, the fix didn't work.

### Issue: Metro port already in use
**Cause:** Old Metro process still running
**Fix:** `lsof -ti:8081 | xargs kill -9`

### Issue: Build fails
**Cause:** Various Xcode/dependency issues
**Fix:** Check `/tmp/build.log` for errors

## Database Cleanup (Optional)

To delete test users between tests:

```bash
PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
  "postgresql://postgres.zxqhxjuwmkxevhkpqfzf:$SUPABASE_DB_PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres" \
  -c "
    -- Delete test users (be specific with email pattern!)
    DELETE FROM public.profiles WHERE email LIKE '%test-%@example.com%';

    -- Verify
    SELECT COUNT(*) FROM public.profiles WHERE email LIKE '%test-%@example.com%';
  "
```

## Log Monitoring

Watch critical logs in real-time:

```bash
# All auth guard activity
tail -f /tmp/metro.log | grep -E "(Auth guard|useProfileSync)"

# Full invite flow
tail -f /tmp/metro.log | grep -E "(PropertyInviteAccept|Auth guard|redirect)"

# Just errors
tail -f /tmp/metro.log | grep -i error
```

## Environment Variables

The script uses these from `.env`:

```bash
SUPABASE_DB_PASSWORD=your_password
PROPERTY_ID=761b06b1-e32a-43e9-b885-644e58df1005  # Optional: 3101 Vista property
LANDLORD_ID=213ab4b3-51b1-4f7d-96fc-25f096fd9091  # Optional: landlord user
```

## Troubleshooting

### Script fails at "Generating fresh invite token"
- Check `SUPABASE_DB_PASSWORD` in `.env`
- Verify database connection: `psql $DATABASE_URL -c "SELECT 1"`
- Ensure `create_invite` function exists in database

### Deep link doesn't open invite screen
- iOS simulator deep linking can be flaky
- Try: Open Safari → paste `myailandlord://invite?t=TOKEN` → tap Go
- Or manually tap a link in Notes app
- On a real iPhone, prefer Expo Go with Tunnel or a dev client build. You can also use the dev-only “Paste Invite” button on the Bootstrap spinner to simulate the flow using a token from the clipboard.

### App shows "Error: Invalid invite link"
- Token was already used or expired
- Generate a fresh token and restart test

## Advanced: Custom Property Testing

To test with a different property:

```bash
# Set environment variables before running script
export PROPERTY_ID="your-property-uuid"
export LANDLORD_ID="your-landlord-uuid"

./scripts/test-invite-flow-fresh.sh
```

## CI/CD Integration (Future)

This protocol can be automated in CI:

```yaml
# .github/workflows/test-invite-flow.yml
- name: Test invite flow
  run: ./scripts/test-invite-flow-fresh.sh "iPhone 15 Pro"
  env:
    SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
```

## Summary

**Golden Rule:** Fresh server + Fresh app + Fresh token = Reliable tests

Every test starts with:
```bash
./scripts/test-invite-flow-fresh.sh
```

No exceptions. No shortcuts. No reused tokens.

This ensures:
- ✅ Reproducible results
- ✅ Accurate debugging
- ✅ Confidence in fixes
- ✅ Production-ready code
