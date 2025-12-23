/**
 * Cache service for invite previews to support offline viewing
 * Uses AsyncStorage (native) or localStorage (web)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import log from '../../lib/log';

const CACHE_PREFIX = '@MyAILandlord:invite_cache:';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export interface CachedInviteData {
  property: {
    id: string;
    name: string;
    address: string;
    landlord_name: string;
    [key: string]: any;
  };
  timestamp: number;
  token_id?: string;
}

/**
 * Platform-aware storage wrapper
 */
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
    return await AsyncStorage.getItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  },

  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(key);
      return;
    }
    await AsyncStorage.removeItem(key);
  },
};

export const InviteCacheService = {
  /**
   * Cache invite property data for offline viewing
   */
  async cacheInviteData(token: string, data: CachedInviteData['property']): Promise<void> {
    try {
      const cacheData: CachedInviteData = {
        property: data,
        timestamp: Date.now(),
      };

      const key = `${CACHE_PREFIX}${token}`;
      await storage.setItem(key, JSON.stringify(cacheData));

      log.info('📦 Cached invite data for offline viewing', {
        token_preview: `${token.substring(0, 4)}...`,
        property_name: data.name
      });
    } catch (error) {
      log.error('Failed to cache invite data:', error as Error);
    }
  },

  /**
   * Retrieve cached invite data
   * Returns null if not cached or expired
   */
  async getCachedInviteData(token: string): Promise<CachedInviteData | null> {
    try {
      const key = `${CACHE_PREFIX}${token}`;
      const cached = await storage.getItem(key);

      if (!cached) {
        return null;
      }

      const data: CachedInviteData = JSON.parse(cached);

      // Check if expired (24 hours)
      if (Date.now() - data.timestamp > CACHE_TTL) {
        log.info('📦 Cached invite data expired, removing', {
          token_preview: `${token.substring(0, 4)}...`
        });
        await this.clearInviteCache(token);
        return null;
      }

      log.info('📦 Retrieved cached invite data', {
        token_preview: `${token.substring(0, 4)}...`,
        property_name: data.property.name,
        age_hours: Math.round((Date.now() - data.timestamp) / (60 * 60 * 1000))
      });

      return data;
    } catch (error) {
      log.error('Failed to retrieve cached invite data:', error as Error);
      return null;
    }
  },

  /**
   * Clear cached data for a specific token
   */
  async clearInviteCache(token: string): Promise<void> {
    try {
      const key = `${CACHE_PREFIX}${token}`;
      await storage.removeItem(key);
      log.info('🗑️ Cleared invite cache', {
        token_preview: `${token.substring(0, 4)}...`
      });
    } catch (error) {
      log.error('Failed to clear invite cache:', error as Error);
    }
  },

  /**
   * Clear all expired invite caches (cleanup)
   */
  async cleanupExpiredCaches(): Promise<void> {
    try {
      // Get all keys (platform-specific)
      let allKeys: string[] = [];

      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        allKeys = Object.keys(window.localStorage).filter(key => key.startsWith(CACHE_PREFIX));
      } else {
        const keys = await AsyncStorage.getAllKeys();
        allKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      }

      let expiredCount = 0;

      for (const key of allKeys) {
        const cached = await storage.getItem(key);
        if (!cached) continue;

        try {
          const data: CachedInviteData = JSON.parse(cached);
          if (Date.now() - data.timestamp > CACHE_TTL) {
            await storage.removeItem(key);
            expiredCount++;
          }
        } catch (error) {
          // Invalid cache entry, remove it
          await storage.removeItem(key);
          expiredCount++;
        }
      }

      if (expiredCount > 0) {
        log.info(`🗑️ Cleaned up ${expiredCount} expired invite caches`);
      }
    } catch (error) {
      log.error('Failed to cleanup expired caches:', error as Error);
    }
  }
};
