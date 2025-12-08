/**
 * Property Setup E2E Tests - Supabase API
 *
 * Tests property management functionality including:
 * - Creating new properties
 * - Property code generation
 * - Property areas and assets management
 * - Property updates and deletion
 * - RLS verification
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
  tenant1: {
    email: 'test-tenant@myailandlord.com',
    password: 'MyAI2025!Tenant#Test',
  },
};

// Helper to authenticate and get client with retry for rate limits
async function authenticateUser(
  email: string,
  password: string
): Promise<AuthenticatedClient | null> {
  return authenticateWithRetry(email, password);
}

// Run tests in serial mode
test.describe.configure({ mode: 'serial' });

test.describe('Property Setup - Creation and Management', () => {
  let landlord1: AuthenticatedClient | null = null;
  let testPropertyId: string | null = null;
  let testPropertyCode: string | null = null;

  test.beforeAll(async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.log('Skipping property setup tests - Supabase not configured');
      return;
    }
  });

  test('should authenticate landlord for property tests', async () => {
    landlord1 = await authenticateUser(TEST_USERS.landlord1.email, TEST_USERS.landlord1.password);
    expect(landlord1).toBeTruthy();
    console.log('Landlord authenticated for property tests');
  });

  test('should create new property with basic info', async () => {
    test.skip(!landlord1, 'landlord1 not authenticated');

    const { data, error } = await landlord1!.client
      .from('properties')
      .insert({
        landlord_id: landlord1!.profileId,
        name: 'Sunset Apartments Unit 4B',
        address: '123 Sunset Boulevard, Los Angeles, CA 90210',
        property_type: 'apartment',
        bedrooms: 2,
        bathrooms: 1,
        description: 'Modern 2-bedroom apartment with city views',
        allow_tenant_signup: true,
      })
      .select('id, property_code, name, address')
      .single();

    expect(error).toBeNull();
    expect(data?.id).toBeTruthy();
    expect(data?.property_code).toBeTruthy();
    expect(data?.property_code).toMatch(/^[A-Z]{3}[0-9]{3}$/); // 3 letters + 3 numbers

    testPropertyId = data!.id;
    testPropertyCode = data!.property_code;
    console.log(`Created property: ${data?.name} (code: ${data?.property_code})`);
  });

  test('should auto-generate unique property codes', async () => {
    test.skip(!landlord1, 'landlord1 not authenticated');

    // Create another property to test unique code generation
    const { data, error } = await landlord1!.client
      .from('properties')
      .insert({
        landlord_id: landlord1!.profileId,
        name: 'Beach House Property',
        address: '456 Ocean Drive, Malibu, CA 90265',
        property_type: 'house',
        allow_tenant_signup: true,
      })
      .select('id, property_code')
      .single();

    expect(error).toBeNull();
    expect(data?.property_code).toBeTruthy();
    expect(data?.property_code).not.toBe(testPropertyCode); // Should be different
    console.log(`Second property code: ${data?.property_code}`);

    // Cleanup second property
    await landlord1!.client.from('properties').delete().eq('id', data!.id);
  });

  test('should update property details', async () => {
    test.skip(!landlord1 || !testPropertyId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('properties')
      .update({
        name: 'Sunset Apartments Unit 4B - Updated',
        description: 'Fully renovated 2-bedroom apartment with stunning city views',
        bedrooms: 2,
        bathrooms: 2, // Updated
      })
      .eq('id', testPropertyId)
      .select('name, description, bathrooms')
      .single();

    expect(error).toBeNull();
    expect(data?.name).toBe('Sunset Apartments Unit 4B - Updated');
    expect(data?.bathrooms).toBe(2);
    console.log('Property details updated');
  });

  test('should set emergency contact information', async () => {
    test.skip(!landlord1 || !testPropertyId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('properties')
      .update({
        emergency_contact: 'John Smith',
        emergency_phone: '555-123-4567',
      })
      .eq('id', testPropertyId)
      .select('emergency_contact, emergency_phone')
      .single();

    expect(error).toBeNull();
    expect(data?.emergency_contact).toBe('John Smith');
    expect(data?.emergency_phone).toBe('555-123-4567');
    console.log('Emergency contact set');
  });

  test('should set WiFi information', async () => {
    test.skip(!landlord1 || !testPropertyId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('properties')
      .update({
        wifi_network: 'SunsetApts_Guest',
        wifi_password: 'Welcome2024!',
      })
      .eq('id', testPropertyId)
      .select('wifi_network, wifi_password')
      .single();

    expect(error).toBeNull();
    expect(data?.wifi_network).toBe('SunsetApts_Guest');
    expect(data?.wifi_password).toBe('Welcome2024!');
    console.log('WiFi information set');
  });

  test('should set onboarding message', async () => {
    test.skip(!landlord1 || !testPropertyId, 'Prerequisites not met');

    const onboardingMessage = 'Welcome to Sunset Apartments! Please review the house rules attached.';
    const { data, error } = await landlord1!.client
      .from('properties')
      .update({ onboarding_message: onboardingMessage })
      .eq('id', testPropertyId)
      .select('onboarding_message')
      .single();

    expect(error).toBeNull();
    expect(data?.onboarding_message).toBe(onboardingMessage);
    console.log('Onboarding message set');
  });

  test('should disable tenant signup when needed', async () => {
    test.skip(!landlord1 || !testPropertyId, 'Prerequisites not met');

    // Disable tenant signup
    const { data: disabled, error: err1 } = await landlord1!.client
      .from('properties')
      .update({ allow_tenant_signup: false })
      .eq('id', testPropertyId)
      .select('allow_tenant_signup')
      .single();

    expect(err1).toBeNull();
    expect(disabled?.allow_tenant_signup).toBe(false);

    // Re-enable tenant signup
    const { data: enabled, error: err2 } = await landlord1!.client
      .from('properties')
      .update({ allow_tenant_signup: true })
      .eq('id', testPropertyId)
      .select('allow_tenant_signup')
      .single();

    expect(err2).toBeNull();
    expect(enabled?.allow_tenant_signup).toBe(true);
    console.log('Tenant signup toggle working');
  });

  test('should fetch all landlord properties', async () => {
    test.skip(!landlord1, 'landlord1 not authenticated');

    const { data, error } = await landlord1!.client
      .from('properties')
      .select('id, name, address, property_code, allow_tenant_signup')
      .order('created_at', { ascending: false });

    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data?.length).toBeGreaterThanOrEqual(1);
    console.log(`Found ${data?.length} properties for landlord`);
  });

  test('should fetch property with full details', async () => {
    test.skip(!landlord1 || !testPropertyId, 'Prerequisites not met');

    const { data, error } = await landlord1!.client
      .from('properties')
      .select('*')
      .eq('id', testPropertyId)
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data?.name).toContain('Sunset Apartments');
    expect(data?.property_code).toBe(testPropertyCode);
    expect(data?.landlord_id).toBe(landlord1!.profileId);
    console.log('Full property details retrieved');
  });

  test('should cleanup test property', async () => {
    test.skip(!landlord1 || !testPropertyId, 'Prerequisites not met');

    const { error } = await landlord1!.client.from('properties').delete().eq('id', testPropertyId);

    expect(error).toBeNull();
    console.log('Test property cleaned up');
  });
});

test.describe('Property Setup - RLS Access Control', () => {
  let landlord1: AuthenticatedClient | null = null;
  let tenant1: AuthenticatedClient | null = null;

  test.beforeAll(async () => {
    landlord1 = await authenticateUser(TEST_USERS.landlord1.email, TEST_USERS.landlord1.password);
    tenant1 = await authenticateUser(TEST_USERS.tenant1.email, TEST_USERS.tenant1.password);
  });

  test('user cannot create property with different landlord_id', async () => {
    test.skip(!tenant1 || !landlord1, 'Users not authenticated');

    // Try to create property with landlord1's ID while authenticated as tenant
    const { data, error } = await tenant1!.client
      .from('properties')
      .insert({
        landlord_id: landlord1!.profileId, // Different user's ID - should fail
        name: 'Unauthorized Property',
        address: '999 Fake St',
        property_type: 'house',
      })
      .select('id')
      .single();

    // Should fail due to RLS - can only set landlord_id to own user ID
    expect(error).toBeTruthy();
    expect(data).toBeNull();
    console.log('RLS: Correctly blocked creating property with different landlord_id');
  });

  test('tenant cannot see properties they are not linked to', async () => {
    test.skip(!landlord1 || !tenant1, 'Prerequisites not met');

    // Create a property without linking tenant
    const { data: prop } = await landlord1!.client
      .from('properties')
      .insert({
        landlord_id: landlord1!.profileId,
        name: 'Unlinked Property',
        address: '123 Private St',
        property_type: 'house',
        allow_tenant_signup: false,
      })
      .select('id')
      .single();

    // Tenant tries to access this property
    const { data: tenantView } = await tenant1!.client
      .from('properties')
      .select('id, name')
      .eq('id', prop!.id);

    expect(tenantView).toEqual([]); // Empty - tenant can't see unlinked property
    console.log('RLS: Tenant cannot see unlinked properties');

    // Cleanup
    await landlord1!.client.from('properties').delete().eq('id', prop!.id);
  });

  test('tenant can see linked property', async () => {
    test.skip(!landlord1 || !tenant1, 'Prerequisites not met');

    // Create property
    const { data: prop } = await landlord1!.client
      .from('properties')
      .insert({
        landlord_id: landlord1!.profileId,
        name: 'Linked Property',
        address: '456 Shared Ave',
        property_type: 'apartment',
        allow_tenant_signup: true,
      })
      .select('id')
      .single();

    // Link tenant
    await landlord1!.client.from('tenant_property_links').insert({
      tenant_id: tenant1!.profileId,
      property_id: prop!.id,
      is_active: true,
      invitation_status: 'active',
    });

    // Tenant should now see this property
    const { data: tenantView, error } = await tenant1!.client
      .from('properties')
      .select('id, name')
      .eq('id', prop!.id)
      .single();

    expect(error).toBeNull();
    expect(tenantView?.name).toBe('Linked Property');
    console.log('RLS: Tenant can see linked property');

    // Cleanup
    await landlord1!.client.from('tenant_property_links').delete().eq('property_id', prop!.id);
    await landlord1!.client.from('properties').delete().eq('id', prop!.id);
  });

  test('unauthenticated user cannot see any properties', async () => {
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data, error } = await anonClient.from('properties').select('id').limit(1);

    expect(error).toBeNull();
    expect(data).toEqual([]);
    console.log('RLS: Unauthenticated user cannot see properties');
  });
});

test.describe('Property Setup - Property Code Validation', () => {
  let landlord1: AuthenticatedClient | null = null;
  let tenant1: AuthenticatedClient | null = null;
  let testPropertyId: string | null = null;
  let testPropertyCode: string | null = null;

  test.beforeAll(async () => {
    landlord1 = await authenticateUser(TEST_USERS.landlord1.email, TEST_USERS.landlord1.password);
    tenant1 = await authenticateUser(TEST_USERS.tenant1.email, TEST_USERS.tenant1.password);

    if (landlord1) {
      const { data } = await landlord1.client
        .from('properties')
        .insert({
          landlord_id: landlord1.profileId,
          name: 'Code Validation Property',
          address: '100 Test Lane',
          property_type: 'house',
          allow_tenant_signup: true,
        })
        .select('id, property_code')
        .single();

      if (data) {
        testPropertyId = data.id;
        testPropertyCode = data.property_code;
      }
    }
  });

  test.afterAll(async () => {
    if (landlord1 && testPropertyId) {
      await landlord1.client.from('tenant_property_links').delete().eq('property_id', testPropertyId);
      await landlord1.client.from('properties').delete().eq('id', testPropertyId);
    }
  });

  test('should validate correct property code', async () => {
    test.skip(!tenant1 || !testPropertyCode, 'Prerequisites not met');

    const { data, error } = await tenant1!.client.rpc('validate_property_code', {
      input_code: testPropertyCode,
      tenant_id: tenant1!.profileId,
    });

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data[0]?.success).toBe(true);
    expect(data[0]?.property_name).toBe('Code Validation Property');
    console.log('Property code validated successfully');
  });

  test('should reject invalid property code', async () => {
    test.skip(!tenant1, 'tenant1 not authenticated');

    const { data, error } = await tenant1!.client.rpc('validate_property_code', {
      input_code: 'XXX999',
      tenant_id: tenant1!.profileId,
    });

    expect(error).toBeNull();
    expect(data[0]?.success).toBe(false);
    expect(data[0]?.error_message).toContain('Invalid');
    console.log('Invalid code correctly rejected');
  });

  test('should link tenant via property code', async () => {
    test.skip(!tenant1 || !testPropertyCode, 'Prerequisites not met');

    const { data, error } = await tenant1!.client.rpc('link_tenant_to_property', {
      input_code: testPropertyCode,
      tenant_id: tenant1!.profileId,
    });

    expect(error).toBeNull();
    expect(data[0]?.success).toBe(true);
    expect(data[0]?.link_id).toBeTruthy();
    console.log('Tenant linked via property code');
  });
});
