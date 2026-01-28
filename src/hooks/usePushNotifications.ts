import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { log } from '../lib/log';
import * as Linking from 'expo-linking';
import { createNavigationContainerRef } from '@react-navigation/native';

// Navigation ref for push notification handling
const navigationRef = createNavigationContainerRef();

function navigate(name: string, params?: object) {
  if (navigationRef.isReady()) {
    (navigationRef as any).navigate(name, params);
  } else {
    log.warn('📲 Navigation not ready, cannot navigate to', name);
  }
}

export function usePushNotifications() {
  useEffect(() => {
    // Push notifications are not supported on web - skip entirely
    if (Platform.OS === 'web') {
      return;
    }

    let mounted = true;

    async function register() {
      try {
        // iOS permission prompt
        if (Platform.OS === 'ios') {
          const { status } = await Notifications.requestPermissionsAsync();
          log.info('📲 Push permission status (iOS):', status);
        }
        const token = await Notifications.getExpoPushTokenAsync();
        log.info('📲 Expo push token:', token.data);
        // TODO: send token to backend (associate with authenticated user)
      } catch (e) {
        log.warn('📲 Push registration failed', e);
      }
    }

    // Basic response listener (navigating later via route data)
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        const data = response.notification.request.content.data as any;
        log.info('📲 Push tapped, data:', data);
        // Preferred: direct deeplink provided by server
        if (data?.deeplink && typeof data.deeplink === 'string') {
          Linking.openURL(data.deeplink).catch((e) => log.warn('📲 Deeplink open failed', e));
          return;
        }
        // Fallback: simple route name
        if (data?.route && typeof data.route === 'string') {
          navigate(data.route, data.params || undefined);
          return;
        }
        // Example typed handling (extend as needed)
        if (data?.type === 'request_update' && data.requestId) {
          // Navigate to a reasonable default; adjust when request detail route is defined
          navigate('Main');
        }
      } catch (e) {
        log.warn('📲 Push response handling error', e);
      }
    });

    register();

    return () => {
      mounted = false;
      responseSub.remove();
    };
  }, []);
}
