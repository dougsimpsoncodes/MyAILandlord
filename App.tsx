import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { RoleProvider } from './src/context/RoleContext';
import AppNavigator from './src/AppNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RoleProvider>
          <AppNavigator />
          <StatusBar style="auto" />
        </RoleProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}