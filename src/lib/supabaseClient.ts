import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { log } from './log'

declare global { var __sb: SupabaseClient | undefined }

const url = process.env.EXPO_PUBLIC_SUPABASE_URL as string
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string

// Create Supabase client with modern Clerk integration
function createClerkSupabaseClient() {
  return createClient(url, anon, {
    auth: {
      // Disable Supabase auth since we're using Clerk
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        // Headers will be set per request in useClerkSupabase hook
      },
    },
  })
}

// Singleton Supabase client
export const supabase = globalThis.__sb || createClerkSupabaseClient()
if (!globalThis.__sb) globalThis.__sb = supabase

// Legacy export for compatibility
export const authenticatedClient = {
  getClient: () => supabase,
  // Deprecated: setSession is no longer needed with native Clerk integration
  setSession: async () => {
    log.warn('setSession is deprecated - use useClerkSupabase hook instead')
  }
}
