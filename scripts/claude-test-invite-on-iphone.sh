#!/usr/bin/env bash
set -euo pipefail

# Claude iPhone Invite Flow Test Script (Enhanced)
# - Cleans caches + processes (optional flag)
# - Generates fresh invite token
# - Guides Tunnel setup with Metro auto-discovery workaround
# - Provides Expo Go and Dev Client paths
# - Streams filtered logs and cleans up on exit

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

bold() { printf "\033[1m%s\033[0m\n" "$*"; }
info() { printf "[info] %s\n" "$*"; }
warn() { printf "[warn] %s\n" "$*"; }
err() { printf "[error] %s\n" "$*"; }

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🤖 Claude: iPhone Invite Flow Test (Enhanced)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ "${1:-}" = "--clean" ]; then
  bold "Step 0 — Clean environment (processes + caches)"
  info "Killing Metro/Expo and freeing port 8081..."
  pkill -f "expo start" 2>/dev/null || true
  pkill -f "node.*metro" 2>/dev/null || true
  lsof -ti:8081 | xargs kill -9 2>/dev/null || true
  sleep 1
  info "Clearing caches (.expo, Metro, watchman)..."
  rm -rf .expo .expo-shared 2>/dev/null || true
  rm -rf node_modules/.cache/metro 2>/dev/null || true
  if command -v watchman >/dev/null 2>&1; then
    watchman watch-del-all 2>/dev/null || true
  fi
  rm -f /tmp/metro.log
  echo
fi

if [ ! -f scripts/device-invite-test.sh ]; then
  err "Missing scripts/device-invite-test.sh"
  exit 1
fi

bold "Step 1 — Generate fresh token"
./scripts/device-invite-test.sh | tee /tmp/iphone-invite-links.txt
echo

bold "Step 2 — Start Expo Dev Server (Tunnel)"
cat <<'TXT'
In another terminal:
  1) npm start
  2) In the DevTools page (http://localhost:19002), set Connection = Tunnel
  3) Wait for the QR code to show “Tunnel” in its label

If QR scan fails on iPhone (Metro auto‑discovery issue):
  • In Expo Go: tap "Open from Clipboard" or "Enter URL"
  • Paste the "Tunnel URL" shown in DevTools (e.g., exp://xyz.tunnel.dev)
  • Ensure iPhone and Mac have internet, VPN/firewall is not blocking, and both can reach the tunnel
  • Or try direct IP: In Expo Go → Enter URL, use your Mac's IP:8081
      - Find IP:  ipconfig getifaddr en0   (Wi‑Fi)  or  ipconfig getifaddr en1 (Ethernet)
      - Example:  exp://192.168.0.14:8081

Dev Client (more production‑like, optional):
  • Plug in your iPhone (trusted), then run:
      npx expo run:ios --device "<Your iPhone Name>"
  • After install, you can also test custom scheme links (myailandlord://invite?t=TOKEN)
TXT

read -r -p $'Press Enter when the app is open on iPhone (Expo Go or dev client)...\n'

bold "Step 3 — Trigger invite on iPhone"
cat <<'TXT'
On iPhone, choose one:
  A) Expo Go link: open Safari and paste the Expo Go link printed earlier (exp+myailandlord://invite?t=TOKEN)
  B) Dev-only button: copy the raw token, then on the app spinner tap "Paste Invite"
  C) Dev client: open Safari and paste myailandlord://invite?t=TOKEN

Expected:
  • PropertyInviteAccept screen appears with property details
  • Accepting should navigate directly to Tenant Home (zero‑flash)
TXT

read -r -p $'Press Enter after you have triggered the invite link...\n'

bold "Step 4 — Stream logs (Ctrl+C to stop)"
info "Filtering for key markers (Auth guard, ProfileContext, useProfileSync, Accept)..."
echo

if ! command -v npx >/dev/null 2>&1; then
  err "npx not found. Please install Node.js and npm."
  exit 1
fi

cleanup() {
  echo
  info "Stopping log stream. You can re-run: npx expo logs"
}
trap cleanup EXIT

bold "Success checklist (look for these):"
cat <<'TXT'
  ✅ Auth state changed (SIGNED_IN) — if you signed up during the flow
  ✅ ProfileContext: Profile cached { role: 'tenant' }
  ✅ useProfileSync: ProfileContext ready, profile state: object
  ✅ useProfileSync: Using database role (source of truth): tenant
  ✅ PropertyInviteAccept: Validating invite
  ✅ PropertyInviteAccept: Invite accepted successfully
  ✅ PropertyInviteAccept: Navigating directly to tenant home
  ✅ VISUAL: iPhone shows Tenant Home with GREEN tab bar (not landlord orange)

Common failures:
  ❌ No deep link received → use Tunnel, paste Tunnel URL manually into Expo Go
  ❌ useProfileSync error: {} → should be gone after recent fixes
  ❌ Invalid/expired token → re-run this script to generate a fresh token
  ❌ VISUAL: "Let's add your first property" screen → race condition / wrong role
TXT
echo

# Stream logs and filter important tags
npx expo logs | grep -E "(Auth guard|Auth state changed|ProfileContext|useProfileSync|PropertyInviteAccept|Bootstrap|RoleContext|pending invite|redirect|Creating new profile|Using database role|Waiting for ProfileContext|Main \(tenant\)|Main \(landlord\)|error|ERROR|role: 'tenant'|role: 'landlord')"
