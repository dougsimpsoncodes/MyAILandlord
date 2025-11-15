// DEPRECATED: Use useSupabaseWithAuth from 'src/hooks/useSupabaseWithAuth' instead.
// This file is kept temporarily to avoid widespread import breaks and will be removed
// once all usages have migrated.
import { useAuth } from '@clerk/clerk-expo';
import { supabase } from '../lib/supabaseClient';
import { useEffect, useState } from 'react';
import { Database } from '../services/supabase/types';
import log from '../lib/log';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
export function useClerkSupabase() {
  const { isLoaded, isSignedIn } = useAuth();

  return { 
    supabase, 
    isLoading: !isLoaded,
    isAuthenticated: isSignedIn 
  };
}

/**
 * Helper hook for common Supabase operations with Clerk auth
 */
export function useSupabaseProfile() {
  const { supabase, isAuthenticated } = useClerkSupabase();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !isAuthenticated || !user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    fetchProfile();
  }, [supabase, isAuthenticated, user]);

  const fetchProfile = async () => {
    if (!supabase || !user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('clerk_user_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it
        await createProfile();
      } else if (error) {
        log.error('Error fetching profile', { error: String(error) });
      } else {
        setProfile(data);
      }
    } catch (error) {
      log.error('Profile fetch error', { error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async () => {
    if (!supabase || !user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          clerk_user_id: user.id,
          email: user.emailAddresses[0]?.emailAddress,
          name: user.fullName || user.firstName || null,
        })
        .select()
        .single();

      if (error) {
        log.error('Error creating profile', { error: String(error) });
      } else {
        setProfile(data);
      }
    } catch (error) {
      log.error('Profile creation error', { error: String(error) });
    }
  };

  const updateProfile = async (updates: ProfileUpdate) => {
    if (!supabase || !user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('clerk_user_id', user.id)
        .select()
        .single();

      if (error) {
        log.error('Error updating profile', { error: String(error) });
        return { error };
      }

      setProfile(data);
      return { data };
    } catch (error) {
      log.error('Profile update error', { error: String(error) });
      return { error };
    }
  };

  return {
    profile,
    loading,
    refetch: fetchProfile,
    updateProfile,
  };
}
