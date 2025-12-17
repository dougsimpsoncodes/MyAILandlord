# EAS Build Fixes Applied

## Problem
iOS EAS build was failing during "Install dependencies" phase with:
```
npm error code ERESOLVE
npm error peerOptional @types/react@"^19.0.0" from react-native@0.79.6
```

## Root Cause
- Project has React 19.0.0 + react-native 0.79.6
- But `@types/react` was still on v18 (^18.2.74)
- This mismatch caused npm ci to fail on EAS servers

## Fixes Applied

### Fix 1: Upgraded @types/react to v19
```bash
npm install --save-dev @types/react@^19.0.0 --legacy-peer-deps
```
Changed from `^18.2.74` to `^19.2.7` to match React 19.0.0.

### Fix 2: Added explicit installCommand to eas.json
Changed from env var approach (which EAS ignores) to explicit command:
```json
"production": {
  "autoIncrement": true,
  "node": "20.18.0",
  "installCommand": "npm ci --include=dev --legacy-peer-deps"
}
```
The `--legacy-peer-deps` flag handles any remaining peer dependency conflicts from testing libraries that still expect React 18.

### Fix 3: Removed broken postinstall script
Removed from package.json:
```json
"postinstall": "ios/scripts/patch-expo-headers.sh"
```
This script was deleted earlier but the postinstall reference remained, causing npm ci to fail locally.

## Verification
Tested locally:
```bash
npm ci --include=dev --legacy-peer-deps
# Result: added 1104 packages, found 0 vulnerabilities
```

## Commit
```
fix: resolve EAS build peer dependency conflicts

- Upgrade @types/react to v19 to match React 19.0.0
- Add explicit installCommand with --legacy-peer-deps to eas.json
- Remove postinstall script referencing deleted patch-expo-headers.sh
```
Pushed to main: commit f45c60c

## Next Step
Run:
```bash
eas build --platform ios --profile production
```

## Current Version Matrix
- expo: ~53.0.25
- react: 19.0.0
- react-native: 0.79.6
- @types/react: ^19.2.7

Note: This is React 19 + RN 0.79 which is newer than Expo SDK 53's default (RN 0.76 + React 18). The explicit installCommand with --legacy-peer-deps handles any remaining compatibility issues.
