import { useEffect, useRef } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAppAuth } from '../context/SupabaseAuthContext';
import { PushNotificationService } from '../services/push/PushNotificationService';
import log from '../lib/log';

/**
 * Hook to register for push notifications and handle notification interactions
 */
export function usePushNotifications() {
  const { user, isSignedIn } = useAppAuth();
  const navigation = useNavigation();
  const notificationListener = useRef<{ remove: () => void } | null>(null);
  const responseListener = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    // Only register if user is signed in
    if (!isSignedIn || !user?.id) {
      return;
    }

    try {
      // Register for push notifications
      PushNotificationService.registerForPushNotifications(user.id);

      // Listen for notifications received while app is foregrounded
      notificationListener.current = PushNotificationService.addNotificationReceivedListener(
        (notification) => {
          log.info('📬 Notification received in foreground', {
            title: notification?.request?.content?.title,
            body: notification?.request?.content?.body,
          });
        }
      );

      // Listen for notification taps (user interaction)
      responseListener.current = PushNotificationService.addNotificationResponseListener(
        (response) => {
          log.info('📬 User tapped notification', {
            data: response?.notification?.request?.content?.data,
          });

          // Navigate based on notification data
          const data = response?.notification?.request?.content?.data;
          if (data) {
            handleNotificationNavigation(data);
          }
        }
      );
    } catch (error) {
      // Push notifications not available (e.g., native module not built in)
      log.warn('Push notifications not available', { error: String(error) });
    }

    return () => {
      // Cleanup listeners
      try {
        if (notificationListener.current) {
          notificationListener.current.remove();
        }
        if (responseListener.current) {
          responseListener.current.remove();
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    };
  }, [isSignedIn, user?.id]);

  /**
   * Handle navigation when user taps a notification
   */
  const handleNotificationNavigation = (data: Record<string, unknown>) => {
    try {
      const { type, id } = data as { type?: string; id?: string };

      if (type === 'message') {
        // Navigate to messages screen
        // @ts-ignore - navigation typing
        navigation.navigate('TenantMessages' as never);
      } else if (type === 'maintenance_request' && id) {
        // Navigate to the specific maintenance request
        // @ts-ignore - navigation typing
        navigation.navigate('FollowUp', { issueId: id } as never);
      }
    } catch (error) {
      log.error('Error handling notification navigation', { error: String(error) });
    }
  };
}
