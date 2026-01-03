import React from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
// Unified contexts
import { UnifiedAuthProvider } from './src/context/UnifiedAuthContext';
import { AppStateProvider } from './src/context/AppStateContext';
// OnboardingContext is still used by some legacy flows
import { OnboardingProvider } from './src/context/OnboardingContext';
import AppNavigator from './src/AppNavigator';
import AppCleanNavigator from './src/clean/AppCleanNavigator';
import { initMonitoring } from './src/lib/monitoring';
import { usePushNotifications } from './src/hooks/usePushNotifications';
// Dev-only diagnostics
if (__DEV__) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('./src/lib/devExpose');
}

export default function App() {
  // Initialize monitoring (no-op without DSN)
  React.useEffect(() => {
    const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
    initMonitoring({ dsn });
  }, []);

  // iOS MVP: Register push notifications (safe no-op elsewhere)
  const iosMvp = process.env.EXPO_PUBLIC_IOS_MVP === '1';
  if (iosMvp && Platform.OS === 'ios') {
    // Hook registers on mount
    // eslint-disable-next-line react-hooks/rules-of-hooks
    usePushNotifications();
  }

  return (
    <SafeAreaProvider>
      <UnifiedAuthProvider>
        <AppStateProvider>
          <OnboardingProvider>
                      {process.env.EXPO_PUBLIC_EXPERIMENTAL_APP === '1' ? (
                        <AppCleanNavigator />
                      ) : (
                        <AppNavigator />
                      )}
            {iosMvp && (
              <View style={[styles.mvpBanner, { pointerEvents: 'none' }]}>
                <Text style={styles.mvpText}>iOS MVP mode</Text>
              </View>
            )}
            <StatusBar style="auto" />
          </OnboardingProvider>
        </AppStateProvider>
      </UnifiedAuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  mvpBanner: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  mvpText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
