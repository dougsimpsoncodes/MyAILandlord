import { useAuth } from '@clerk/clerk-expo';
import { supabase } from '../lib/supabaseClient';
import { useEffect, useState } from 'react';
import { Database } from '../services/supabase/types';

/**
 * Custom hook for Clerk + Supabase integration
 * Uses centralized client to avoid multiple instances
 */
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
  const [profile, setProfile] = useState(null);
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
        console.error('Error fetching profile:', error);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Profile fetch error:', error);
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
        console.error('Error creating profile:', error);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Profile creation error:', error);
    }
  };

  const updateProfile = async (updates: any) => {
    if (!supabase || !user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('clerk_user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        return { error };
      }

      setProfile(data);
      return { data };
    } catch (error) {
      console.error('Profile update error:', error);
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