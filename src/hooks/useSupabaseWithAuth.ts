import { useAppAuth } from '../context/SupabaseAuthContext'
import { createClient } from '@supabase/supabase-js'
import { useMemo } from 'react'
import { isTestMode } from '../lib/testMode'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL as string
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string

export function useSupabaseWithAuth() {
  const authDisabled = process.env.EXPO_PUBLIC_AUTH_DISABLED === '1'
  const useTestClient = authDisabled || isTestMode
  const { session, isSignedIn, isLoading } = useAppAuth()

  // Always call useMemo unconditionally to satisfy React's rules of hooks
  const supabase = useMemo(() => {
    if (useTestClient) {
      // Test/auth-disabled mode: basic client
      return createClient(url, anon, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      })
    }
    // Normal mode: authenticated client
    return createClient(url, anon, {
      global: {
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {},
      },
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  }, [useTestClient, session?.access_token])

  const getAccessToken = async () => {
    if (useTestClient) {
      return isTestMode ? 'test-jwt-token' : null
    }
    return session?.access_token || null
  }

  if (useTestClient) {
    return { supabase, getAccessToken, isLoaded: true, isSignedIn: true }
  }

  return { supabase, getAccessToken, isLoaded: !isLoading, isSignedIn }
}
