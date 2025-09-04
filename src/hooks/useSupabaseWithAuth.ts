import { useAuth } from '@clerk/clerk-expo'
import { createClient } from '@supabase/supabase-js'
import { useMemo } from 'react'

const url = process.env.EXPO_PUBLIC_SUPABASE_URL as string
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string

export function useSupabaseWithAuth() {
  const { isLoaded, isSignedIn, getToken } = useAuth()

  // Create a Supabase client with Clerk integration (official pattern)
  const supabase = useMemo(() => {
    return createClient(url, anon, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
      accessToken: async () => {
        // This is the official Clerk-Supabase integration pattern
        if (!isSignedIn) {
          console.log('Not signed in - no access token')
          return null
        }
        
        try {
          const token = await getToken()
          console.log('Clerk access token for Supabase:', token ? 'present' : 'null')
          return token
        } catch (error) {
          console.error('Error getting Clerk access token:', error)
          return null
        }
      },
    })
  }, [isSignedIn, getToken])

  const getAccessToken = async () => {
    if (!isSignedIn) return null
    return await getToken() // No template parameter - use native Clerk token
  }

  return { 
    supabase, 
    getAccessToken, 
    isLoaded, 
    isSignedIn 
  }
}
