import { useAppAuth } from '../context/SupabaseAuthContext'
import { supabase } from '../lib/supabaseClient'
import { useEffect } from 'react'
import { isTestMode } from '../lib/testMode'

export function useSupabaseWithAuth() {
  const authDisabled = process.env.EXPO_PUBLIC_AUTH_DISABLED === '1'
  const useTestClient = authDisabled || isTestMode
  const { session, isSignedIn, isLoading } = useAppAuth()

  // Use the singleton Supabase client - DO NOT create new clients!
  // The singleton already handles auth tokens automatically via Supabase Auth
  useEffect(() => {
    if (!useTestClient && session?.access_token) {
      // The singleton client automatically includes auth headers
      // No need to manually set them
    }
  }, [useTestClient, session?.access_token])

  const getAccessToken = async () => {
    if (useTestClient) {
      return isTestMode ? 'test-jwt-token' : null
    }
    return session?.access_token || null
  }

  // Always return the singleton client - no more creating multiple instances!
  return {
    supabase, // Singleton client from lib/supabaseClient
    getAccessToken,
    isLoaded: useTestClient ? true : !isLoading,
    isSignedIn: useTestClient ? true : isSignedIn
  }
}
