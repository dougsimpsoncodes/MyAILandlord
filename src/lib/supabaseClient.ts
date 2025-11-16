import { createClient, SupabaseClient } from '@supabase/supabase-js'

declare global { var __sb: SupabaseClient | undefined }

const url = process.env.EXPO_PUBLIC_SUPABASE_URL as string
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string

// Create a basic Supabase client; request-level auth is handled by hooks
function createSupabaseClient() {
  return createClient(url, anon, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
}

// Singleton Supabase client
export const supabase = globalThis.__sb || createSupabaseClient()
if (!globalThis.__sb) globalThis.__sb = supabase

export const authenticatedClient = {
  getClient: () => supabase,
}
