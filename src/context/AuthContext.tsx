import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider, 
  signInWithCredential,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '../services/firebase/config';
import { apiClient } from '../services/api/client';
import { GoogleSignInService } from '../services/auth/googleSignIn';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: 'tenant' | 'landlord';
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (provider: 'google' | 'apple') => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // User is signed in, get their profile from our backend
          try {
            const profile = await apiClient.getUserProfile();
            setUser({
              id: firebaseUser.uid,
              name: profile.displayName || firebaseUser.displayName || 'User',
              email: firebaseUser.email || '',
              avatar: profile.photoURL || firebaseUser.photoURL || undefined,
              role: profile.role
            });
          } catch (error) {
            // Profile doesn't exist yet, create basic user object
            setUser({
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'User',
              email: firebaseUser.email || '',
              avatar: firebaseUser.photoURL || undefined
            });
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const signIn = async (provider: 'google' | 'apple') => {
    try {
      setIsLoading(true);
      
      if (provider === 'google') {
        // Use Google Sign-In service
        const result = await GoogleSignInService.signIn();
        
        if (result.success && result.idToken) {
          // Create Firebase credential from Google ID token
          const credential = GoogleAuthProvider.credential(result.idToken);
          
          // Sign in to Firebase with the credential
          await signInWithCredential(auth, credential);
          
          // Firebase auth state listener will handle setting the user
        } else {
          // Fallback to mock for development/testing
          console.log('Google Sign-In not available, using fallback:', result.error);
          const mockUser: User = {
            id: 'demo-google-user',
            name: 'Demo Google User',
            email: 'demo@gmail.com',
            avatar: undefined,
          };
          
          setUser(mockUser);
        }
      } else if (provider === 'apple') {
        // Apple Sign-In not implemented yet, use mock
        const mockUser: User = {
          id: 'demo-apple-user',
          name: 'Demo Apple User',
          email: 'demo@icloud.com',
          avatar: undefined,
        };
        
        setUser(mockUser);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Sign in failed:', error);
      setIsLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      // Sign out from Google Sign-In service first
      await GoogleSignInService.signOut();
      
      // Then sign out from Firebase
      await firebaseSignOut(auth);
    } catch (error) {
      console.error('Sign out failed:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};