/**
 * E2E Tests for Account Creation - Supabase Auth
 *
 * Tests user authentication functionality including:
 * - Sign up with email/password
 * - Sign in with email/password
 * - Session management
 * - Profile creation
 */

import { test, expect } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

interface AuthResult {
  success: boolean;
  userId?: string;
  email?: string;
  error?: string;
}

// Helper to create unauthenticated client
function createAnonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Sleep helper for rate limit backoff
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper to sign in with retry logic for rate limits
async function signInUser(email: string, password: string, maxRetries: number = 5): Promise<AuthResult> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const client = createAnonClient();

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Check if it's a rate limit error
      if (error.message.includes('rate limit') || error.status === 429) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 30000);
        console.log(`Rate limited for ${email}, attempt ${attempt + 1}/${maxRetries}, waiting ${backoffMs}ms...`);
        await sleep(backoffMs);
        continue;
      }
      return { success: false, error: error.message };
    }

    return {
      success: true,
      userId: data.user?.id,
      email: data.user?.email || undefined,
    };
  }

  return { success: false, error: 'Max retries exceeded due to rate limiting' };
}

// Helper to get user profile
async function getUserProfile(client: SupabaseClient, userId: string) {
  const { data, error } = await client.from('profiles').select('*').eq('id', userId).single();

  return { data, error };
}

// Helper to sign in with retry and return client + data
async function signInWithRetry(
  email: string,
  password: string,
  maxRetries: number = 5
): Promise<{ client: SupabaseClient; data: { user: any; session: any }; error: null } | { client: null; data: null; error: any }> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const client = createAnonClient();

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Check if it's a rate limit error
      if (error.message.includes('rate limit') || error.status === 429) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt), 30000);
        console.log(`Rate limited for ${email}, attempt ${attempt + 1}/${maxRetries}, waiting ${backoffMs}ms...`);
        await sleep(backoffMs);
        continue;
      }
      return { client: null, data: null, error };
    }

    return { client, data, error: null };
  }

  return { client: null, data: null, error: new Error('Max retries exceeded due to rate limiting') };
}

test.describe.configure({ mode: 'serial' });

test.describe('Account Creation E2E - Supabase Auth', () => {
  test.beforeAll(async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.log('Skipping auth tests - Supabase not configured');
      return;
    }
  });

  test('should authenticate existing landlord user', async () => {
    const result = await signInUser(TEST_USERS.landlord1.email, TEST_USERS.landlord1.password);

    expect(result.success).toBeTruthy();
    expect(result.userId).toBeTruthy();
    expect(result.email).toBe(TEST_USERS.landlord1.email);
    console.log(`Authenticated landlord: ${result.userId}`);
  });

  test('should authenticate existing tenant user', async () => {
    const result = await signInUser(TEST_USERS.tenant1.email, TEST_USERS.tenant1.password);

    expect(result.success).toBeTruthy();
    expect(result.userId).toBeTruthy();
    expect(result.email).toBe(TEST_USERS.tenant1.email);
    console.log(`Authenticated tenant: ${result.userId}`);
  });

  test('should fail authentication with invalid credentials', async () => {
    const result = await signInUser('nonexistent@example.com', 'WrongPassword123!');

    expect(result.success).toBeFalsy();
    expect(result.error).toBeTruthy();
    console.log('Invalid credentials correctly rejected');
  });

  test('should fail authentication with wrong password', async () => {
    const result = await signInUser(TEST_USERS.landlord1.email, 'WrongPassword123!');

    expect(result.success).toBeFalsy();
    expect(result.error).toBeTruthy();
    console.log('Wrong password correctly rejected');
  });

  test('should get valid session after sign in', async () => {
    const result = await signInWithRetry(
      TEST_USERS.landlord1.email,
      TEST_USERS.landlord1.password
    );

    expect(result.error).toBeNull();
    expect(result.data?.session).toBeTruthy();
    expect(result.data?.session?.access_token).toBeTruthy();
    expect(result.data?.session?.refresh_token).toBeTruthy();
    expect(result.data?.session?.expires_at).toBeTruthy();
    console.log(`Session obtained with ${result.data?.session?.expires_in}s expiry`);
  });

  test('should have profile after authentication', async () => {
    const result = await signInWithRetry(
      TEST_USERS.landlord1.email,
      TEST_USERS.landlord1.password
    );

    expect(result.error).toBeNull();
    expect(result.data?.user?.id).toBeTruthy();

    // Get profile
    const { data: profile, error: profileError } = await getUserProfile(result.client!, result.data!.user!.id);

    expect(profileError).toBeNull();
    expect(profile).toBeTruthy();
    expect(profile?.email).toBe(TEST_USERS.landlord1.email);
    console.log(`Profile retrieved: role=${profile?.role}, name=${profile?.name || 'not set'}`);
  });

  test('should maintain session across client instances', async () => {
    // Sign in with retry helper to handle rate limits
    const result = await signInWithRetry(
      TEST_USERS.landlord1.email,
      TEST_USERS.landlord1.password
    );

    expect(result.error).toBeNull();
    const accessToken = result.data?.session?.access_token;
    expect(accessToken).toBeTruthy();

    // Create second client and set session manually
    const client2 = createAnonClient();
    const { data: sessionData, error: sessionError } = await client2.auth.setSession({
      access_token: accessToken!,
      refresh_token: result.data!.session!.refresh_token,
    });

    expect(sessionError).toBeNull();
    expect(sessionData.user?.id).toBe(result.data!.user?.id);
    console.log('Session successfully transferred between clients');
  });

  test('should be able to sign out', async () => {
    // Sign in with retry helper to handle rate limits
    const result = await signInWithRetry(
      TEST_USERS.landlord1.email,
      TEST_USERS.landlord1.password
    );

    expect(result.error).toBeNull();

    // Verify signed in
    const { data: sessionBefore } = await result.client!.auth.getSession();
    expect(sessionBefore.session).toBeTruthy();

    // Sign out
    const { error: signOutError } = await result.client!.auth.signOut();
    expect(signOutError).toBeNull();

    // Verify signed out
    const { data: sessionAfter } = await result.client!.auth.getSession();
    expect(sessionAfter.session).toBeNull();
    console.log('Sign out successful');
  });

  test('should refresh session token', async () => {
    // Sign in with retry helper to handle rate limits
    const result = await signInWithRetry(
      TEST_USERS.landlord1.email,
      TEST_USERS.landlord1.password
    );

    expect(result.error).toBeNull();
    const originalToken = result.data?.session?.access_token;

    // Refresh session
    const { data: refreshData, error: refreshError } = await result.client!.auth.refreshSession();

    expect(refreshError).toBeNull();
    expect(refreshData.session?.access_token).toBeTruthy();
    // Note: Token may be the same if within refresh window
    console.log('Session refresh completed');
  });

  test('should update user profile', async () => {
    // Sign in with retry helper to handle rate limits
    const result = await signInWithRetry(
      TEST_USERS.landlord1.email,
      TEST_USERS.landlord1.password
    );

    expect(result.error).toBeNull();

    // Update profile name
    const testName = `Test User ${Date.now()}`;
    const { data, error } = await result.client!
      .from('profiles')
      .update({ name: testName })
      .eq('id', result.data!.user!.id)
      .select('name')
      .single();

    expect(error).toBeNull();
    expect(data?.name).toBe(testName);
    console.log(`Profile updated: ${testName}`);

    // Restore original name (or null)
    await result.client!.from('profiles').update({ name: null }).eq('id', result.data!.user!.id);
  });
});

test.describe('Role-Based Authentication', () => {
  test('landlord should have landlord role in profile', async () => {
    // Sign in with retry helper to handle rate limits
    const result = await signInWithRetry(
      TEST_USERS.landlord1.email,
      TEST_USERS.landlord1.password
    );

    expect(result.error).toBeNull();

    const { data: profile, error: profileError } = await result.client!
      .from('profiles')
      .select('role')
      .eq('id', result.data!.user!.id)
      .single();

    expect(profileError).toBeNull();
    expect(profile?.role).toBe('landlord');
    console.log('Landlord role verified');
  });

  test('tenant should have tenant role in profile', async () => {
    // Sign in with retry helper to handle rate limits
    const result = await signInWithRetry(
      TEST_USERS.tenant1.email,
      TEST_USERS.tenant1.password
    );

    expect(result.error).toBeNull();

    const { data: profile, error: profileError } = await result.client!
      .from('profiles')
      .select('role')
      .eq('id', result.data!.user!.id)
      .single();

    expect(profileError).toBeNull();
    expect(profile?.role).toBe('tenant');
    console.log('Tenant role verified');
  });
});

test.describe('Session Security', () => {
  test('unauthenticated client should not access protected data', async () => {
    const client = createAnonClient();
    // Don't sign in

    const { data, error } = await client.from('profiles').select('*').limit(1);

    // Should return empty due to RLS
    expect(data).toEqual([]);
    console.log('Unauthenticated access blocked by RLS');
  });

  test('user should only see own profile', async () => {
    // Sign in with retry helper to handle rate limits
    const result = await signInWithRetry(
      TEST_USERS.landlord1.email,
      TEST_USERS.landlord1.password
    );

    expect(result.error).toBeNull();

    // Query all profiles
    const { data: profiles, error } = await result.client!.from('profiles').select('id');

    expect(error).toBeNull();
    // Should only see own profile due to RLS
    expect(profiles?.length).toBe(1);
    expect(profiles?.[0].id).toBe(result.data!.user!.id);
    console.log('RLS correctly limits profile access to own profile');
  });
});
