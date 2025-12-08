/**
 * Tenant-Landlord Linking E2E Tests
 *
 * Tests the critical functionality of tenant-landlord property linking
 * and RLS-based data isolation.
 *
 * Test Scenarios:
 * 1. Property code validation flow
 * 2. Tenant can only see linked properties
 * 3. Cross-tenant isolation (Tenant A can't see Tenant B's data)
 * 4. Cross-landlord isolation (Landlord A can't see Landlord B's properties)
 * 5. Maintenance requests respect tenant-property links
 */

import { test, expect } from '@playwright/test';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

// Run tests in serial mode - these tests depend on data created by previous tests
test.describe.configure({ mode: 'serial' });

// Test configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Test user credentials
const TEST_USERS = {
  landlord1: {
    email: process.env.TEST_LANDLORD1_EMAIL || 'test-landlord@myailandlord.com',
    password: process.env.TEST_LANDLORD1_PASSWORD || 'MyAI2025!Landlord#Test',
  },
  landlord2: {
    email: process.env.TEST_LANDLORD2_EMAIL || 'test-landlord2@myailandlord.com',
    password: process.env.TEST_LANDLORD2_PASSWORD || 'MyAI2025!Landlord2#Test',
  },
  tenant1: {
    email: process.env.TEST_TENANT1_EMAIL || 'test-tenant@myailandlord.com',
    password: process.env.TEST_TENANT1_PASSWORD || 'MyAI2025!Tenant#Test',
  },
  tenant2: {
    email: process.env.TEST_TENANT2_EMAIL || 'test-tenant2@myailandlord.com',
    password: process.env.TEST_TENANT2_PASSWORD || 'MyAI2025!Tenant2#Test',
  },
};

interface AuthenticatedClient {
  client: SupabaseClient;
  user: User;
  profileId: string;
}

// Sleep helper for rate limit backoff
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Authenticate a user and return their Supabase client with retry for rate limits
 */
async function authenticateUser(email: string, password: string): Promise<AuthenticatedClient> {
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
        throw new Error(`Failed to authenticate ${email}: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error(`Failed to authenticate ${email}: No user returned`);
      }

      // Get profile ID (same as auth user ID in our schema)
      const profileId = authData.user.id;

      return {
        client,
        user: authData.user,
        profileId,
      };
    } catch (error) {
      if ((error as Error).message?.includes('Failed to authenticate')) {
        throw error; // Re-throw non-rate-limit errors
      }
      const backoffMs = Math.min(1000 * Math.pow(2, attempt), 30000);
      console.log(`Auth error for ${email}, attempt ${attempt + 1}/${maxRetries}, waiting ${backoffMs}ms...`);
      await sleep(backoffMs);
    }
  }

  throw new Error(`All ${maxRetries} auth attempts failed for ${email}`);
}

/**
 * Create a test property for a landlord
 */
async function createTestProperty(
  landlordClient: AuthenticatedClient,
  propertyName: string
): Promise<{ id: string; property_code: string }> {
  const { data, error } = await landlordClient.client
    .from('properties')
    .insert({
      landlord_id: landlordClient.profileId,
      name: propertyName,
      address: `${Math.floor(Math.random() * 9999)} Test St, Test City, TS 12345`,
      property_type: 'house',
      bedrooms: 2,
      bathrooms: 1,
    })
    .select('id, property_code')
    .single();

  if (error) {
    throw new Error(`Failed to create property: ${error.message}`);
  }

  return data;
}

/**
 * Link a tenant to a property using property code
 */
async function linkTenantToProperty(
  landlordClient: AuthenticatedClient,
  tenantProfileId: string,
  propertyId: string
): Promise<void> {
  const { error } = await landlordClient.client
    .from('tenant_property_links')
    .insert({
      tenant_id: tenantProfileId,
      property_id: propertyId,
      is_active: true,
      unit_number: 'Unit A',
    });

  if (error) {
    throw new Error(`Failed to link tenant: ${error.message}`);
  }
}

/**
 * Create a maintenance request
 */
async function createMaintenanceRequest(
  tenantClient: AuthenticatedClient,
  propertyId: string,
  title: string
): Promise<{ id: string }> {
  const { data, error } = await tenantClient.client
    .from('maintenance_requests')
    .insert({
      property_id: propertyId,
      tenant_id: tenantClient.profileId,
      title,
      description: 'Test maintenance request',
      area: 'kitchen',
      asset: 'sink',
      issue_type: 'repair',
      priority: 'medium',
      status: 'pending',
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create maintenance request: ${error.message}`);
  }

  return data;
}

/**
 * Cleanup test data
 */
async function cleanupTestData(client: SupabaseClient, propertyIds: string[]): Promise<void> {
  // Delete in order to respect foreign key constraints
  for (const propertyId of propertyIds) {
    await client.from('maintenance_requests').delete().eq('property_id', propertyId);
    await client.from('tenant_property_links').delete().eq('property_id', propertyId);
    await client.from('properties').delete().eq('id', propertyId);
  }
}

test.describe('Tenant-Landlord Linking & RLS Isolation', () => {
  let landlord1: AuthenticatedClient;
  let landlord2: AuthenticatedClient;
  let tenant1: AuthenticatedClient;
  let tenant2: AuthenticatedClient;
  let testPropertyIds: string[] = [];

  test.beforeAll(async () => {
    // Skip if test users don't exist
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      test.skip();
      return;
    }

    try {
      // Authenticate all test users
      landlord1 = await authenticateUser(TEST_USERS.landlord1.email, TEST_USERS.landlord1.password);
      console.log(`Authenticated landlord1: ${landlord1.profileId}`);
    } catch (e) {
      console.log('landlord1 authentication failed - may need to create user');
    }

    try {
      landlord2 = await authenticateUser(TEST_USERS.landlord2.email, TEST_USERS.landlord2.password);
      console.log(`Authenticated landlord2: ${landlord2.profileId}`);
    } catch (e) {
      console.log('landlord2 authentication failed - may need to create user');
    }

    try {
      tenant1 = await authenticateUser(TEST_USERS.tenant1.email, TEST_USERS.tenant1.password);
      console.log(`Authenticated tenant1: ${tenant1.profileId}`);
    } catch (e) {
      console.log('tenant1 authentication failed - may need to create user');
    }

    try {
      tenant2 = await authenticateUser(TEST_USERS.tenant2.email, TEST_USERS.tenant2.password);
      console.log(`Authenticated tenant2: ${tenant2.profileId}`);
    } catch (e) {
      console.log('tenant2 authentication failed - may need to create user');
    }
  });

  test.afterAll(async () => {
    // Cleanup test properties
    if (landlord1?.client && testPropertyIds.length > 0) {
      await cleanupTestData(landlord1.client, testPropertyIds);
    }
    if (landlord2?.client) {
      await cleanupTestData(landlord2.client, testPropertyIds);
    }
  });

  test('Landlord can create a property', async () => {
    test.skip(!landlord1, 'landlord1 not authenticated');

    const property = await createTestProperty(landlord1, `RLS Test Property ${Date.now()}`);
    testPropertyIds.push(property.id);

    expect(property.id).toBeTruthy();
    console.log(`Created property: ${property.id}`);
  });

  test('Landlord can link tenant to their property', async () => {
    test.skip(!landlord1 || !tenant1, 'Required users not authenticated');
    test.skip(testPropertyIds.length === 0, 'No test property created');

    await linkTenantToProperty(landlord1, tenant1.profileId, testPropertyIds[0]);

    // Verify link exists
    const { data } = await landlord1.client
      .from('tenant_property_links')
      .select('*')
      .eq('property_id', testPropertyIds[0])
      .eq('tenant_id', tenant1.profileId)
      .single();

    expect(data).toBeTruthy();
    expect(data?.is_active).toBe(true);
  });

  test('Linked tenant can see the property', async () => {
    test.skip(!tenant1, 'tenant1 not authenticated');
    test.skip(testPropertyIds.length === 0, 'No test property created');

    const { data, error } = await tenant1.client
      .from('properties')
      .select('*')
      .eq('id', testPropertyIds[0])
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data?.id).toBe(testPropertyIds[0]);
  });

  test('Unlinked tenant CANNOT see the property (cross-tenant isolation)', async () => {
    test.skip(!tenant2, 'tenant2 not authenticated');
    test.skip(testPropertyIds.length === 0, 'No test property created');

    const { data, error } = await tenant2.client
      .from('properties')
      .select('*')
      .eq('id', testPropertyIds[0])
      .maybeSingle();

    // RLS should filter this out - data should be null
    expect(data).toBeNull();
    console.log('Cross-tenant isolation verified: tenant2 cannot see tenant1\'s linked property');
  });

  test('Linked tenant can create maintenance request for linked property', async () => {
    test.skip(!tenant1, 'tenant1 not authenticated');
    test.skip(testPropertyIds.length === 0, 'No test property created');

    const request = await createMaintenanceRequest(
      tenant1,
      testPropertyIds[0],
      `Test Request ${Date.now()}`
    );

    expect(request.id).toBeTruthy();
    console.log(`Created maintenance request: ${request.id}`);
  });

  test('Unlinked tenant CANNOT create maintenance request for property (RLS insert check)', async () => {
    test.skip(!tenant2, 'tenant2 not authenticated');
    test.skip(testPropertyIds.length === 0, 'No test property created');

    const { error } = await tenant2.client
      .from('maintenance_requests')
      .insert({
        property_id: testPropertyIds[0],
        tenant_id: tenant2.profileId,
        title: 'Unauthorized Request',
        description: 'This should fail',
        priority: 'low',
        status: 'pending',
      });

    // RLS should block this insert
    expect(error).toBeTruthy();
    console.log('RLS insert check verified: tenant2 cannot create request for unlinked property');
  });

  test('Landlord2 CANNOT see Landlord1 properties (cross-landlord isolation)', async () => {
    test.skip(!landlord2, 'landlord2 not authenticated');
    test.skip(testPropertyIds.length === 0, 'No test property created');

    const { data, error } = await landlord2.client
      .from('properties')
      .select('*')
      .eq('id', testPropertyIds[0])
      .maybeSingle();

    // RLS should filter this out
    expect(data).toBeNull();
    console.log('Cross-landlord isolation verified: landlord2 cannot see landlord1\'s properties');
  });

  test('Landlord can see maintenance requests for their properties', async () => {
    test.skip(!landlord1, 'landlord1 not authenticated');
    test.skip(testPropertyIds.length === 0, 'No test property created');

    const { data, error } = await landlord1.client
      .from('maintenance_requests')
      .select('*')
      .eq('property_id', testPropertyIds[0]);

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.length).toBeGreaterThan(0);
  });

  test('Tenant can only see their own maintenance requests', async () => {
    test.skip(!tenant1, 'tenant1 not authenticated');

    const { data, error } = await tenant1.client
      .from('maintenance_requests')
      .select('*');

    expect(error).toBeNull();

    // All returned requests should belong to tenant1
    if (data && data.length > 0) {
      data.forEach((request) => {
        expect(request.tenant_id).toBe(tenant1.profileId);
      });
    }
  });

  test('Deactivating link revokes tenant access', async () => {
    test.skip(!landlord1 || !tenant1, 'Required users not authenticated');
    test.skip(testPropertyIds.length === 0, 'No test property created');

    // Deactivate the link
    const { error: updateError } = await landlord1.client
      .from('tenant_property_links')
      .update({ is_active: false })
      .eq('property_id', testPropertyIds[0])
      .eq('tenant_id', tenant1.profileId);

    expect(updateError).toBeNull();

    // Tenant should no longer see the property
    const { data } = await tenant1.client
      .from('properties')
      .select('*')
      .eq('id', testPropertyIds[0])
      .maybeSingle();

    expect(data).toBeNull();
    console.log('Link deactivation verified: tenant1 lost access after is_active=false');

    // Re-activate for cleanup
    await landlord1.client
      .from('tenant_property_links')
      .update({ is_active: true })
      .eq('property_id', testPropertyIds[0])
      .eq('tenant_id', tenant1.profileId);
  });
});

test.describe('Property Code Validation', () => {
  let landlord1: AuthenticatedClient;
  let tenant1: AuthenticatedClient;
  let testPropertyId: string;
  let testPropertyCode: string;

  test.beforeAll(async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return;
    }

    try {
      landlord1 = await authenticateUser(TEST_USERS.landlord1.email, TEST_USERS.landlord1.password);
      tenant1 = await authenticateUser(TEST_USERS.tenant1.email, TEST_USERS.tenant1.password);
    } catch (e) {
      console.log('User authentication failed for property code tests');
    }
  });

  test.afterAll(async () => {
    if (landlord1?.client && testPropertyId) {
      await cleanupTestData(landlord1.client, [testPropertyId]);
    }
  });

  test('Property code is generated on property creation', async () => {
    test.skip(!landlord1, 'landlord1 not authenticated');

    const property = await createTestProperty(landlord1, `Code Test Property ${Date.now()}`);
    testPropertyId = property.id;
    testPropertyCode = property.property_code;

    expect(testPropertyCode).toBeTruthy();
    // Property codes should be 6 chars: 3 letters + 3 numbers
    expect(testPropertyCode).toMatch(/^[A-Z]{3}[0-9]{3}$/);
    console.log(`Generated property code: ${testPropertyCode}`);
  });

  test('validate_property_code RPC returns property info for valid code', async () => {
    test.skip(!tenant1 || !testPropertyCode, 'Prerequisites not met');

    const { data, error } = await tenant1.client.rpc('validate_property_code', {
      input_code: testPropertyCode,
      tenant_id: tenant1.profileId,
    });

    expect(error).toBeNull();
    // RPC returns a rowset; pick the first row
    const result = Array.isArray(data) ? data[0] : (data as any);
    expect(result).toBeTruthy();
    expect(result.success).toBe(true);
    expect(result.property_id).toBe(testPropertyId);
  });

  test('validate_property_code RPC fails for invalid code', async () => {
    test.skip(!tenant1, 'tenant1 not authenticated');

    const { data, error } = await tenant1.client.rpc('validate_property_code', {
      input_code: 'INVALID123',
      tenant_id: tenant1.profileId,
    });

    // Should return error or success=false; handle rowset shape
    if (error) {
      expect(error).toBeTruthy();
    } else if (Array.isArray(data) && data.length > 0) {
      expect(data[0].success).toBe(false);
    } else {
      // If no row returned, treat as failure as well
      expect(Array.isArray(data) ? data.length : data).toBeFalsy();
    }
  });

  test('link_tenant_to_property RPC creates active link', async () => {
    test.skip(!tenant1 || !testPropertyCode, 'Prerequisites not met');

    const { data, error } = await tenant1.client.rpc('link_tenant_to_property', {
      input_code: testPropertyCode,
      tenant_id: tenant1.profileId,
      unit_number: 'Test Unit',
    });

    expect(error).toBeNull();
    const linkResult = Array.isArray(data) ? data[0] : (data as any);
    if (linkResult) {
      expect(linkResult.success).toBe(true);
    }

    // Verify link was created
    const { data: linkData } = await tenant1.client
      .from('tenant_property_links')
      .select('*')
      .eq('property_id', testPropertyId)
      .eq('tenant_id', tenant1.profileId)
      .single();

    expect(linkData).toBeTruthy();
    expect(linkData?.is_active).toBe(true);
  });

  test('Duplicate link attempt is handled gracefully', async () => {
    test.skip(!tenant1 || !testPropertyCode, 'Prerequisites not met');

    // Try to link again - should fail due to unique constraint
    const { error } = await tenant1.client.rpc('link_tenant_to_property', {
      input_code: testPropertyCode,
      tenant_id: tenant1.profileId,
      unit_number: 'Test Unit',
    });

    // Either error or data.success=false is acceptable
    // The key is it shouldn't create a duplicate
    const { data: links } = await tenant1.client
      .from('tenant_property_links')
      .select('*')
      .eq('property_id', testPropertyId)
      .eq('tenant_id', tenant1.profileId);

    expect(links?.length).toBe(1); // Only one link should exist
  });
});
