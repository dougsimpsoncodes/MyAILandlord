/**
 * Sentry Integration for Error Tracking and Performance Monitoring
 *
 * Provides centralized error reporting and user context management
 */

import * as Sentry from '@sentry/react-native';
import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-expo';

/**
 * Initialize Sentry with configuration
 * Call this in App.tsx before rendering
 */
export function initSentry() {
  if (!process.env.EXPO_PUBLIC_SENTRY_DSN) {
    console.warn('Sentry DSN not configured - error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    environment: process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT || 'development',
    release: process.env.EXPO_PUBLIC_SENTRY_RELEASE || '1.0.0',

    // Performance Monitoring
    tracesSampleRate: 0.2, // 20% of transactions in production
    profilesSampleRate: 0.1, // 10% profiling

    // Error Sampling
    sampleRate: 1.0, // Capture 100% of errors

    // Enable automatic instrumentation
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000, // 30 seconds

    // Integrations
    integrations: [
      new Sentry.ReactNativeTracing({
        // Track navigation performance
        routingInstrumentation: new Sentry.ReactNavigationInstrumentation(),
      }),
    ],

    // Filter sensitive data
    beforeSend(event) {
      // Remove sensitive query params from URLs
      if (event.request?.url) {
        event.request.url = event.request.url
          .replace(/token=[^&]+/g, 'token=REDACTED')
          .replace(/apikey=[^&]+/g, 'apikey=REDACTED')
          .replace(/api_key=[^&]+/g, 'api_key=REDACTED');
      }

      // Remove sensitive data from breadcrumbs
      if (event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((breadcrumb) => {
          if (breadcrumb.data) {
            const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'authorization'];
            sensitiveKeys.forEach((key) => {
              if (breadcrumb.data && key in breadcrumb.data) {
                breadcrumb.data[key] = '[REDACTED]';
              }
            });
          }
          return breadcrumb;
        });
      }

      // Custom error grouping
      const errorMessage = event.exception?.values?.[0]?.value || '';

      // Group all network errors together
      if (errorMessage.includes('Network request failed')) {
        event.fingerprint = ['network-error'];
      }

      // Group all RLS violations together
      if (errorMessage.includes('RLS') || errorMessage.includes('row-level security')) {
        event.fingerprint = ['rls-violation'];
      }

      // Group all auth errors together
      if (errorMessage.includes('AUTH_NOT_READY') || errorMessage.includes('Unauthorized')) {
        event.fingerprint = ['auth-error'];
      }

      return event;
    },
  });
}

/**
 * Hook to sync Clerk user context with Sentry
 * Call this in your root component (App.tsx or navigation wrapper)
 */
export function useSentryUser() {
  const { user } = useUser();

  useEffect(() => {
    if (user) {
      Sentry.setUser({
        id: user.id,
        email: user.primaryEmailAddress?.emailAddress,
        username: user.username || undefined,
      });

      // Add custom context
      Sentry.setContext('user_metadata', {
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt,
      });
    } else {
      Sentry.setUser(null);
    }
  }, [user]);
}

/**
 * Set user role context for Sentry
 * Call this after role is determined
 */
export function setSentryRole(role: 'landlord' | 'tenant') {
  Sentry.setTag('user_role', role);
  Sentry.setContext('role', { role });
}

/**
 * Track custom performance transaction
 *
 * Usage:
 *   const transaction = trackTransaction('maintenance.create', 'Create Maintenance Request');
 *   try {
 *     await createRequest();
 *     transaction.setStatus('ok');
 *   } catch (error) {
 *     transaction.setStatus('internal_error');
 *     throw error;
 *   } finally {
 *     transaction.finish();
 *   }
 */
export function trackTransaction(op: string, name: string) {
  return Sentry.startTransaction({ op, name });
}

/**
 * Capture error with additional context
 *
 * Usage:
 *   captureError(error, {
 *     level: 'error',
 *     tags: { feature: 'maintenance' },
 *     extra: { requestId: '123' }
 *   });
 */
export function captureError(
  error: Error,
  options?: {
    level?: Sentry.SeverityLevel;
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
  }
) {
  Sentry.withScope((scope) => {
    if (options?.level) {
      scope.setLevel(options.level);
    }
    if (options?.tags) {
      Object.entries(options.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }
    if (options?.extra) {
      Object.entries(options.extra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    Sentry.captureException(error);
  });
}

/**
 * Add breadcrumb for debugging
 *
 * Usage:
 *   addBreadcrumb('User clicked submit button', { formId: 'maintenance-form' });
 */
export function addBreadcrumb(
  message: string,
  data?: Record<string, unknown>,
  level?: Sentry.SeverityLevel
) {
  Sentry.addBreadcrumb({
    message,
    data,
    level: level || 'info',
    timestamp: Date.now() / 1000,
  });
}

/**
 * Test Sentry integration
 * Use only in development/staging
 */
export function testSentryIntegration() {
  if (process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT === 'production') {
    console.warn('Cannot test Sentry in production');
    return;
  }

  // Test error capture
  captureError(new Error('Sentry test error'), {
    level: 'info',
    tags: { test: 'true' },
    extra: { timestamp: new Date().toISOString() },
  });

  // Test performance tracking
  const transaction = trackTransaction('test', 'Sentry Performance Test');
  setTimeout(() => {
    transaction.setStatus('ok');
    transaction.finish();
  }, 1000);

  console.log('Sentry test events sent - check dashboard');
}

export default {
  initSentry,
  useSentryUser,
  setSentryRole,
  trackTransaction,
  captureError,
  addBreadcrumb,
  testSentryIntegration,
};
