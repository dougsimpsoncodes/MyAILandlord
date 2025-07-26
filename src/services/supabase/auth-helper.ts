import { supabase } from './config';

/**
 * Sets the current user context for Row Level Security policies
 * This should be called before any Supabase queries that need user context
 */
export async function setSupabaseUserContext(clerkUserId: string) {
  try {
    // Call the Supabase function to set the user context
    const { error } = await supabase.rpc('set_current_user_id', {
      user_id: clerkUserId
    });

    if (error) {
      console.error('Error setting Supabase user context:', error);
      throw error;
    }
  } catch (error) {
    console.error('Failed to set user context:', error);
    throw error;
  }
}

/**
 * Wraps a Supabase query with user context
 * Ensures the user context is set before executing the query
 */
export async function withUserContext<T>(
  clerkUserId: string,
  queryFn: () => Promise<T>
): Promise<T> {
  await setSupabaseUserContext(clerkUserId);
  return queryFn();
}