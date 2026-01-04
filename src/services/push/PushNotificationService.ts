import { Platform } from 'react-native';
import { supabase } from '../supabase/config';
import log from '../../lib/log';

// Dynamically import expo-notifications to handle missing native modules
let Notifications: typeof import('expo-notifications') | null = null;
let Device: typeof import('expo-device') | null = null;
let Constants: typeof import('expo-constants').default | null = null;

try {
  Notifications = require('expo-notifications');
  Device = require('expo-device');
  Constants = require('expo-constants').default;

  // Configure how notifications appear when app is in foreground
  if (Notifications) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }
} catch (error) {
  log.warn('Push notifications not available - native module not installed', { error: String(error) });
}

export class PushNotificationService {
  private static expoPushToken: string | null = null;

  /**
   * Register for push notifications and store token in database
   */
  static async registerForPushNotifications(userId: string): Promise<string | null> {
    // Early return if native modules not available
    if (!Notifications || !Device || !Constants) {
      log.info('Push notifications skipped - native modules not available');
      return null;
    }

    try {
      // Must be a physical device (not simulator for iOS)
      if (!Device.isDevice) {
        log.warn('Push notifications require a physical device');
        return null;
      }

      // Check/request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        log.warn('Push notification permission not granted');
        return null;
      }

      // Get the Expo push token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId ||
                        Constants.easConfig?.projectId ||
                        'e0bbde0b-8807-4eca-ab59-987973d4967c'; // Fallback to known project ID

      log.info('📱 Push notification projectId:', { projectId });

      if (!projectId) {
        log.error('Missing EAS project ID for push notifications');
        return null;
      }

      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId,
      });

      this.expoPushToken = tokenData.data;
      log.info('📱 Got Expo push token', { token: this.expoPushToken.substring(0, 20) + '...' });

      // Store token in database
      await this.saveTokenToDatabase(userId, this.expoPushToken);

      // Android-specific channel setup
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Default',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#3498DB',
        });
      }

      return this.expoPushToken;
    } catch (error) {
      // Use warn instead of error - this is expected in dev builds without push entitlements
      log.warn('Push notifications not available (expected in development)', { error: String(error) });
      return null;
    }
  }

  /**
   * Save push token to Supabase
   */
  private static async saveTokenToDatabase(userId: string, pushToken: string): Promise<void> {
    try {
      const deviceType = Platform.OS === 'ios' ? 'ios' : 'android';

      // Upsert the token (update if exists, insert if not)
      const { error } = await supabase
        .from('device_tokens')
        .upsert(
          {
            user_id: userId,
            push_token: pushToken,
            device_type: deviceType,
            is_active: true,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,push_token',
          }
        );

      if (error) {
        log.error('Error saving push token to database', { error: error.message });
      } else {
        log.info('✅ Push token saved to database');
      }
    } catch (error) {
      log.error('Error in saveTokenToDatabase', { error: String(error) });
    }
  }

  /**
   * Remove push token when user logs out
   */
  static async unregisterPushToken(userId: string): Promise<void> {
    try {
      if (this.expoPushToken) {
        const { error } = await supabase
          .from('device_tokens')
          .update({ is_active: false })
          .eq('user_id', userId)
          .eq('push_token', this.expoPushToken);

        if (error) {
          log.error('Error deactivating push token', { error: error.message });
        } else {
          log.info('📱 Push token deactivated');
        }
      }
    } catch (error) {
      log.error('Error unregistering push token', { error: String(error) });
    }
  }

  /**
   * Add listener for incoming notifications
   */
  static addNotificationReceivedListener(
    callback: (notification: any) => void
  ): { remove: () => void } | null {
    if (!Notifications) return null;
    return Notifications.addNotificationReceivedListener(callback);
  }

  /**
   * Add listener for notification interactions (when user taps notification)
   */
  static addNotificationResponseListener(
    callback: (response: any) => void
  ): { remove: () => void } | null {
    if (!Notifications) return null;
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  /**
   * Get the current push token
   */
  static getPushToken(): string | null {
    return this.expoPushToken;
  }

  /**
   * Set badge count on app icon
   */
  static async setBadgeCount(count: number): Promise<void> {
    if (!Notifications) return;
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      log.error('Error setting badge count', { error: String(error) });
    }
  }
}
