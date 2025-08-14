import { supabase } from './config';

/**
 * Sets the current user context for Row Level Security policies
 * This should be called before any Supabase queries that need user context
 */
export async function setSupabaseUserContext(_clerkUserId: string) {
  // No-op: we rely on Clerk-issued JWTs passed via Authorization header
  return;
}

/**
 * Wraps a Supabase query with user context
 * Ensures the user context is set before executing the query
 */
export async function withUserContext<T>(
  _clerkUserId: string,
  queryFn: () => Promise<T>
): Promise<T> {
  // Clerk token is attached at the transport layer; no additional RPC needed
  return queryFn();
}