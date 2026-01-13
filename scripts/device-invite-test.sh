#!/bin/bash
set -e

# Device Invite Test Helper
# - Generates a fresh invite token
# - Prints ready-to-use deep links for iPhone testing
# - Copies the Expo Go link to your macOS clipboard for convenience
#
# Usage:
#   ./scripts/device-invite-test.sh
#
# Requirements:
#   - psql available locally
#   - SUPABASE_DB_PASSWORD in .env

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📱 iPhone Device Invite Test Helper"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

PROPERTY_ID="${PROPERTY_ID:-761b06b1-e32a-43e9-b885-644e58df1005}"
LANDLORD_ID="${LANDLORD_ID:-213ab4b3-51b1-4f7d-96fc-25f096fd9091}"

if [ -z "$SUPABASE_DB_PASSWORD" ]; then
  echo "❌ SUPABASE_DB_PASSWORD not set. Add it to .env or export it."
  exit 1
fi

echo "🎟️ Generating fresh invite token..."
INVITE_RESULT=$(PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
  "postgresql://postgres.zxqhxjuwmkxevhkpqfzf:$SUPABASE_DB_PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres" \
  -t -c "
    DO \$\$
    DECLARE
      v_token TEXT;
      v_salt TEXT;
      v_token_hash TEXT;
    BEGIN
      v_token := upper(substring(
        regexp_replace(encode(gen_random_bytes(10), 'base64'), '[^A-Za-z0-9]', '', 'g')
        from 1 for 12
      ));
      v_salt := encode(gen_random_bytes(16), 'hex');
      v_token_hash := encode(digest(v_token || v_salt, 'sha256'), 'hex');
      INSERT INTO public.invites (property_id, created_by, token_hash, token_salt, delivery_method, expires_at)
      VALUES ('$PROPERTY_ID'::uuid, '$LANDLORD_ID'::uuid, v_token_hash, v_salt, 'code', NOW() + INTERVAL '48 hours');
      RAISE NOTICE '%', v_token;
    END \$\$;
  " 2>&1 | grep "NOTICE:" | sed 's/.*NOTICE:[[:space:]]*//' || echo "")

if [ -z "$INVITE_RESULT" ]; then
  echo "❌ Failed to generate invite token"
  exit 1
fi

TOKEN="$INVITE_RESULT"
APP_SCHEME="myailandlord"
EXPO_SCHEME="exp+myailandlord"

EXPO_GO_LINK="$EXPO_SCHEME://invite?t=$TOKEN"
CUSTOM_SCHEME_LINK="$APP_SCHEME://invite?t=$TOKEN"
UNIVERSAL_LINK="https://myailandlord.app/invite?t=$TOKEN"

echo "✅ Token: $TOKEN"
echo ""
echo "🔗 Links"
echo "  • Expo Go (recommended for quick test):  $EXPO_GO_LINK"
echo "  • Custom scheme (dev client build):     $CUSTOM_SCHEME_LINK"
echo "  • Universal link (real build + AASA):   $UNIVERSAL_LINK"
echo ""

# Copy the Expo Go link to clipboard (macOS)
if command -v pbcopy >/dev/null 2>&1; then
  printf "%s" "$EXPO_GO_LINK" | pbcopy
  echo "📋 Expo Go link copied to clipboard"
fi

cat <<EOF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Next steps on your iPhone
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Option A — Expo Go (fastest)
1) Install "Expo Go" from the App Store.
2) In this repo, run: npm start and choose Tunnel.
3) On iPhone: scan the QR to open the project in Expo Go.
4) Open Safari on iPhone and paste this link:
   $EXPO_GO_LINK
   (Or copy the raw token "$TOKEN" and tap "Paste Invite" on the app spinner.)

Option B — Dev Client (custom scheme)
1) Connect your iPhone via USB and trust the computer.
2) Run: npx expo run:ios --device "<Your iPhone Name>"
3) After install, open Safari on iPhone and paste:
   $CUSTOM_SCHEME_LINK

Option C — Universal Link (real build with AASA)
1) Install a dev/adhoc TestFlight build with associated domains set.
2) Open Safari on iPhone and paste:
   $UNIVERSAL_LINK

Expected result
- App shows PropertyInviteAccept screen, then proceeds to tenant home (zero-flash) after acceptance.

EOF

echo "✅ Ready. Use one of the options above on your iPhone."

