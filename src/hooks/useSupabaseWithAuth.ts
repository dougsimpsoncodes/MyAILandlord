import { useAppAuth } from '../context/SupabaseAuthContext'
import { supabase as supabaseClient } from '../lib/supabaseClient'
import { useMemo } from 'react'
import { isTestMode } from '../lib/testMode'
import { createClient } from '@supabase/supabase-js'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL as string
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string

export function useSupabaseWithAuth() {
  const authDisabled = process.env.EXPO_PUBLIC_AUTH_DISABLED === '1'
  const { session, isSignedIn, isLoading } = useAppAuth()

  // In auth-disabled or test mode, use singleton Supabase client
  if (authDisabled || isTestMode) {
    const getAccessToken = async () => (isTestMode ? 'test-jwt-token' : null)
    return { supabase: supabaseClient, getAccessToken, isLoaded: true, isSignedIn: authDisabled || isTestMode }
  }

  // Create a client bound to the current access token (do not mutate singleton internals)
  const supabase = useMemo(() => {
    if (session?.access_token) {
      return createClient(url, anon, {
        global: {
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      })
    }
    return supabaseClient
  }, [session?.access_token])

  const getAccessToken = async () => {
    return session?.access_token || null
  }

  return { supabase, getAccessToken, isLoaded: !isLoading, isSignedIn }
}
