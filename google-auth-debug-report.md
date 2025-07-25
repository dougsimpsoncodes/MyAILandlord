# Google Authentication Debug Report

## Problem Summary
Google Sign-In authentication is failing in a React Native Expo development build with the error: "You must specify |clientID| in |GIDConfiguration|". The app falls back to mock authentication instead of launching the actual Google Sign-In flow.

## Technical Environment
- **Platform**: iOS (Physical iPhone + iOS Simulator)
- **Framework**: React Native with Expo SDK 53.0.20
- **Google Sign-In Library**: @react-native-google-signin/google-signin v15.0.0
- **Firebase**: v12.0.0
- **Build Type**: Development build (not Expo Go)

## Current Configuration

### Firebase Project Setup
- **Project ID**: my-ai-landlord
- **Bundle ID**: com.dougsimpsoncodes.myailandlord
- **Web Client ID**: 1090924979064-5gem02gehfrq8p83vsun7i0f4h2fd1gq.apps.googleusercontent.com
- **iOS Client ID**: 1090924979064-b3399iouappcvcbvo0lhl8nmn82fvtmm.apps.googleusercontent.com

### app.json Configuration
```json
{
  "expo": {
    "plugins": ["@react-native-google-signin/google-signin"],
    "ios": {
      "bundleIdentifier": "com.dougsimpsoncodes.myailandlord",
      "googleServicesFile": "./GoogleService-Info.plist",
      "infoPlist": {
        "CFBundleURLTypes": [
          {
            "CFBundleURLSchemes": [
              "com.googleusercontent.apps.1090924979064-5gem02gehfrq8p83vsun7i0f4h2fd1gq"
            ]
          }
        ]
      }
    }
  }
}
```

### Environment Variables (.env)
```bash
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=1090924979064-5gem02gehfrq8p83vsun7i0f4h2fd1gq.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=1090924979064-b3399iouappcvcbvo0lhl8nmn82fvtmm.apps.googleusercontent.com
```

### GoogleService-Info.plist (Correct File)
```xml
<key>CLIENT_ID</key>
<string>1090924979064-b3399iouappcvcbvo0lhl8nmn82fvtmm.apps.googleusercontent.com</string>
<key>REVERSED_CLIENT_ID</key>
<string>com.googleusercontent.apps.1090924979064-b3399iouappcvcbvo0lhl8nmn82fvtmm</string>
<key>BUNDLE_ID</key>
<string>com.dougsimpsoncodes.myailandlord</string>
<key>PROJECT_ID</key>
<string>my-ai-landlord</string>
```

### Google Sign-In Service Code
```typescript
const configureGoogleSignIn = () => {
  if (!isConfigured && GoogleSignin) {
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      offlineAccess: true,
    });
    isConfigured = true;
  }
};
```

## Error Details

### Console Error
```
ERROR  Google Sign-In Error: [Error: Encountered an error when signing in (see more below). If the error is 'Your app is missing support for the following URL schemes...', follow the troubleshooting guide at https://react-native-google-signin.github.io/docs/troubleshooting#ios

You must specify |clientID| in |GIDConfiguration|]
```

### Runtime Logs
```
'Google Sign-In Error:', { 
  code: 'SIGN_IN_ERROR',
  domain: 'RCTErrorDomain',
  userInfo: null 
}
```

## What We've Tried

### ✅ Verified Configurations
1. **Correct GoogleService-Info.plist**: Downloaded from Firebase Console for the correct project (my-ai-landlord) with matching bundle ID
2. **iOS Client ID**: Added to environment variables and Google Sign-In configuration
3. **URL Schemes**: Properly configured in app.json infoPlist
4. **Bundle Identifier**: Matches across all configurations

### ✅ Environment Setup
1. Environment variables are exported correctly (verified in Metro logs)
2. Google Sign-In library is properly installed and imported
3. Development build includes @react-native-google-signin/google-signin plugin

### ❌ Still Failing
The native Google Sign-In SDK still reports "You must specify |clientID| in |GIDConfiguration|" despite:
- CLIENT_ID present in GoogleService-Info.plist
- iosClientId configured in GoogleSignin.configure()
- All IDs verified to be correct

## Key Questions for Debugging

1. **Configuration Priority**: Does the Google Sign-In SDK read from GoogleService-Info.plist automatically, or does it only use the programmatic configuration?

2. **URL Scheme Mismatch**: Should the CFBundleURLSchemes use the REVERSED_CLIENT_ID from the plist instead of the web client ID format?

3. **Development vs Production**: Are there different configuration requirements for development builds vs production builds?

4. **Plugin Integration**: Does the @react-native-google-signin/google-signin Expo plugin automatically handle plist integration, or do we need additional configuration?

5. **Native Module Initialization**: Is there a timing issue where the configuration is being set after the module attempts to initialize?

## Current Workaround
The app detects the Google Sign-In failure and falls back to mock authentication, allowing development to continue. However, we need real Google authentication for production functionality.

## Files to Examine
- `/src/services/auth/googleSignIn.ts` - Google Sign-In service implementation
- `/GoogleService-Info.plist` - Firebase iOS configuration
- `/app.json` - Expo configuration
- `/.env` - Environment variables

## Next Steps Needed
1. Determine correct client ID configuration method for Expo development builds
2. Verify URL scheme configuration
3. Test if issue persists in production/release builds
4. Consider alternative Google Sign-In implementation approaches for Expo