import { useEffect } from 'react';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useApiClient } from '../services/api/client';
import { useContext } from 'react';
import { RoleContext } from '../context/RoleContext';

export function useProfileSync() {
  const { userId, isSignedIn } = useAuth();
  const { user } = useUser();
  const { userRole } = useContext(RoleContext);
  const apiClient = useApiClient(); // Always call hook (React rules)

  useEffect(() => {
    if (!isSignedIn || !userId || !user || !apiClient) return;

    const syncProfile = async () => {
      try {
        // Get profile from Supabase
        let profile = await apiClient.getUserProfile();
        
        // If profile doesn't exist, create it with Clerk user data
        if (!profile) {
          profile = await apiClient.createUserProfile({
            email: user.emailAddresses[0]?.emailAddress || '',
            name: user.fullName || user.firstName || '',
            avatarUrl: user.imageUrl || undefined,
            role: userRole || undefined,
          });
        } else {
          // If profile exists but doesn't have a role and we have one in context, update it
          if (!profile.role && userRole) {
            await apiClient.setUserRole(userRole);
          }
          
          // Update profile info if needed
          const needsUpdate = 
            profile.name !== user.fullName ||
            profile.email !== user.emailAddresses[0]?.emailAddress ||
            profile.avatar_url !== user.imageUrl;
            
          if (needsUpdate) {
            await apiClient.updateUserProfile({
              name: user.fullName || user.firstName || '',
              avatarUrl: user.imageUrl || undefined,
            });
          }
        }
      } catch (error) {
        console.error('Error syncing profile:', error);
      }
    };

    syncProfile();
  }, [isSignedIn, userId, user, userRole]);
}