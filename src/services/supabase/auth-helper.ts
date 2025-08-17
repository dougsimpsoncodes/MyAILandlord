import { supabase } from './config';

/**
 * IMPORTANT: This function requires proper JWT template configuration in Clerk
 * 
 * To set up Clerk JWT templates for Supabase:
 * 1. Go to Clerk Dashboard > JWT Templates
 * 2. Create a new template named "supabase"
 * 3. Set the signing algorithm to "RS256"
 * 4. Add custom claims:
 *    - sub: {{user.id}}
 *    - email: {{user.primary_email_address.email_address}}
 *    - aud: "authenticated"
 *    - iat: {{token.iat}}
 *    - exp: {{token.exp}}
 * 5. Copy the JWT template ID to your environment variables
 */

/**
 * Sets the current user context for Row Level Security policies
 * This should be called before any Supabase queries that need user context
 * 
 * Note: This function is deprecated. Use the authenticated client from useSupabaseWithClerk instead.
 */
export async function setSupabaseUserContext(clerkUserId: string) {
  console.warn('setSupabaseUserContext is deprecated. Use useSupabaseWithClerk hook instead.');
  
  // This function is no longer needed when using JWT tokens
  // The JWT token automatically sets the user context for RLS policies
  return;
}

/**
 * Wraps a Supabase query with user context
 * Ensures the user context is set before executing the query
 * 
 * Note: This function is deprecated. Use the authenticated client from useSupabaseWithClerk instead.
 */
export async function withUserContext<T>(
  clerkUserId: string,
  queryFn: () => Promise<T>
): Promise<T> {
  console.warn('withUserContext is deprecated. Use useSupabaseWithClerk hook instead.');
  
  // When using JWT tokens, the context is automatically set
  return queryFn();
}

/**
 * Creates a properly configured Supabase client with Clerk JWT authentication
 * This is the recommended approach for authenticated Supabase operations
 */
export function createAuthenticatedSupabaseClient(jwtToken: string) {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return supabase.auth.setSession({
    access_token: jwtToken,
    refresh_token: '',
  });
}