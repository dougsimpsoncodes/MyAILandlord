/**
 * Retry utility with exponential backoff for resilient network requests
 */

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  onRetry?: (attempt: number, delay: number, error: any) => void;
}

/**
 * Retry a function with exponential backoff
 *
 * @param fn - Async function to retry
 * @param options - Retry configuration
 * @returns Promise resolving to function result
 *
 * @example
 * const result = await retryWithBackoff(
 *   () => fetch('/api/endpoint'),
 *   { maxRetries: 3, baseDelay: 1000 }
 * );
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    onRetry
  } = options;

  let lastError: any;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if error is retriable (5xx or 429)
      const isRetriable = isRetriableError(error);
      const isLastAttempt = attempt === maxRetries - 1;

      if (!isRetriable || isLastAttempt) {
        throw error;
      }

      // Calculate delay with exponential backoff + jitter
      const exponentialDelay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 200; // 0-200ms jitter
      const delay = Math.min(exponentialDelay + jitter, maxDelay);

      // Notify caller of retry
      onRetry?.(attempt + 1, delay, error);

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Check if an error should trigger a retry
 */
function isRetriableError(error: any): boolean {
  // HTTP status codes
  if (error.status) {
    // 5xx server errors
    if (error.status >= 500 && error.status < 600) return true;
    // 429 rate limit
    if (error.status === 429) return true;
    // 408 request timeout
    if (error.status === 408) return true;
  }

  // Network errors
  if (error.message) {
    const message = error.message.toLowerCase();
    if (message.includes('network')) return true;
    if (message.includes('timeout')) return true;
    if (message.includes('econnrefused')) return true;
    if (message.includes('enotfound')) return true;
  }

  // Fetch API network errors
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return true;
  }

  return false;
}

/**
 * Wrapper for fetch with automatic retry
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options?: RetryOptions
): Promise<Response> {
  return retryWithBackoff(async () => {
    const response = await fetch(url, init);

    // Throw for non-ok responses so they can be retried
    if (!response.ok) {
      const error: any = new Error(`HTTP ${response.status}: ${response.statusText}`);
      error.status = response.status;
      error.response = response;
      throw error;
    }

    return response;
  }, options);
}
