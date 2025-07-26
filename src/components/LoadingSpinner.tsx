import React from 'react';
import { 
  View, 
  ActivityIndicator, 
  Text, 
  StyleSheet, 
  ViewStyle, 
  TextStyle 
} from 'react-native';

interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  color?: string;
  message?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  overlay?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'large',
  color = '#007AFF',
  message,
  style,
  textStyle,
  overlay = false,
}) => {
  const containerStyle = [
    overlay ? styles.overlay : styles.container,
    style,
  ];

  return (
    <View style={containerStyle}>
      <ActivityIndicator size={size} color={color} />
      {message && (
        <Text style={[styles.message, textStyle]}>
          {message}
        </Text>
      )}
    </View>
  );
};

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Loading...' 
}) => {
  return (
    <View style={styles.screen}>
      <LoadingSpinner 
        size="large" 
        message={message}
        style={styles.screenSpinner}
      />
    </View>
  );
};

interface InlineLoadingProps {
  message?: string;
  size?: 'small' | 'large';
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({ 
  message = 'Loading...', 
  size = 'small' 
}) => {
  return (
    <View style={styles.inline}>
      <LoadingSpinner 
        size={size} 
        message={message}
        style={styles.inlineSpinner}
      />
    </View>
  );
};

interface ButtonLoadingProps {
  loading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const ButtonLoading: React.FC<ButtonLoadingProps> = ({
  loading,
  children,
  loadingText = 'Loading...',
  style,
  textStyle,
}) => {
  if (loading) {
    return (
      <View style={[styles.buttonLoading, style]}>
        <ActivityIndicator size="small" color="#ffffff" />
        <Text style={[styles.buttonLoadingText, textStyle]}>
          {loadingText}
        </Text>
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
  },
  screenSpinner: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inline: {
    padding: 10,
    alignItems: 'center',
  },
  inlineSpinner: {
    // No additional styling needed
  },
  buttonLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  buttonLoadingText: {
    color: '#ffffff',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
  },
  message: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

// Hook for managing loading states
export const useLoading = (initialState = false) => {
  const [isLoading, setIsLoading] = React.useState(initialState);

  const startLoading = React.useCallback(() => {
    setIsLoading(true);
  }, []);

  const stopLoading = React.useCallback(() => {
    setIsLoading(false);
  }, []);

  const withLoading = React.useCallback(async (
    asyncFunction: () => Promise<any>
  ): Promise<any> => {
    startLoading();
    try {
      const result = await asyncFunction();
      return result;
    } finally {
      stopLoading();
    }
  }, [startLoading, stopLoading]);

  return {
    isLoading,
    startLoading,
    stopLoading,
    withLoading,
  };
};