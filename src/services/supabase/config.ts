import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

let clerkTokenGetter: (() => Promise<string | null>) | null = null;

export function bindClerkTokenGetter(getter: () => Promise<string | null>) {
  clerkTokenGetter = getter;
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: async (url: any, init?: RequestInit) => {
      try {
        const isFunctionsCall = typeof url === 'string' && url.includes('/functions/v1/');
        const headers = new Headers(init?.headers || {});

        // Attach Clerk session token for DB/Storage requests only (not for Edge Functions)
        if (!isFunctionsCall && clerkTokenGetter) {
          const token = await clerkTokenGetter();
          if (token) {
            headers.set('Authorization', `Bearer ${token}`);
          }
        }

        return fetch(url, { ...init, headers });
      } catch (_e) {
        return fetch(url, init as any);
      }
    },
  },
  auth: {
    // Disable Supabase auth since we're using Clerk
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

// Export for debugging
export const supabaseConfig = {
  url: supabaseUrl,
  anonKey: supabaseAnonKey,
};