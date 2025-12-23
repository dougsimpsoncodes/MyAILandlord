/**
 * Feature Flags Configuration
 *
 * Controls gradual rollout of new features in production.
 * Flags are set via environment variables for easy deployment control.
 */

export interface FeatureFlags {
  // Tokenized Invites: Secure, rate-limited invite tokens
  TOKENIZED_INVITES_ENABLED: boolean;
  TOKENIZED_INVITES_ROLLOUT_PERCENT: number;  // 0-100

  // Add more feature flags here as needed
}

/**
 * Get current feature flags from environment variables
 */
function getFeatureFlags(): FeatureFlags {
  return {
    // Tokenized invites feature flag
    // EXPO_PUBLIC_TOKENIZED_INVITES=true enables the feature
    TOKENIZED_INVITES_ENABLED: process.env.EXPO_PUBLIC_TOKENIZED_INVITES === 'true',

    // Rollout percentage (0-100)
    // EXPO_PUBLIC_TOKEN_ROLLOUT_PERCENT=10 means 10% of users get tokenized invites
    TOKENIZED_INVITES_ROLLOUT_PERCENT: parseInt(
      process.env.EXPO_PUBLIC_TOKEN_ROLLOUT_PERCENT || '0',
      10
    ),
  };
}

// Export singleton instance
export const featureFlags: FeatureFlags = getFeatureFlags();

/**
 * Check if tokenized invites should be used for a given landlord
 * @param landlordId - The landlord's user ID
 * @returns true if tokenized invites should be used
 */
export function shouldUseTokenizedInvites(landlordId: string): boolean {
  // Feature must be enabled
  if (!featureFlags.TOKENIZED_INVITES_ENABLED) {
    return false;
  }

  // 100% rollout - everyone gets it
  if (featureFlags.TOKENIZED_INVITES_ROLLOUT_PERCENT >= 100) {
    return true;
  }

  // 0% rollout - nobody gets it (except if explicitly enabled via env var)
  if (featureFlags.TOKENIZED_INVITES_ROLLOUT_PERCENT <= 0) {
    return false;
  }

  // Percentage-based rollout using consistent hash of landlordId
  // This ensures the same landlord always gets the same result (sticky)
  const hash = simpleHash(landlordId);
  const percentage = hash % 100;

  return percentage < featureFlags.TOKENIZED_INVITES_ROLLOUT_PERCENT;
}

/**
 * Simple hash function for consistent user bucketing
 * Returns a number between 0 and Number.MAX_SAFE_INTEGER
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Log current feature flag configuration (safe for debugging)
 */
export function logFeatureFlags(): void {
  console.log('🚩 Feature Flags:', {
    tokenizedInvitesEnabled: featureFlags.TOKENIZED_INVITES_ENABLED,
    tokenizedInvitesRollout: `${featureFlags.TOKENIZED_INVITES_ROLLOUT_PERCENT}%`,
  });
}
