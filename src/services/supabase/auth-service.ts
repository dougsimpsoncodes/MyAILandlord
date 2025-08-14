import { supabase } from './config';
import { setSupabaseUserContext } from './auth-helper';
import { Database } from './types';

type Profile = Database['public']['Tables']['profiles']['Row'];

export class AuthService {
  /**
   * Syncs Clerk user data with Supabase profile
   * Creates or updates user profile when they sign in
   */
  static async syncUserProfile(clerkUserId: string, userData: {
    email: string;
    name?: string;
    avatarUrl?: string;
  }): Promise<Profile> {
    try {
      // Set user context for RLS policies
      await setSupabaseUserContext(clerkUserId);
      
      // Check if profile exists
      const existingProfile = await supabase
        .from('profiles')
        .select('*')
        .eq('clerk_user_id', clerkUserId)
        .single();

      if (existingProfile.data) {
        // Update existing profile
        const { data, error } = await supabase
          .from('profiles')
          .update({
            email: userData.email,
            name: userData.name || existingProfile.data.name,
            avatar_url: userData.avatarUrl || existingProfile.data.avatar_url,
            updated_at: new Date().toISOString(),
          })
          .eq('clerk_user_id', clerkUserId)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new profile
        const { data, error } = await supabase
          .from('profiles')
          .insert({
            clerk_user_id: clerkUserId,
            email: userData.email,
            name: userData.name || null,
            avatar_url: userData.avatarUrl || null,
            role: null, // Will be set later
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Failed to sync user profile:', error);
      throw new Error(`Profile sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sets user role in Supabase profile
   */
  static async setUserRole(clerkUserId: string, role: 'tenant' | 'landlord'): Promise<Profile> {
    try {
      await setSupabaseUserContext(clerkUserId);
      
      const { data, error } = await supabase
        .from('profiles')
        .update({
          role,
          updated_at: new Date().toISOString(),
        })
        .eq('clerk_user_id', clerkUserId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Failed to set user role:', error);
      throw new Error(`Role update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets user profile with role
   */
  static async getUserProfile(clerkUserId: string): Promise<Profile | null> {
    try {
      await setSupabaseUserContext(clerkUserId);
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('clerk_user_id', clerkUserId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No profile found
        }
        throw error;
      }
      
      return data;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  /**
   * Cleans up user data on sign out
   */
  static async cleanupUserSession(clerkUserId: string): Promise<void> {
    try {
      // Clear any user-specific data or context
      // This could include clearing local storage, etc.
      console.log('User session cleaned up for:', clerkUserId);
    } catch (error) {
      console.error('Failed to cleanup user session:', error);
    }
  }
}