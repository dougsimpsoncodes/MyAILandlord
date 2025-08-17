import { useAuth } from '@clerk/clerk-expo'
import { supabase } from '../lib/supabaseClient'
export function useSupabaseWithAuth() {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const getAccessToken = async () => {
    if (!isLoaded || !isSignedIn) return null
    return await getToken()
  }
  return { supabase, getAccessToken, isLoaded, isSignedIn }
}
