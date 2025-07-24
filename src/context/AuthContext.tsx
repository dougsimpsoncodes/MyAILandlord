import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '../services/firebase/config';
import { apiClient } from '../services/api/client';

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
      
      // For demo purposes, create a mock user immediately
      // This bypasses Firebase Auth temporarily for testing
      const mockUser: User = {
        id: provider === 'google' ? 'demo-google-user' : 'demo-apple-user',
        name: provider === 'google' ? 'Demo Google User' : 'Demo Apple User',
        email: provider === 'google' ? 'demo@gmail.com' : 'demo@icloud.com',
        avatar: undefined,
      };
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setUser(mockUser);
      setIsLoading(false);
    } catch (error) {
      console.error('Sign in failed:', error);
      setIsLoading(false);
      throw error;
    }
  };

  const signOut = async () => {
    try {
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