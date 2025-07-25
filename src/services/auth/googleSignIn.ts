import { GoogleSignin } from '@react-native-google-signin/google-signin';

let isConfigured = false;

// Check if we're in a native environment (not Expo Go)
const isNativeEnvironment = () => {
  try {
    // Try to access the native module
    return GoogleSignin && typeof GoogleSignin.configure === 'function';
  } catch (error) {
    return false;
  }
};

const configureGoogleSignIn = () => {
  if (!isConfigured && isNativeEnvironment()) {
    try {
      GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
        offlineAccess: true,
      });
      isConfigured = true;
      console.log('Google Sign-In configured successfully');
    } catch (error) {
      console.log('Failed to configure Google Sign-In:', error);
    }
  }
};

export const GoogleSignInService = {
  async signIn() {
    try {
      configureGoogleSignIn();
      
      // Check if Google Sign-In is available (not in Expo Go)
      if (!isNativeEnvironment()) {
        console.log('Google Sign-In not available in Expo Go, using fallback');
        return {
          success: false,
          user: null,
          error: 'Google Sign-In requires a development build (not available in Expo Go)'
        };
      }

      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      
      return {
        success: true,
        user: userInfo.data?.user || null,
        idToken: userInfo.data?.idToken || null,
        error: null
      };
    } catch (error: any) {
      console.log('Google Sign-In error:', error);
      return {
        success: false,
        user: null,
        error: error.message || 'Sign-in failed'
      };
    }
  },

  async signOut() {
    try {
      if (isNativeEnvironment()) {
        await GoogleSignin.signOut();
        console.log('Google Sign-Out successful');
      }
      return { success: true };
    } catch (error: any) {
      console.log('Google Sign-Out error:', error);
      return { success: false, error: error.message };
    }
  },

  async isSignedIn() {
    try {
      if (!isNativeEnvironment()) return false;
      const tokens = await GoogleSignin.getTokens();
      return !!tokens;
    } catch (error) {
      return false;
    }
  }
};