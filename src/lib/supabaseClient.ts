import { createClient, SupabaseClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { log } from './log'

declare global { var __sb: SupabaseClient | undefined }

const url = process.env.EXPO_PUBLIC_SUPABASE_URL as string
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string

// Create a basic Supabase client; request-level auth is handled by hooks
function createSupabaseClient() {
  return createClient(url, anon, {
    auth: {
      storage: AsyncStorage, // Required for React Native session persistence
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
}

// Singleton Supabase client
export const supabase = globalThis.__sb || createSupabaseClient()
if (!globalThis.__sb) {
  globalThis.__sb = supabase
  log.info('✅ Supabase singleton client created (this should only appear ONCE per tab)')
}

export const authenticatedClient = {
  getClient: () => supabase,
}
