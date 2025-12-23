/**
 * Analytics service for tracking user events and conversion funnels
 *
 * Events are logged locally in development and sent to analytics service in production.
 * All events include correlation IDs for request tracing.
 */

import log from './log';
import { sanitizeToken, sanitizeEmail } from '../utils/sanitize';

export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp?: number;
  correlationId?: string;
}

/**
 * Track an analytics event
 *
 * @param event - Event name (e.g., 'invite_view', 'invite_accept_success')
 * @param properties - Event properties (sanitized automatically)
 * @param correlationId - Optional correlation ID for request tracing
 *
 * @example
 * analytics.track('invite_view', {
 *   token_id: 'abc123',
 *   property_id: 'prop-uuid',
 *   user_state: 'signed_in'
 * });
 */
export const analytics = {
  track(
    event: string,
    properties: Record<string, any> = {},
    correlationId?: string
  ): void {
    const sanitizedProperties = sanitizeProperties(properties);

    const analyticsEvent: AnalyticsEvent = {
      event,
      properties: sanitizedProperties,
      timestamp: Date.now(),
      correlationId
    };

    // Log event locally (development)
    log.info(`📊 Analytics: ${event}`, sanitizedProperties);

    // TODO: Send to analytics service (production)
    // In production, you might send to Mixpanel, Amplitude, PostHog, etc.
    // if (process.env.NODE_ENV === 'production') {
    //   sendToAnalyticsService(analyticsEvent);
    // }
  },

  /**
   * Track invite funnel events with standardized properties
   */
  inviteFunnel: {
    view(tokenId: string, propertyId: string, userState: 'signed_in' | 'anonymous', correlationId?: string) {
      analytics.track('invite_view', {
        token_preview: sanitizeToken(tokenId),
        property_id: propertyId,
        user_state: userState
      }, correlationId);
    },

    validateSuccess(tokenId: string, latencyMs: number, correlationId?: string) {
      analytics.track('invite_validate_success', {
        token_preview: sanitizeToken(tokenId),
        latency_ms: latencyMs
      }, correlationId);
    },

    validateFailure(tokenId: string, reason: string, latencyMs: number, correlationId?: string) {
      analytics.track('invite_validate_failure', {
        token_preview: sanitizeToken(tokenId),
        reason,
        latency_ms: latencyMs
      }, correlationId);
    },

    acceptAttempt(tokenId: string, propertyId: string, correlationId?: string) {
      analytics.track('invite_accept_attempt', {
        token_preview: sanitizeToken(tokenId),
        property_id: propertyId
      }, correlationId);
    },

    acceptSuccess(tokenId: string, propertyId: string, latencyMs: number, correlationId?: string) {
      analytics.track('invite_accept_success', {
        token_preview: sanitizeToken(tokenId),
        property_id: propertyId,
        latency_ms: latencyMs
      }, correlationId);
    },

    acceptFailure(tokenId: string, reason: string, latencyMs: number, correlationId?: string) {
      analytics.track('invite_accept_failure', {
        token_preview: sanitizeToken(tokenId),
        reason,
        latency_ms: latencyMs
      }, correlationId);
    },

    accountSwitch(fromEmail: string, toEmail: string, correlationId?: string) {
      analytics.track('invite_account_switch', {
        from_email: sanitizeEmail(fromEmail),
        to_email: sanitizeEmail(toEmail)
      }, correlationId);
    },

    wrongAccountContinue(signedInEmail: string, intendedEmail: string, correlationId?: string) {
      analytics.track('invite_wrong_account_continue', {
        signed_in_email: sanitizeEmail(signedInEmail),
        intended_email: sanitizeEmail(intendedEmail)
      }, correlationId);
    },

    alreadyLinked(propertyId: string, correlationId?: string) {
      analytics.track('invite_already_linked', {
        property_id: propertyId
      }, correlationId);
    },

    offlineRetry(attempt: number, correlationId?: string) {
      analytics.track('invite_offline_retry', {
        attempt
      }, correlationId);
    },

    doubleClickBlocked(correlationId?: string) {
      analytics.track('invite_double_click_blocked', {}, correlationId);
    }
  }
};

/**
 * Sanitize event properties to prevent logging sensitive data
 */
function sanitizeProperties(properties: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(properties)) {
    // Sanitize tokens
    if (key.includes('token') && typeof value === 'string') {
      sanitized[key] = sanitizeToken(value);
      continue;
    }

    // Sanitize emails
    if (key.includes('email') && typeof value === 'string') {
      sanitized[key] = sanitizeEmail(value);
      continue;
    }

    // Pass through other values
    sanitized[key] = value;
  }

  return sanitized;
}

/**
 * Generate a correlation ID for request tracing
 * Format: invite-{timestamp}-{random}
 */
export function generateCorrelationId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `invite-${timestamp}-${random}`;
}
