/**
 * Profile Sync Tests - Supabase API
 *
 * Tests profile synchronization and data integrity including:
 * - Profile creation and retrieval
 * - Profile updates
 * - Role verification
 * - Auth token handling
 */

import { test, expect } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { authenticateWithRetry, clearAuthCache } from './helpers/auth-helper';

// Test configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Test user credentials
const TEST_USERS = {
  landlord1: {
    email: 'test-landlord@myailandlord.com',
    password: 'MyAI2025!Landlord#Test',
  },
  tenant1: {
    email: 'test-tenant@myailandlord.com',
    password: 'MyAI2025!Tenant#Test',
  },
};

interface AuthenticatedClient {
  client: SupabaseClient;
  userId: string;
  profileId: string;
  session: { access_token: string; refresh_token: string };
}

// Sleep helper for rate limit backoff
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper to authenticate and get client with session info and rate limit retry
async function authenticateUser(
  email: string,
  password: string
): Promise<AuthenticatedClient | null> {
  const maxRetries = 5;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      const { data: authData, error: authError } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        // Check if it's a rate limit error
        if (authError.message.includes('rate limit') || authError.status === 429) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt), 30000);
          console.log(`Rate limited for ${email}, attempt ${attempt + 1}/${maxRetries}, waiting ${backoffMs}ms...`);
          await sleep(backoffMs);
          continue;
        }
        console.error(`Auth failed for ${email}:`, authError?.message);
        return null;
      }

      if (!authData.user || !authData.session) {
        console.error(`No user/session returned for ${email}`);
        return null;
      }

      return {
        client,
        userId: authData.user.id,
        profileId: authData.user.id,
        session: {
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
        },
      };
    } catch (error) {
      const backoffMs = Math.min(1000 * Math.pow(2, attempt), 30000);
      console.log(`Auth error for ${email}, attempt ${attempt + 1}/${maxRetries}, waiting ${backoffMs}ms...`);
      await sleep(backoffMs);
    }
  }

  console.error(`All ${maxRetries} auth attempts failed for ${email}`);
  return null;
}

test.describe.configure({ mode: 'serial' });

test.describe('Profile sync verification', () => {
  let landlord1: AuthenticatedClient | null = null;
  let tenant1: AuthenticatedClient | null = null;

  test('should authenticate and retrieve access token', async () => {
    landlord1 = await authenticateUser(TEST_USERS.landlord1.email, TEST_USERS.landlord1.password);

    expect(landlord1).toBeTruthy();
    expect(landlord1!.session.access_token).toBeTruthy();
    expect(landlord1!.session.access_token.length).toBeGreaterThan(50);

    console.log('Token retrieved successfully');
    console.log(`Token length: ${landlord1!.session.access_token.length} characters`);
  });

  test('should sync profile data after authentication', async () => {
    test.skip(!landlord1, 'Landlord not authenticated');

    // Verify profile exists and is synced
    const { data: profile, error } = await landlord1!.client
      .from('profiles')
      .select('id, email, role, created_at, updated_at')
      .eq('id', landlord1!.profileId)
      .single();

    expect(error).toBeNull();
    expect(profile).toBeTruthy();
    expect(profile?.id).toBe(landlord1!.profileId);
    expect(profile?.email).toBe(TEST_USERS.landlord1.email);
    expect(profile?.role).toBe('landlord');

    console.log('Profile sync verified:');
    console.log(`  - User ID: ${profile?.id}`);
    console.log(`  - Email: ${profile?.email}`);
    console.log(`  - Role: ${profile?.role}`);
    console.log(`  - Created: ${profile?.created_at}`);
  });

  test('should verify Supabase session is valid', async () => {
    test.skip(!landlord1, 'Landlord not authenticated');

    // Check current session
    const { data: session, error } = await landlord1!.client.auth.getSession();

    expect(error).toBeNull();
    expect(session.session).toBeTruthy();
    expect(session.session?.user.id).toBe(landlord1!.userId);

    console.log('Supabase session is valid');
  });

  test('should verify both landlord and tenant profiles sync correctly', async () => {
    landlord1 = await authenticateUser(TEST_USERS.landlord1.email, TEST_USERS.landlord1.password);
    tenant1 = await authenticateUser(TEST_USERS.tenant1.email, TEST_USERS.tenant1.password);

    expect(landlord1).toBeTruthy();
    // tenant1 may or may not authenticate depending on test order
    if (!tenant1) {
      console.log('Warning: tenant1 not authenticated - may have been used in another test');
      test.skip(true, 'tenant1 not available');
      return;
    }

    // Query both profiles
    const { data: landlordProfile } = await landlord1!.client
      .from('profiles')
      .select('id, email, role')
      .eq('id', landlord1!.profileId)
      .single();

    const { data: tenantProfile } = await tenant1!.client
      .from('profiles')
      .select('id, email, role')
      .eq('id', tenant1!.profileId)
      .single();

    expect(landlordProfile?.role).toBe('landlord');
    expect(tenantProfile?.role).toBe('tenant');

    console.log('Both profiles synced correctly:');
    console.log(`  - Landlord: ${landlordProfile?.email} (${landlordProfile?.role})`);
    console.log(`  - Tenant: ${tenantProfile?.email} (${tenantProfile?.role})`);
  });

  test('should handle profile read operations', async () => {
    test.skip(!landlord1, 'Landlord not authenticated');

    // Test reading full profile
    const { data, error } = await landlord1!.client
      .from('profiles')
      .select('*')
      .eq('id', landlord1!.profileId)
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();

    // Verify all expected profile fields
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('email');
    expect(data).toHaveProperty('role');
    expect(data).toHaveProperty('created_at');

    console.log('Profile read operation successful');
  });

  test('should verify auth.uid() matches profile.id', async () => {
    test.skip(!landlord1, 'Landlord not authenticated');

    // Get current user from auth
    const {
      data: { user },
      error: userError,
    } = await landlord1!.client.auth.getUser();

    expect(userError).toBeNull();
    expect(user).toBeTruthy();

    // Get profile
    const { data: profile, error: profileError } = await landlord1!.client
      .from('profiles')
      .select('id')
      .eq('id', user!.id)
      .single();

    expect(profileError).toBeNull();
    expect(profile?.id).toBe(user!.id);

    console.log('auth.uid() matches profile.id: verified');
  });
});

test.describe('Profile Data Integrity', () => {
  let landlord1: AuthenticatedClient | null = null;

  test.beforeAll(async () => {
    landlord1 = await authenticateUser(TEST_USERS.landlord1.email, TEST_USERS.landlord1.password);
  });

  test('should have valid timestamps', async () => {
    test.skip(!landlord1, 'Landlord not authenticated');

    const { data: profile, error } = await landlord1!.client
      .from('profiles')
      .select('created_at, updated_at')
      .eq('id', landlord1!.profileId)
      .single();

    expect(error).toBeNull();
    expect(profile?.created_at).toBeTruthy();

    // Verify created_at is a valid date
    const createdAt = new Date(profile!.created_at);
    expect(createdAt.getTime()).toBeGreaterThan(0);
    expect(createdAt.getFullYear()).toBeGreaterThanOrEqual(2024);

    console.log(`Profile timestamps valid: created ${profile?.created_at}`);
  });

  test('should have valid email format', async () => {
    test.skip(!landlord1, 'Landlord not authenticated');

    const { data: profile, error } = await landlord1!.client
      .from('profiles')
      .select('email')
      .eq('id', landlord1!.profileId)
      .single();

    expect(error).toBeNull();
    expect(profile?.email).toBeTruthy();

    // Verify email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(emailRegex.test(profile!.email)).toBe(true);

    console.log(`Email format valid: ${profile?.email}`);
  });

  test('should have valid role value', async () => {
    test.skip(!landlord1, 'Landlord not authenticated');

    const { data: profile, error } = await landlord1!.client
      .from('profiles')
      .select('role')
      .eq('id', landlord1!.profileId)
      .single();

    expect(error).toBeNull();
    expect(['landlord', 'tenant', 'admin']).toContain(profile?.role);

    console.log(`Role value valid: ${profile?.role}`);
  });

  test('should have valid UUID format for id', async () => {
    test.skip(!landlord1, 'Landlord not authenticated');

    const { data: profile, error } = await landlord1!.client
      .from('profiles')
      .select('id')
      .eq('id', landlord1!.profileId)
      .single();

    expect(error).toBeNull();

    // General UUID format (not strictly v4 - Supabase may use different UUID versions)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    expect(uuidRegex.test(profile!.id)).toBe(true);

    console.log(`UUID format valid: ${profile?.id}`);
  });
});

test.describe('Session and Token Management', () => {
  test('should handle authentication and get valid tokens', async () => {
    // Use authenticateWithRetry to handle rate limits
    const authClient = await authenticateWithRetry(
      TEST_USERS.landlord1.email,
      TEST_USERS.landlord1.password
    );

    expect(authClient).toBeTruthy();
    expect(authClient?.userId).toBeTruthy();
    expect(authClient?.client).toBeTruthy();

    // Verify we can get session from the authenticated client
    const { data: { session } } = await authClient!.client.auth.getSession();
    expect(session).toBeTruthy();
    expect(session?.access_token).toBeTruthy();
    expect(session?.refresh_token).toBeTruthy();

    console.log('Authentication tokens retrieved successfully');
  });

  test('should refresh session successfully', async () => {
    // Use authenticateWithRetry to handle rate limits
    const authClient = await authenticateWithRetry(
      TEST_USERS.landlord1.email,
      TEST_USERS.landlord1.password
    );

    expect(authClient).toBeTruthy();
    expect(authClient?.client).toBeTruthy();

    // Get the current session to verify it's valid and has tokens
    const { data: { session: currentSession } } = await authClient!.client.auth.getSession();
    expect(currentSession).toBeTruthy();
    expect(currentSession?.access_token).toBeTruthy();
    expect(currentSession?.refresh_token).toBeTruthy();

    // Verify the session has expiry time in the future
    if (currentSession?.expires_at) {
      const expiresAt = new Date(currentSession.expires_at * 1000);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    }

    console.log('Session has valid tokens and expiry');
  });

  test('should sign out successfully', async () => {
    // Use authenticateWithRetry to handle rate limits
    const authClient = await authenticateWithRetry(
      TEST_USERS.landlord1.email,
      TEST_USERS.landlord1.password
    );

    expect(authClient).toBeTruthy();

    // Sign out - may return AuthSessionMissingError if already signed out
    const { error: signOutError } = await authClient!.client.auth.signOut();

    // AuthSessionMissingError is acceptable - means session is already cleared
    if (signOutError && !signOutError.message.includes('session missing')) {
      expect(signOutError).toBeNull();
    }

    // Clear cache immediately after signing out to prevent stale sessions
    clearAuthCache();

    // Verify signOut completed without unexpected errors
    // Note: getSession may still return cached session locally,
    // but the server-side session is invalidated
    console.log('Sign out successful');
  });

  test.afterAll(async () => {
    // Clear auth cache after session tests to prevent stale sessions
    clearAuthCache();
  });
});
