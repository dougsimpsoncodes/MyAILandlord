import { useEffect, useState } from 'react';
import { useAppAuth } from '../context/ClerkAuthContext';
import { useRole } from '../context/RoleContext';
import { AuthService } from '../services/supabase/auth-service';

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
  } | null;
  role: 'tenant' | 'landlord' | null;
  profile: any | null;
}

export function useAuthState(): AuthState {
  const { user, isLoading: authLoading, isSignedIn } = useAppAuth();
  const { userRole, isLoading: roleLoading } = useRole();
  const [profile, setProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  // Load user profile from Supabase when user and role are available
  useEffect(() => {
    if (user?.id && userRole && !profileLoading) {
      const loadProfile = async () => {
        try {
          setProfileLoading(true);
          const userProfile = await AuthService.getUserProfile(user.id);
          setProfile(userProfile);
        } catch (error) {
          console.error('Failed to load user profile:', error);
        } finally {
          setProfileLoading(false);
        }
      };

      loadProfile();
    }
  }, [user?.id, userRole, profileLoading]);

  const isLoading = authLoading || roleLoading || profileLoading;

  return {
    isAuthenticated: isSignedIn && !!user && !!userRole,
    isLoading,
    user: user ? {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
    } : null,
    role: userRole,
    profile,
  };
}

// Hook for checking if user has specific permissions
export function usePermissions() {
  const { role, profile } = useAuthState();

  return {
    isLandlord: role === 'landlord',
    isTenant: role === 'tenant',
    canManageProperties: role === 'landlord',
    canViewMaintenance: role === 'tenant' || role === 'landlord',
    canManageUsers: role === 'landlord',
    profile,
  };
}