import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { getErrorMessage, isNetworkError } from '../utils/helpers';
import { log } from '../lib/log';
import { ERROR_MESSAGES } from '../utils/constants';

export interface ErrorState {
  hasError: boolean;
  error: string | null;
  errorCode?: string;
  isNetworkError: boolean;
}

export interface ErrorHandlingOptions {
  showAlert?: boolean;
  logError?: boolean;
  context?: string;
  customErrorMessage?: string;
  onError?: (error: Error) => void;
}

export const useErrorHandling = () => {
  const [errorState, setErrorState] = useState<ErrorState>({
    hasError: false,
    error: null,
    errorCode: undefined,
    isNetworkError: false,
  });

  const clearError = useCallback(() => {
    setErrorState({
      hasError: false,
      error: null,
      errorCode: undefined,
      isNetworkError: false,
    });
  }, []);

  const handleError = useCallback((
    error: unknown,
    options: ErrorHandlingOptions = {}
  ) => {
    const {
      showAlert = true,
      logError = true,
      context = 'Unknown',
      customErrorMessage,
      onError,
    } = options;

    const errorMessage = customErrorMessage || getErrorMessage(error);
    const isNetwork = isNetworkError(error);
    
    let errorCode: string | undefined;
    if (error instanceof Error && 'code' in error) {
      errorCode = (error as any).code;
    }

    // Update error state
    setErrorState({
      hasError: true,
      error: errorMessage,
      errorCode,
      isNetworkError: isNetwork,
    });

    // Log error if enabled
    if (logError) {
      log.error(`Error in ${context}:`, { error: error instanceof Error ? { message: error.message, stack: error.stack } : String(error) });
      
      // In production, send to crash reporting service
      if (!__DEV__) {
        // TODO: Send to crash reporting service
        log.error('Production error:', {
          context,
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          timestamp: new Date().toISOString(),
          isNetwork,
          errorCode,
        });
      }
    }

    // Show alert if enabled
    if (showAlert) {
      const title = isNetwork ? 'Connection Error' : 'Error';
      const message = isNetwork ? ERROR_MESSAGES.NETWORK_ERROR : errorMessage;
      
      Alert.alert(
        title,
        message,
        [
          {
            text: 'OK',
            onPress: clearError,
          },
          ...(isNetwork ? [{
            text: 'Retry',
            onPress: () => {
              clearError();
              // Custom retry logic would go here
            },
          }] : []),
        ]
      );
    }

    // Call custom error handler if provided
    if (onError && error instanceof Error) {
      onError(error);
    }
  }, [clearError]);

  const withErrorHandling = useCallback(async <T>(
    asyncFunction: () => Promise<T>,
    options: ErrorHandlingOptions = {}
  ): Promise<T | null> => {
    try {
      clearError();
      const result = await asyncFunction();
      return result;
    } catch (error) {
      handleError(error, options);
      return null;
    }
  }, [handleError, clearError]);

  const showError = useCallback((
    message: string,
    options: Omit<ErrorHandlingOptions, 'customErrorMessage'> = {}
  ) => {
    handleError(new Error(message), {
      ...options,
      customErrorMessage: message,
    });
  }, [handleError]);

  return {
    errorState,
    handleError,
    clearError,
    withErrorHandling,
    showError,
  };
};

// Specialized hook for API errors
export const useApiErrorHandling = () => {
  const { handleError, clearError, errorState, withErrorHandling } = useErrorHandling();

  const handleApiError = useCallback((
    error: unknown,
    context: string = 'API call'
  ) => {
    let customMessage = ERROR_MESSAGES.GENERIC_ERROR;
    
    if (isNetworkError(error)) {
      customMessage = ERROR_MESSAGES.NETWORK_ERROR;
    } else if (error instanceof Error) {
      // Handle specific API error codes
      const errorMessage = error.message.toLowerCase();
      
      if (errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
        customMessage = ERROR_MESSAGES.UNAUTHORIZED;
      } else if (errorMessage.includes('not found') || errorMessage.includes('404')) {
        customMessage = 'The requested resource was not found.';
      } else if (errorMessage.includes('forbidden') || errorMessage.includes('403')) {
        customMessage = ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS;
      } else if (errorMessage.includes('validation') || errorMessage.includes('invalid')) {
        customMessage = 'Please check your input and try again.';
      }
    }

    handleError(error, {
      context,
      customErrorMessage: customMessage,
      logError: true,
      showAlert: true,
    });
  }, [handleError]);

  const withApiErrorHandling = useCallback(async <T>(
    apiCall: () => Promise<T>,
    context: string = 'API call'
  ): Promise<T | null> => {
    return withErrorHandling(apiCall, {
      context,
      logError: true,
      showAlert: true,
      onError: (error) => handleApiError(error, context),
    });
  }, [withErrorHandling, handleApiError]);

  return {
    errorState,
    handleApiError,
    clearError,
    withApiErrorHandling,
  };
};

// Hook for authentication-specific errors
export const useAuthErrorHandling = () => {
  const { handleError, clearError, errorState } = useErrorHandling();

  const handleAuthError = useCallback((
    error: unknown,
    context: string = 'Authentication'
  ) => {
    let customMessage = 'Authentication failed. Please try again.';
    
    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      if (errorMessage.includes('invalid credentials')) {
        customMessage = 'Invalid email or password. Please try again.';
      } else if (errorMessage.includes('user not found')) {
        customMessage = 'No account found with this email address.';
      } else if (errorMessage.includes('email already exists')) {
        customMessage = 'An account with this email already exists.';
      } else if (errorMessage.includes('weak password')) {
        customMessage = ERROR_MESSAGES.PASSWORD_TOO_SHORT;
      } else if (errorMessage.includes('invalid email')) {
        customMessage = ERROR_MESSAGES.INVALID_EMAIL;
      }
    }

    handleError(error, {
      context,
      customErrorMessage: customMessage,
      logError: true,
      showAlert: true,
    });
  }, [handleError]);

  return {
    errorState,
    handleAuthError,
    clearError,
  };
};
