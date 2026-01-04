/**
 * Supabase Test Client
 *
 * Creates a Supabase client for E2E tests that works in Node.js environment
 * (not React Native). Uses environment variables from .env file.
 */

import { createClient } from '@supabase/supabase-js';

// Load environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set.'
  );
}

/**
 * Public Supabase client (uses anon key)
 * Use this for testing user-facing operations
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false, // Don't persist sessions in tests
    detectSessionInUrl: false,
  },
});

/**
 * Admin Supabase client (uses service role key)
 * Use this for test setup/cleanup operations that bypass RLS
 */
export const supabaseAdmin = supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : supabase; // Fall back to regular client if no service role key

/**
 * Helper to clean up test data
 */
export async function cleanupTestUser(userId: string) {
  try {
    // Delete in order to respect foreign key constraints
    await supabaseAdmin.from('property_areas').delete().match({ user_id: userId });
    await supabaseAdmin.from('tenant_property_links').delete().match({ tenant_id: userId });
    await supabaseAdmin.from('properties').delete().match({ landlord_id: userId });
    await supabaseAdmin.from('profiles').delete().match({ id: userId });
    await supabaseAdmin.auth.admin.deleteUser(userId);
  } catch (error) {
    console.error('Cleanup error for user', userId, ':', error);
  }
}

/**
 * Helper to clean up test property
 */
export async function cleanupTestProperty(propertyId: string) {
  try {
    await supabaseAdmin.from('property_areas').delete().match({ property_id: propertyId });
    await supabaseAdmin.from('tenant_property_links').delete().match({ property_id: propertyId });
    await supabaseAdmin.from('invites').delete().match({ property_id: propertyId });
    await supabaseAdmin.from('properties').delete().match({ id: propertyId });
  } catch (error) {
    console.error('Cleanup error for property', propertyId, ':', error);
  }
}
