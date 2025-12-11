import AsyncStorage from '@react-native-async-storage/async-storage';
import { log } from '../../lib/log';

const PENDING_INVITE_KEY = '@MyAILandlord:pendingPropertyInvite';

interface PendingInvite {
  propertyId: string;
  timestamp: number;
}

/**
 * Service to persist property invite context through authentication flow.
 * When an unauthenticated user opens an invite link and needs to sign up,
 * we store the property ID so we can complete the invite after auth.
 */
export const PendingInviteService = {
  /**
   * Save a pending property invite before redirecting to auth
   */
  async savePendingInvite(propertyId: string): Promise<void> {
    try {
      const invite: PendingInvite = {
        propertyId,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(PENDING_INVITE_KEY, JSON.stringify(invite));
      log.info('📥 Saved pending invite for property:', propertyId);
    } catch (error) {
      log.error('Failed to save pending invite:', error as Error);
    }
  },

  /**
   * Get any pending property invite
   * Returns null if no pending invite or if it's expired (> 1 hour)
   */
  async getPendingInvite(): Promise<string | null> {
    try {
      const stored = await AsyncStorage.getItem(PENDING_INVITE_KEY);
      if (!stored) {
        return null;
      }

      const invite: PendingInvite = JSON.parse(stored);

      // Expire after 1 hour
      const oneHour = 60 * 60 * 1000;
      if (Date.now() - invite.timestamp > oneHour) {
        log.info('⏰ Pending invite expired, clearing');
        await this.clearPendingInvite();
        return null;
      }

      log.info('📤 Retrieved pending invite for property:', invite.propertyId);
      return invite.propertyId;
    } catch (error) {
      log.error('Failed to get pending invite:', error as Error);
      return null;
    }
  },

  /**
   * Clear any pending invite (after successful processing or expiry)
   */
  async clearPendingInvite(): Promise<void> {
    try {
      await AsyncStorage.removeItem(PENDING_INVITE_KEY);
      log.info('🗑️ Cleared pending invite');
    } catch (error) {
      log.error('Failed to clear pending invite:', error as Error);
    }
  },
};
