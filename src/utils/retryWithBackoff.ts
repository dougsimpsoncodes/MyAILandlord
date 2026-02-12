/**
 * Retry utility with exponential backoff for resilient network requests
 */

interface RetriableError extends Error {
  status?: number;
  response?: Response;
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  onRetry?: (attempt: number, delay: number, error: unknown) => void;
}

/**
 * Retry a function with exponential backoff
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

  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      const isRetriable = isRetriableError(error);
      const isLastAttempt = attempt === maxRetries - 1;

      if (!isRetriable || isLastAttempt) {
        throw error;
      }

      const exponentialDelay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 200;
      const delay = Math.min(exponentialDelay + jitter, maxDelay);

      onRetry?.(attempt + 1, delay, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Check if an error should trigger a retry
 */
function isRetriableError(error: unknown): boolean {
  const retriable = error as Partial<RetriableError>;

  if (typeof retriable.status === 'number') {
    if (retriable.status >= 500 && retriable.status < 600) return true;
    if (retriable.status === 429) return true;
    if (retriable.status === 408) return true;
  }

  const message = retriable.message?.toLowerCase();
  if (message) {
    if (message.includes('network')) return true;
    if (message.includes('timeout')) return true;
    if (message.includes('econnrefused')) return true;
    if (message.includes('enotfound')) return true;
  }

  if (retriable.name === 'TypeError' && message?.includes('fetch')) {
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

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as RetriableError;
      error.status = response.status;
      error.response = response;
      throw error;
    }

    return response;
  }, options);
}
