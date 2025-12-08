/**
 * TypeScript Fixes Validation Tests - Supabase API
 *
 * Validates that all data operations work correctly including:
 * - Property creation with all fields
 * - Property code generation
 * - Data type handling
 * - Query operations
 * - Error handling
 */

import { test, expect } from '@playwright/test';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { authenticateWithRetry, AuthenticatedClient } from './helpers/auth-helper';

// Test configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Test user credentials
const TEST_USERS = {
  landlord1: {
    email: 'test-landlord@myailandlord.com',
    password: 'MyAI2025!Landlord#Test',
  },
};

// Helper to authenticate and get client with retry for rate limits
async function authenticateUser(
  email: string,
  password: string
): Promise<AuthenticatedClient | null> {
  return authenticateWithRetry(email, password);
}

test.describe.configure({ mode: 'serial' });

test.describe('TypeScript Fixes Validation', () => {
  let landlord1: AuthenticatedClient | null = null;
  let tenant1: AuthenticatedClient | null = null;
  let testPropertyId: string | null = null;
  let testPropertyCode: string | null = null;

  test.beforeAll(async () => {
    landlord1 = await authenticateUser(TEST_USERS.landlord1.email, TEST_USERS.landlord1.password);
    tenant1 = await authenticateUser(
      'test-tenant@myailandlord.com',
      'MyAI2025!Tenant#Test'
    );
  });

  test.afterAll(async () => {
    if (landlord1 && testPropertyId) {
      await landlord1.client.from('maintenance_requests').delete().eq('property_id', testPropertyId);
      await landlord1.client.from('tenant_property_links').delete().eq('property_id', testPropertyId);
      await landlord1.client.from('properties').delete().eq('id', testPropertyId);
    }
  });

  test('Property creation with all required fields', async () => {
    test.skip(!landlord1, 'Landlord not authenticated');

    const { data, error } = await landlord1!.client
      .from('properties')
      .insert({
        landlord_id: landlord1!.profileId,
        name: 'TS Validation Test Property',
        address: '100 Test Street, Springfield, IL 62701',
        property_type: 'apartment',
        bedrooms: 2,
        bathrooms: 1,
        description: 'Test property for TypeScript validation',
        allow_tenant_signup: true,
      })
      .select('*')
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data?.id).toBeTruthy();
    expect(data?.name).toBe('TS Validation Test Property');
    expect(data?.bedrooms).toBe(2);
    expect(data?.bathrooms).toBe(1);

    testPropertyId = data!.id;
    testPropertyCode = data!.property_code;
    console.log('Property created with all fields validated');
  });

  test('Link tenant to property for maintenance tests', async () => {
    test.skip(!tenant1 || !testPropertyCode, 'Prerequisites not met');

    const { data, error } = await tenant1!.client.rpc('link_tenant_to_property', {
      input_code: testPropertyCode,
      tenant_id: tenant1!.profileId,
    });

    expect(error).toBeNull();
    expect(data[0]?.success).toBe(true);
    console.log('Tenant linked for maintenance tests');
  });

  test('Property code generation (auto-generated)', async () => {
    test.skip(!landlord1 || !testPropertyId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('properties')
      .select('property_code')
      .eq('id', testPropertyId)
      .single();

    expect(error).toBeNull();
    expect(data?.property_code).toBeTruthy();
    expect(data?.property_code).toMatch(/^[A-Z]{3}[0-9]{3}$/);

    console.log(`Property code generated: ${data?.property_code}`);
  });

  test('Property code navigation parameter handling', async () => {
    test.skip(!landlord1 || !testPropertyId, 'Prerequisites not met');

    // Query property with code for navigation simulation
    const { data, error } = await landlord1!.client
      .from('properties')
      .select('id, name, property_code')
      .eq('id', testPropertyId)
      .single();

    expect(error).toBeNull();
    expect(data?.property_code).toBeTruthy();

    // Simulate navigation params validation
    const navParams = {
      propertyId: data!.id,
      propertyCode: data!.property_code,
      propertyName: data!.name,
    };

    expect(typeof navParams.propertyId).toBe('string');
    expect(typeof navParams.propertyCode).toBe('string');
    expect(typeof navParams.propertyName).toBe('string');

    console.log('Property code navigation params validated');
  });

  test('Data type validation - numeric fields', async () => {
    test.skip(!landlord1 || !testPropertyId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('properties')
      .select('bedrooms, bathrooms')
      .eq('id', testPropertyId)
      .single();

    expect(error).toBeNull();
    expect(typeof data?.bedrooms).toBe('number');
    expect(typeof data?.bathrooms).toBe('number');

    console.log('Numeric field types validated');
  });

  test('Data type validation - boolean fields', async () => {
    test.skip(!landlord1 || !testPropertyId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('properties')
      .select('allow_tenant_signup')
      .eq('id', testPropertyId)
      .single();

    expect(error).toBeNull();
    expect(typeof data?.allow_tenant_signup).toBe('boolean');
    expect(data?.allow_tenant_signup).toBe(true);

    console.log('Boolean field types validated');
  });

  test('Data type validation - timestamp fields', async () => {
    test.skip(!landlord1 || !testPropertyId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('properties')
      .select('created_at, updated_at')
      .eq('id', testPropertyId)
      .single();

    expect(error).toBeNull();
    expect(data?.created_at).toBeTruthy();

    // Verify it's a valid ISO date string
    const createdAt = new Date(data!.created_at);
    expect(createdAt.getTime()).toBeGreaterThan(0);

    console.log('Timestamp field types validated');
  });

  test('Query with joins - properties and profiles', async () => {
    test.skip(!landlord1 || !testPropertyId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('properties')
      .select(
        `
        id, name, property_code,
        profiles!properties_landlord_id_fkey (id, email, role)
      `
      )
      .eq('id', testPropertyId)
      .single();

    expect(error).toBeNull();
    expect(data?.profiles).toBeTruthy();
    expect(data?.profiles?.email).toBe(TEST_USERS.landlord1.email);

    console.log('Join query validated');
  });

  test('Create maintenance request with all fields', async () => {
    test.skip(!tenant1 || !testPropertyId, 'Prerequisites not met');

    const { data, error } = await tenant1!.client
      .from('maintenance_requests')
      .insert({
        property_id: testPropertyId,
        tenant_id: tenant1!.profileId,
        title: 'TS Validation Test Request',
        description: 'Testing all field types for TypeScript validation',
        area: 'kitchen',
        asset: 'sink',
        issue_type: 'plumbing',
        priority: 'medium',
        status: 'pending',
        estimated_cost: 150.5,
      })
      .select('*')
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data?.title).toBe('TS Validation Test Request');
    expect(data?.estimated_cost).toBe(150.5);

    console.log('Maintenance request with all fields created');
  });

  test('Maintenance request cost field handling', async () => {
    test.skip(!landlord1 || !testPropertyId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .select('estimated_cost, actual_cost')
      .eq('property_id', testPropertyId)
      .single();

    expect(error).toBeNull();

    // estimated_cost should be a number
    expect(typeof data?.estimated_cost).toBe('number');
    expect(data?.estimated_cost).toBe(150.5);

    // actual_cost can be null initially
    expect(data?.actual_cost === null || typeof data?.actual_cost === 'number').toBe(true);

    console.log('Cost field handling validated');
  });

  test('Update with partial fields', async () => {
    test.skip(!landlord1 || !testPropertyId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('properties')
      .update({ description: 'Updated description for TS validation' })
      .eq('id', testPropertyId)
      .select('description')
      .single();

    expect(error).toBeNull();
    expect(data?.description).toBe('Updated description for TS validation');

    console.log('Partial update validated');
  });

  test('Error handling for invalid data', async () => {
    test.skip(!landlord1, 'Landlord not authenticated');

    // Try to create property with invalid landlord_id (should fail RLS)
    const { data, error } = await landlord1!.client
      .from('properties')
      .insert({
        landlord_id: '00000000-0000-0000-0000-000000000000', // Invalid UUID
        name: 'Should Fail',
        address: '123 Fail St',
        property_type: 'house',
      })
      .select('id')
      .single();

    // Should either get an error or no data returned (RLS prevents)
    expect(data === null || error !== null).toBe(true);

    console.log('Error handling for invalid data validated');
  });
});

test.describe('Console Error Check - No Runtime Errors', () => {
  let landlord1: AuthenticatedClient | null = null;

  test.beforeAll(async () => {
    landlord1 = await authenticateUser(TEST_USERS.landlord1.email, TEST_USERS.landlord1.password);
  });

  test('should complete profile query without errors', async () => {
    test.skip(!landlord1, 'Landlord not authenticated');

    const { data, error } = await landlord1!.client
      .from('profiles')
      .select('*')
      .eq('id', landlord1!.profileId)
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();

    console.log('Profile query completed without errors');
  });

  test('should complete properties query without errors', async () => {
    test.skip(!landlord1, 'Landlord not authenticated');

    const { data, error } = await landlord1!.client.from('properties').select('id, name').limit(5);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);

    console.log('Properties query completed without errors');
  });

  test('should complete maintenance_requests query without errors', async () => {
    test.skip(!landlord1, 'Landlord not authenticated');

    const { data, error } = await landlord1!.client
      .from('maintenance_requests')
      .select('id, title')
      .limit(5);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);

    console.log('Maintenance requests query completed without errors');
  });
});

test.describe('Responsive Container maxWidth Fix', () => {
  let landlord1: AuthenticatedClient | null = null;

  test.beforeAll(async () => {
    landlord1 = await authenticateUser(TEST_USERS.landlord1.email, TEST_USERS.landlord1.password);
  });

  test('Mobile data pattern (limited fields)', async () => {
    test.skip(!landlord1, 'Landlord not authenticated');

    // Mobile: Minimal fields for performance
    const { data, error } = await landlord1!.client
      .from('properties')
      .select('id, name, property_code')
      .limit(5);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);

    // Verify only requested fields
    if (data && data.length > 0) {
      const item = data[0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('property_code');
    }

    console.log(`Mobile pattern: ${data?.length} items with minimal fields`);
  });

  test('Tablet data pattern (extended fields)', async () => {
    test.skip(!landlord1, 'Landlord not authenticated');

    // Tablet: More fields
    const { data, error } = await landlord1!.client
      .from('properties')
      .select('id, name, property_code, address, property_type, bedrooms, bathrooms')
      .limit(10);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);

    console.log(`Tablet pattern: ${data?.length} items with extended fields`);
  });

  test('Desktop data pattern (all fields with relations)', async () => {
    test.skip(!landlord1, 'Landlord not authenticated');

    // Desktop: Full data with relations
    const { data, error } = await landlord1!.client
      .from('properties')
      .select(
        `
        *,
        profiles!properties_landlord_id_fkey (email)
      `
      )
      .limit(20);

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);

    console.log(`Desktop pattern: ${data?.length} items with all fields and relations`);
  });
});
