import { useAppAuth } from '../context/SupabaseAuthContext'
import { createClient } from '@supabase/supabase-js'
import { useMemo } from 'react'
import { isTestMode } from '../lib/testMode'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL as string
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string

export function useSupabaseWithAuth() {
  const authDisabled = process.env.EXPO_PUBLIC_AUTH_DISABLED === '1'
  const { session, isSignedIn, isLoading } = useAppAuth()

  // In auth-disabled or test mode, use basic Supabase client
  if (authDisabled || isTestMode) {
    const supabase = useMemo(() => {
      return createClient(url, anon, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      })
    }, [])

    const getAccessToken = async () => (isTestMode ? 'test-jwt-token' : null)
    return { supabase, getAccessToken, isLoaded: true, isSignedIn: authDisabled || isTestMode }
  }

  // Create Supabase client with access token from session
  const supabase = useMemo(() => {
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
  }, [session?.access_token])

  const getAccessToken = async () => {
    return session?.access_token || null
  }

  return { supabase, getAccessToken, isLoaded: !isLoading, isSignedIn }
}
