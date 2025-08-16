import { createClient, SupabaseClient } from '@supabase/supabase-js'
declare global { var __sb: SupabaseClient | undefined }
const url = process.env.EXPO_PUBLIC_SUPABASE_URL as string
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string
const key = 'myailandlord-auth'
export const supabase: SupabaseClient = globalThis.__sb ?? createClient(url, anon, { auth: { storageKey: key, autoRefreshToken: true, persistSession: true }})
if (!globalThis.__sb) globalThis.__sb = supabase
