# EAS Build Failure Report - iOS Production Build

## Problem Summary
iOS production build via EAS Build fails during the "Install dependencies" phase with npm peer dependency resolution error.

## Actual Error (from EAS build logs)
```
npm error code ERESOLVE
npm error ERESOLVE could not resolve
npm error
npm error While resolving: react-native@0.79.6
npm error Found: @types/react@18.3.27
npm error node_modules/@types/react
npm error   dev @types/react@"^18.2.74" from the root project
npm error
npm error Could not resolve dependency:
npm error peerOptional @types/react@"^19.0.0" from react-native@0.79.6
npm error node_modules/react-native
npm error   react-native@"0.79.6" from the root project
npm error
npm error Conflicting peer dependency: @types/react@19.2.7
npm error node_modules/@types/react
npm error   peerOptional @types/react@"^19.0.0" from react-native@0.79.6
npm error
npm error Fix the upstream dependency conflict, or retry
npm error this command with --force or --legacy-peer-deps
```

## Root Cause
- `react-native@0.79.6` has a peerOptional dependency on `@types/react@^19.0.0`
- Project has `@types/react@18.3.27` installed (React 18 types)
- EAS runs `npm ci --include=dev` which enforces strict peer dependency resolution
- Local builds work because npm may have cached resolutions or different settings

## Project Details
- **Framework**: React Native / Expo SDK 53
- **Build Service**: EAS Build (Expo Application Services)
- **Platform**: iOS
- **Profile**: production
- **Bundle ID**: com.example.myailandlord
- **react-native version**: 0.79.6
- **@types/react version**: ^18.2.74 (resolves to 18.3.27)

## Attempted Fixes (All Failed)

### Fix 1: NPM_CONFIG_LEGACY_PEER_DEPS environment variable
Added to eas.json:
```json
"production": {
  "autoIncrement": true,
  "node": "20.18.0",
  "env": {
    "NPM_CONFIG_LEGACY_PEER_DEPS": "true"
  }
}
```
**Result**: Still failed with same error

### Fix 2 (earlier): Removed pre_install hook from Podfile
Removed custom script that was patching Expo headers.
**Result**: Didn't address the npm error

### Fix 3 (earlier): Fixed duplicate configs in app.json
Removed duplicate intentFilters and permissions.
**Result**: Didn't address the npm error

### Fix 4 (earlier): Removed expo-modules-core
Uninstalled direct dependency that expo-doctor warned about.
**Result**: Didn't address the npm error

### Fix 5 (earlier): Regenerated iOS folder
Ran `npx expo prebuild --platform ios --clean`
**Result**: Didn't address the npm error

## Current Configuration Files

### eas.json
```json
{
  "cli": {
    "version": ">= 16.17.3",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "autoIncrement": true,
      "node": "20.18.0",
      "env": {
        "NPM_CONFIG_LEGACY_PEER_DEPS": "true"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### package.json (relevant parts)
```json
{
  "dependencies": {
    "expo": "~53.0.0",
    "react": "18.3.1",
    "react-native": "0.79.2"
  },
  "devDependencies": {
    "@types/react": "^18.2.74"
  }
}
```

Note: The error says react-native@0.79.6 but package.json shows 0.79.2 - this might be due to package-lock.json resolving to a newer version.

### app.json
```json
{
  "expo": {
    "name": "My AI Landlord",
    "slug": "MyAILandlord",
    "version": "1.0.0",
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.example.myailandlord",
      "runtimeVersion": "1.0.0"
    },
    "android": {
      "package": "com.example.myailandlord",
      "runtimeVersion": { "policy": "appVersion" }
    },
    "plugins": ["expo-secure-store", "expo-font"]
  }
}
```

## Possible Solutions to Try

### Option 1: Upgrade @types/react to v19
```bash
npm install --save-dev @types/react@^19.0.0
```
Risk: May cause TypeScript errors due to React 19 type changes

### Option 2: Add npm overrides to package.json
```json
{
  "overrides": {
    "@types/react": "^18.2.74"
  }
}
```
This forces npm to use React 18 types everywhere

### Option 3: Use .npmrc file
Create `.npmrc` in project root:
```
legacy-peer-deps=true
```
Then commit and push

### Option 4: Pin react-native to exact version
In package.json, change:
```json
"react-native": "0.79.2"
```
And delete package-lock.json, regenerate

### Option 5: Downgrade to Expo SDK 52
If SDK 53 has fundamental incompatibilities

### Option 6: Use installCommand in eas.json
```json
"production": {
  "autoIncrement": true,
  "node": "20.18.0",
  "installCommand": "npm ci --legacy-peer-deps"
}
```

## Questions for Debugging
1. Why didn't NPM_CONFIG_LEGACY_PEER_DEPS=true work? Is EAS ignoring it?
2. Is there an eas.json syntax for forcing legacy-peer-deps that definitely works?
3. Should we upgrade to @types/react@19 or use overrides?
4. Is this a known Expo SDK 53 + React Native 0.79 issue?

## Build Command
```bash
eas build --platform ios --profile production
```

## EAS Build ID (latest failed)
929a8a1d-9230-4306-b02d-160f1422ecd6

## Links
- EAS Build Logs: https://expo.dev/accounts/dougiefreshcodes/projects/MyAILandlord/builds/929a8a1d-9230-4306-b02d-160f1422ecd6
- Expo SDK 53 Release Notes: https://blog.expo.dev/expo-sdk-53/
