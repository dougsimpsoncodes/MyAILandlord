import AsyncStorage from '@react-native-async-storage/async-storage';

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
      console.log('🧹 Clearing all AsyncStorage data...');
      const keys = await AsyncStorage.getAllKeys();
      console.log(`Found ${keys.length} keys in AsyncStorage:`, keys);
      
      if (keys.length > 0) {
        await AsyncStorage.multiRemove(keys);
        console.log('✅ AsyncStorage cleared successfully');
      } else {
        console.log('ℹ️ AsyncStorage was already empty');
      }
    } catch (error) {
      console.error('❌ Failed to clear AsyncStorage:', error);
      throw error;
    }
  }

  /**
   * Clear property drafts specifically
   */
  static async clearPropertyDrafts(): Promise<void> {
    try {
      console.log('🧹 Clearing property drafts...');
      const keys = await AsyncStorage.getAllKeys();
      const draftKeys = keys.filter(key => 
        key.includes('property_draft') || 
        key.includes('drafts_list') ||
        key.includes('user_drafts')
      );
      
      if (draftKeys.length > 0) {
        console.log(`Found ${draftKeys.length} draft keys:`, draftKeys);
        await AsyncStorage.multiRemove(draftKeys);
        console.log('✅ Property drafts cleared successfully');
      } else {
        console.log('ℹ️ No property drafts found');
      }
    } catch (error) {
      console.error('❌ Failed to clear property drafts:', error);
      throw error;
    }
  }

  /**
   * Clear cached data (images, responses, etc.)
   */
  static async clearCache(): Promise<void> {
    try {
      console.log('🧹 Clearing cached data...');
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => 
        key.includes('cache') || 
        key.includes('temp') ||
        key.includes('image_') ||
        key.includes('response_')
      );
      
      if (cacheKeys.length > 0) {
        console.log(`Found ${cacheKeys.length} cache keys:`, cacheKeys);
        await AsyncStorage.multiRemove(cacheKeys);
        console.log('✅ Cache cleared successfully');
      } else {
        console.log('ℹ️ No cached data found');
      }
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
      throw error;
    }
  }

  /**
   * Clear all app data (full reset)
   */
  static async clearAllData(): Promise<void> {
    console.log('🚀 Starting complete data clear...');
    
    try {
      await this.clearAsyncStorage();
      console.log('✅ Complete data clear successful');
      
      // Return storage statistics
      const remainingKeys = await AsyncStorage.getAllKeys();
      console.log(`📊 Storage after clear: ${remainingKeys.length} keys remaining`);
      
      if (remainingKeys.length > 0) {
        console.log('⚠️ Some keys remain:', remainingKeys);
      }
      
    } catch (error) {
      console.error('❌ Data clear failed:', error);
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
      const allKeys = await AsyncStorage.getAllKeys();
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
    } catch (error) {
      console.error('Failed to get storage stats:', error);
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