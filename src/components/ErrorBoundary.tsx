import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ERROR_MESSAGES } from '../utils/constants';
import { getErrorMessage } from '../utils/helpers';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to crash reporting service in production
    if (!__DEV__) {
      // TODO: Send to crash reporting service
      console.error('Production error:', {
        error: error.message,
        type: error.name,
        timestamp: new Date().toISOString()
      });
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <View style={styles.container}>
          <View style={styles.errorCard}>
            <Text style={styles.title}>Oops! Something went wrong</Text>
            <Text style={styles.message}>
              {getErrorMessage(this.state.error) || ERROR_MESSAGES.GENERIC_ERROR}
            </Text>
            
            {__DEV__ && this.state.error && (
              <View style={styles.debugInfo}>
                <Text style={styles.debugTitle}>Debug Information:</Text>
                <Text style={styles.debugText}>
                  {this.state.error.stack}
                </Text>
                {this.state.errorInfo && (
                  <Text style={styles.debugText}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </View>
            )}
            
            <TouchableOpacity style={styles.retryButton} onPress={this.handleRetry}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorCard: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 24,
    maxWidth: 400,
    width: '100%',
    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
  },
  debugInfo: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b6b',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    lineHeight: 16,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 16,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

// Specialized error boundary for authentication errors
export const AuthErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  const handleAuthError = (error: Error, errorInfo: ErrorInfo) => {
    console.error('Authentication error:', error, errorInfo);
    // Could redirect to login screen or show specific auth error UI
  };

  return (
    <ErrorBoundary 
      onError={handleAuthError}
      fallback={
        <View style={styles.container}>
          <View style={styles.errorCard}>
            <Text style={styles.title}>Authentication Error</Text>
            <Text style={styles.message}>
              There was a problem with your authentication. Please try signing in again.
            </Text>
            <TouchableOpacity style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Go to Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      }
    >
      {children}
    </ErrorBoundary>
  );
};

// Specialized error boundary for API errors
export const ApiErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  const handleApiError = (error: Error, errorInfo: ErrorInfo) => {
    console.error('API error:', error, errorInfo);
    // Could show network status or retry mechanisms
  };

  return (
    <ErrorBoundary 
      onError={handleApiError}
      fallback={
        <View style={styles.container}>
          <View style={styles.errorCard}>
            <Text style={styles.title}>Connection Error</Text>
            <Text style={styles.message}>
              We're having trouble connecting to our servers. Please check your internet connection and try again.
            </Text>
            <TouchableOpacity style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      }
    >
      {children}
    </ErrorBoundary>
  );
};

// Hook for handling errors in functional components
export const useErrorHandler = () => {
  const handleError = React.useCallback((error: Error, context?: string) => {
    console.error(`Error in ${context || 'component'}:`, error);
    
    // In a real app, you'd send this to a crash reporting service
    if (!__DEV__) {
      // TODO: Send to crash reporting service
      console.error('Production error:', {
        error: error.message,
        type: error.name,
        context,
        timestamp: new Date().toISOString()
      });
    }
  }, []);

  return { handleError };
};