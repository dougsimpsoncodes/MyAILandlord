// DEPRECATED: Use useSupabaseWithAuth from 'src/hooks/useSupabaseWithAuth' instead.
import { useSession, useUser } from '@clerk/clerk-expo';
import { supabase } from '../lib/supabaseClient';

/**
 * Hook to use centralized Clerk-authenticated Supabase client
 * Uses the single instance from lib/supabaseClient to avoid multiple instances
 */
export function useClerkSupabase() {
  const { user, isSignedIn, isLoaded } = useUser();
  const { session } = useSession();

  return {
    client: supabase,
    user,
    isSignedIn,
    isLoaded,
    session,
    // Helper to get current Clerk user ID
    clerkUserId: user?.id || null,
  };
}
