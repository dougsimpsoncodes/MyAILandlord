#!/bin/bash
set -e

# Fresh Invite Flow Testing Protocol
# This script ensures a completely clean test environment by:
# 1. Killing all Metro/Expo processes
# 2. Clearing app data on simulator
# 3. Generating a fresh invite token
# 4. Restarting Metro
# 5. Launching app with fresh invite link

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🧪 Fresh Invite Flow Testing Protocol"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Step 1: Kill all Metro/Expo processes
echo "📛 Step 1: Killing all Metro/Expo processes..."
pkill -f "expo start" 2>/dev/null || true
pkill -f "node.*metro" 2>/dev/null || true
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
sleep 2
echo "✅ All processes killed"
echo ""

# Step 2: Clear app data on simulator
echo "🗑️  Step 2: Clearing app data on simulator..."
SIMULATOR_NAME="${1:-iPhone 15 Pro}"
xcrun simctl terminate "$SIMULATOR_NAME" com.example.myailandlord 2>/dev/null || true
sleep 1

# Uninstall app to clear all data including AsyncStorage
xcrun simctl uninstall "$SIMULATOR_NAME" com.example.myailandlord 2>/dev/null || echo "App not installed (this is fine)"
sleep 1
echo "✅ App data cleared"
echo ""

# Step 3: Generate fresh invite token
echo "🎟️  Step 3: Generating fresh invite token..."
PROPERTY_ID="${PROPERTY_ID:-761b06b1-e32a-43e9-b885-644e58df1005}"
LANDLORD_ID="${LANDLORD_ID:-213ab4b3-51b1-4f7d-96fc-25f096fd9091}"

# Generate token directly (bypass RPC for testing)
INVITE_RESULT=$(PGPASSWORD="$SUPABASE_DB_PASSWORD" psql \
  "postgresql://postgres.zxqhxjuwmkxevhkpqfzf:$SUPABASE_DB_PASSWORD@aws-0-us-west-1.pooler.supabase.com:6543/postgres" \
  -t -c "
    -- Generate token directly as postgres superuser (testing only)
    DO \$\$
    DECLARE
      v_token TEXT;
      v_salt TEXT;
      v_token_hash TEXT;
      v_invite_id UUID;
    BEGIN
      -- Generate 12-char token
      v_token := upper(substring(
        regexp_replace(encode(gen_random_bytes(10), 'base64'), '[^A-Za-z0-9]', '', 'g')
        from 1 for 12
      ));

      -- Generate salt
      v_salt := encode(gen_random_bytes(16), 'hex');

      -- Hash token with salt
      v_token_hash := encode(digest(v_token || v_salt, 'sha256'), 'hex');

      -- Insert invite
      INSERT INTO public.invites (
        property_id, created_by, token_hash, token_salt,
        delivery_method, expires_at
      )
      VALUES (
        '$PROPERTY_ID'::uuid,
        '$LANDLORD_ID'::uuid,
        v_token_hash,
        v_salt,
        'code',
        NOW() + INTERVAL '48 hours'
      )
      RETURNING id INTO v_invite_id;

      -- Print the token
      RAISE NOTICE '%', v_token;
    END \$\$;
  " 2>&1 | grep "NOTICE:" | sed 's/.*NOTICE:[[:space:]]*//' || echo "")

if [ -z "$INVITE_RESULT" ]; then
  echo "❌ Failed to generate invite token"
  exit 1
fi

TOKEN="$INVITE_RESULT"
echo "✅ Fresh token generated: $TOKEN"
echo ""

# Step 4: Start Metro with fresh logs
echo "🚀 Step 4: Starting Metro bundler..."
rm -f /tmp/metro.log
EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0 npx expo start --port 8081 > /tmp/metro.log 2>&1 &
METRO_PID=$!
echo "   Metro PID: $METRO_PID"
echo "   Waiting for Metro to be ready..."
sleep 8

# Check if Metro started successfully
if ! lsof -ti:8081 > /dev/null; then
  echo "❌ Metro failed to start"
  exit 1
fi
echo "✅ Metro running on port 8081"
echo ""

# Step 5: Build and install app
echo "📱 Step 5: Building and installing app on simulator..."
npx expo run:ios --device "$SIMULATOR_NAME" > /tmp/build.log 2>&1 &
BUILD_PID=$!
echo "   Build PID: $BUILD_PID"
echo "   This will take 2-3 minutes..."
echo "   (Watching build log for completion...)"

# Wait for build to complete
while true; do
  sleep 10
  if grep -q "Build Succeeded" /tmp/build.log 2>/dev/null; then
    break
  fi
  if grep -q "Build Failed" /tmp/build.log 2>/dev/null; then
    echo "❌ Build failed! Check /tmp/build.log"
    exit 1
  fi
  echo "   Still building..."
done

echo "✅ Build succeeded"
echo ""

# Step 6: Launch app
echo "📲 Step 6: Launching app on simulator..."
sleep 3
xcrun simctl launch "$SIMULATOR_NAME" com.example.myailandlord > /dev/null 2>&1 || true
sleep 5
echo "✅ App launched"
echo ""

# Step 7: Open invite link
echo "🔗 Step 7: Opening invite link..."
INVITE_URL="myailandlord://invite?t=$TOKEN"
echo "   Link: $INVITE_URL"
xcrun simctl openurl "$SIMULATOR_NAME" "$INVITE_URL" 2>/dev/null || true
sleep 2
echo "✅ Invite link opened"
echo ""

# Step 8: Instructions for manual testing
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 READY FOR TESTING"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Invite Token: $TOKEN"
echo "Property: 3101 Vista Drive"
echo ""
echo "Manual Test Steps:"
echo "  1. You should see the PropertyInviteAccept screen with property details"
echo "  2. Tap 'Sign Up & Accept' (or similar button)"
echo "  3. Complete signup with NEW email: test-$(date +%s)@example.com"
echo "  4. After signup, auth guard should detect pending invite"
echo "  5. User should land on TENANT HOME (not landlord onboarding)"
echo ""
echo "Watch Metro logs in real-time:"
echo "  tail -f /tmp/metro.log | grep -E '(Auth guard|useProfileSync|redirect)'"
echo ""
echo "Expected log sequence:"
echo "  ✅ Auth state changed (SIGNED_IN)"
echo "  ✅ Auth guard: Effect triggered"
echo "  ✅ useProfileSync: Skipping - pending invite is being processed"
echo "  ✅ Auth guard: Pending invite detected, setting redirect state"
echo "  ✅ PropertyInviteAccept: Starting accept flow"
echo "  ✅ PropertyInviteAccept: Invite accepted successfully"
echo "  ✅ Navigation to tenant home"
echo ""
echo "Press Ctrl+C to stop monitoring"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start monitoring logs
tail -f /tmp/metro.log | grep -E "(Auth state changed|Auth guard|useProfileSync|PropertyInviteAccept|redirect|Setting user)"
