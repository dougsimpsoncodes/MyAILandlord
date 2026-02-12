import AsyncStorage from '@react-native-async-storage/async-storage';
import { log } from '../lib/log';

const errorToMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Comprehensive data clearing utility for the MyAILandlord app
 * Clears all locally stored data including drafts, cache, and test data
 */
export class DataClearer {

  /**
   * Clear all AsyncStorage data
   */
  static async clearAsyncStorage(): Promise<void> {
    try {
      log.info('🧹 Clearing all AsyncStorage data...');
      const keys = await AsyncStorage.getAllKeys();
      log.info(`Found ${keys.length} keys in AsyncStorage:`, keys);

      if (keys.length > 0) {
        await AsyncStorage.multiRemove(keys);
        log.info('✅ AsyncStorage cleared successfully');
      } else {
        log.info('ℹ️ AsyncStorage was already empty');
      }
    } catch (error: unknown) {
      log.error('❌ Failed to clear AsyncStorage', { error: errorToMessage(error) });
      throw error;
    }
  }

  /**
   * Clear property drafts specifically
   */
  static async clearPropertyDrafts(): Promise<void> {
    try {
      log.info('🧹 Clearing property drafts...');
      const keys = await AsyncStorage.getAllKeys();
      const draftKeys = keys.filter(key =>
        key.includes('property_draft') ||
        key.includes('drafts_list') ||
        key.includes('user_drafts')
      );

      if (draftKeys.length > 0) {
        log.info(`Found ${draftKeys.length} draft keys:`, draftKeys);
        await AsyncStorage.multiRemove(draftKeys);
        log.info('✅ Property drafts cleared successfully');
      } else {
        log.info('ℹ️ No property drafts found');
      }
    } catch (error: unknown) {
      log.error('❌ Failed to clear property drafts', { error: errorToMessage(error) });
      throw error;
    }
  }

  /**
   * Clear cached data (images, responses, etc.)
   */
  static async clearCache(): Promise<void> {
    try {
      log.info('🧹 Clearing cached data...');
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key =>
        key.includes('cache') ||
        key.includes('temp') ||
        key.includes('image_') ||
        key.includes('response_')
      );

      if (cacheKeys.length > 0) {
        log.info(`Found ${cacheKeys.length} cache keys:`, cacheKeys);
        await AsyncStorage.multiRemove(cacheKeys);
        log.info('✅ Cache cleared successfully');
      } else {
        log.info('ℹ️ No cached data found');
      }
    } catch (error: unknown) {
      log.error('❌ Failed to clear cache', { error: errorToMessage(error) });
      throw error;
    }
  }

  /**
   * Clear all app data (full reset)
   */
  static async clearAllData(): Promise<void> {
    log.info('🚀 Starting complete data clear...');

    try {
      await this.clearAsyncStorage();
      log.info('✅ Complete data clear successful');

      const remainingKeys = await AsyncStorage.getAllKeys();
      log.info(`📊 Storage after clear: ${remainingKeys.length} keys remaining`);

      if (remainingKeys.length > 0) {
        log.warn('⚠️ Some keys remain:', remainingKeys);
      }

    } catch (error: unknown) {
      log.error('❌ Data clear failed', { error: errorToMessage(error) });
      throw error;
    }
  }

  /**
   * Get storage usage statistics
   */
  static async getStorageStats(): Promise<{
    totalKeys: number;
    draftKeys: number;
    cacheKeys: number;
    otherKeys: number;
    allKeys: string[];
  }> {
    try {
      const allKeys = [...await AsyncStorage.getAllKeys()];
      const draftKeys = allKeys.filter(key =>
        key.includes('property_draft') ||
        key.includes('drafts_list') ||
        key.includes('user_drafts')
      );
      const cacheKeys = allKeys.filter(key =>
        key.includes('cache') ||
        key.includes('temp') ||
        key.includes('image_') ||
        key.includes('response_')
      );
      const otherKeys = allKeys.filter(key =>
        !draftKeys.includes(key) && !cacheKeys.includes(key)
      );

      return {
        totalKeys: allKeys.length,
        draftKeys: draftKeys.length,
        cacheKeys: cacheKeys.length,
        otherKeys: otherKeys.length,
        allKeys
      };
    } catch (error: unknown) {
      log.error('Failed to get storage stats', { error: errorToMessage(error) });
      return {
        totalKeys: 0,
        draftKeys: 0,
        cacheKeys: 0,
        otherKeys: 0,
        allKeys: []
      };
    }
  }
}
