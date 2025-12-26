import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { log } from '../../lib/log';

const PENDING_INVITE_KEY = '@MyAILandlord:pendingPropertyInvite';

interface PendingInvite {
  type: 'token' | 'legacy';
  value: string;  // token or propertyId
  timestamp: number;
  metadata?: {
    propertyId?: string;
    propertyName?: string;
    inviteCode?: string;
  };
}

/**
 * Platform-aware storage: localStorage on web (cross-tab), AsyncStorage on native
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

/**
 * Service to persist property invite context through authentication flow.
 * When an unauthenticated user opens an invite link and needs to sign up,
 * we store the invite data (token or propertyId) so we can complete the invite after auth.
 *
 * Uses localStorage on web (cross-tab support) and AsyncStorage on native.
 */
export const PendingInviteService = {
  /**
   * Save a pending property invite before redirecting to auth
   * @param value - Either a token (NEW) or propertyId (LEGACY)
   * @param type - 'token' for tokenized invites, 'legacy' for direct propertyId links
   * @param metadata - Optional metadata (propertyId, propertyName, inviteCode)
   */
  async savePendingInvite(
    value: string,
    type: 'token' | 'legacy' = 'legacy',
    metadata?: { propertyId?: string; propertyName?: string; inviteCode?: string }
  ): Promise<void> {
    try {
      const invite: PendingInvite = {
        type,
        value,
        timestamp: Date.now(),
        metadata,
      };
      await storage.setItem(PENDING_INVITE_KEY, JSON.stringify(invite));
      const storageType = Platform.OS === 'web' ? 'localStorage' : 'AsyncStorage';
      log.info(`📥 Saved pending ${type} invite (${storageType}):`, value, metadata);
    } catch (error) {
      log.error('Failed to save pending invite:', error as Error);
    }
  },

  /**
   * Get any pending property invite
   * Returns the full invite data object or null if no pending invite or if it's expired (> 1 hour)
   */
  async getPendingInvite(): Promise<PendingInvite | null> {
    try {
      const stored = await storage.getItem(PENDING_INVITE_KEY);
      if (!stored) {
        return null;
      }

      const invite: PendingInvite = JSON.parse(stored);

      // Backward compatibility: handle old format (just propertyId string)
      if (typeof invite === 'string' || (invite && !invite.type)) {
        log.info('📦 Migrating old pending invite format to new structure');
        const legacyPropertyId = typeof invite === 'string' ? invite : (invite as any).propertyId;
        const migratedInvite: PendingInvite = {
          type: 'legacy',
          value: legacyPropertyId,
          timestamp: Date.now(),
        };
        await storage.setItem(PENDING_INVITE_KEY, JSON.stringify(migratedInvite));
        return migratedInvite;
      }

      // Expire after 1 hour
      const oneHour = 60 * 60 * 1000;
      if (Date.now() - invite.timestamp > oneHour) {
        log.info('⏰ Pending invite expired, clearing');
        await this.clearPendingInvite();
        return null;
      }

      const storageType = Platform.OS === 'web' ? 'localStorage' : 'AsyncStorage';
      log.info(`📤 Retrieved pending ${invite.type} invite (${storageType}):`, invite.value);
      return invite;
    } catch (error) {
      log.error('Failed to get pending invite:', error as Error);
      return null;
    }
  },

  /**
   * DEPRECATED: Use getPendingInvite() instead
   * Returns just the value for backward compatibility
   */
  async getPendingPropertyId(): Promise<string | null> {
    const invite = await this.getPendingInvite();
    return invite?.value || null;
  },

  /**
   * Clear any pending invite (after successful processing or expiry)
   */
  async clearPendingInvite(): Promise<void> {
    try {
      await storage.removeItem(PENDING_INVITE_KEY);
      log.info('🗑️ Cleared pending invite');
    } catch (error) {
      log.error('Failed to clear pending invite:', error as Error);
    }
  },
};
