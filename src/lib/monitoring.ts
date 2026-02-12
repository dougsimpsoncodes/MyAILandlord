import { log } from './log'

type MonitoringOptions = {
  dsn?: string
}

let configured = false
let sentryEnabled = false

// Initialize Sentry if DSN is provided (Expo-compatible, no eject needed)
export function initMonitoring(opts: MonitoringOptions = {}) {
  configured = true
  const dsn = opts.dsn || process.env.EXPO_PUBLIC_SENTRY_DSN
  
  if (dsn) {
    try {
      // TODO: Add @sentry/react-native when ready
      // import * as Sentry from '@sentry/react-native'
      // Sentry.init({ dsn })
      sentryEnabled = true
      log.info('Monitoring initialized with Sentry DSN')
    } catch (error) {
      log.warn('Failed to initialize Sentry, falling back to logging', error)
    }
  } else {
    log.info('Monitoring initialized (no DSN, dev mode)')
  }
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  const payload = { error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : String(error), context }
  
  if (sentryEnabled) {
    try {
      // TODO: Add real Sentry capture when @sentry/react-native is installed
      // Sentry.captureException(error instanceof Error ? error : new Error(String(error)))
      log.info('Exception captured (would send to Sentry)', payload)
    } catch (sentryError) {
      log.error('Failed to capture exception in Sentry', sentryError)
      log.error('Original exception', payload)
    }
  } else if (__DEV__) {
    log.error('captureException (dev)', payload)
  } else if (configured) {
    log.error('captureException (no monitoring)', payload)
  }
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: Record<string, unknown>) {
  const payload = { message, context }
  
  if (sentryEnabled) {
    try {
      // TODO: Add real Sentry capture when @sentry/react-native is installed
      // Sentry.captureMessage(message, level as SeverityLevel)
      log.info(`Message captured (would send to Sentry): ${level}`, payload)
    } catch (sentryError) {
      log.error('Failed to capture message in Sentry', sentryError)
      log.error('Original message', payload)
    }
  } else if (__DEV__) {
    if (level === 'error') {
      log.error('captureMessage (dev)', payload);
    } else if (level === 'warning') {
      log.warn('captureMessage (dev)', payload);
    } else {
      log.info('captureMessage (dev)', payload);
    }
  } else if (configured) {
    if (level === 'error') {
      log.error('captureMessage', payload);
    } else if (level === 'warning') {
      log.warn('captureMessage', payload);
    } else {
      log.info('captureMessage', payload);
    }
  }
}

// Add a test exception function for non-prod validation
export function captureTestException() {
  if (__DEV__) {
    const testError = new Error('Test monitoring exception - this is intentional for validation')
    captureException(testError, { test: true, timestamp: Date.now() })
    return true
  }
  return false
}

