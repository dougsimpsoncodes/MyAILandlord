import * as SecureStore from 'expo-secure-store';
import { log } from '../../lib/log';

const BIOMETRIC_ENABLED_KEY = '@MyAILandlord:biometricEnabled';

/**
 * Service for managing biometric authentication preferences.
 * Uses SecureStore for secure storage of user preferences.
 */
export const BiometricSettingsService = {
  /**
   * Check if biometric login is enabled for a user.
   */
  async isEnabled(userId: string): Promise<boolean> {
    try {
      const key = `${BIOMETRIC_ENABLED_KEY}:${userId}`;
      const value = await SecureStore.getItemAsync(key);
      return value === 'true';
    } catch (error) {
      log.error('Failed to check biometric setting', { userId, error: String(error) });
      return false;
    }
  },

  /**
   * Enable or disable biometric login for a user.
   */
  async setEnabled(userId: string, enabled: boolean): Promise<void> {
    try {
      const key = `${BIOMETRIC_ENABLED_KEY}:${userId}`;
      if (enabled) {
        await SecureStore.setItemAsync(key, 'true');
      } else {
        await SecureStore.deleteItemAsync(key);
      }
      log.info('Biometric setting updated', { userId, enabled });
    } catch (error) {
      log.error('Failed to update biometric setting', { userId, enabled, error: String(error) });
      throw error;
    }
  },

  /**
   * Clear biometric preference for a user (e.g., on logout).
   */
  async clear(userId: string): Promise<void> {
    try {
      const key = `${BIOMETRIC_ENABLED_KEY}:${userId}`;
      await SecureStore.deleteItemAsync(key);
      log.info('Biometric setting cleared', { userId });
    } catch (error) {
      log.error('Failed to clear biometric setting', { userId, error: String(error) });
    }
  },
};

export default BiometricSettingsService;
