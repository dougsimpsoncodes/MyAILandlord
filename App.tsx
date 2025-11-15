import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SupabaseAuthProvider } from './src/context/SupabaseAuthContext';
import { RoleProvider } from './src/context/RoleContext';
import AppNavigator from './src/AppNavigator';
import { initMonitoring } from './src/lib/monitoring';

export default function App() {
  // Initialize monitoring (no-op without DSN)
  React.useEffect(() => {
    const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
    initMonitoring({ dsn });
  }, []);

  return (
    <SafeAreaProvider>
      <SupabaseAuthProvider>
        <RoleProvider>
          <AppNavigator />
          <StatusBar style="auto" />
        </RoleProvider>
      </SupabaseAuthProvider>
    </SafeAreaProvider>
  );
}
