import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { LoadingSpinner } from '../components/LoadingSpinner';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../navigation/AuthStack';
import { log } from '../lib/log';

type AuthCallbackScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'AuthCallback'>;

interface AuthCallbackScreenProps {
  navigation: AuthCallbackScreenNavigationProp;
}

/**
 * Handles Supabase auth callback URLs from email confirmation links.
 * On web, the tokens come in the URL hash fragment.
 */
export const AuthCallbackScreen: React.FC<AuthCallbackScreenProps> = ({ navigation }) => {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        if (Platform.OS === 'web') {
          // On web, tokens are in the URL hash fragment
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const type = hashParams.get('type');

          log.info('Auth callback received', {
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken,
            type
          });

          if (accessToken && refreshToken) {
            // Set the session from the tokens
            const { data, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              log.error('Failed to set session from callback', sessionError);
              setError(sessionError.message);
              return;
            }

            log.info('Session set successfully from callback', {
              userId: data.session?.user?.id,
              email: data.session?.user?.email
            });

            // Clear the hash from the URL to prevent issues on refresh
            window.history.replaceState(null, '', window.location.pathname);

            // Unified auth listeners will propagate the authenticated session
            // Just wait a moment for the state to update, then navigate
            setTimeout(() => {
              navigation.reset({
                index: 0,
                routes: [{ name: 'Welcome' }],
              });
            }, 100);
          } else {
            log.warn('No tokens found in callback URL');
            setError('No authentication tokens found');
          }
        } else {
          // On native, deep linking should handle this via expo-linking
          log.info('Auth callback on native - deep linking should handle');
        }
      } catch (err) {
        log.error('Error handling auth callback', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    };

    handleAuthCallback();
  }, [navigation]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>Authentication Error</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <Text
          style={styles.link}
          onPress={() => navigation.navigate('Login')}
        >
          Go to Login
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LoadingSpinner size="large" />
      <Text style={styles.message}>Completing sign in...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f7fa',
    padding: 20,
  },
  message: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e74c3c',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  link: {
    fontSize: 16,
    color: '#3498db',
    textDecorationLine: 'underline',
  },
});

export default AuthCallbackScreen;
