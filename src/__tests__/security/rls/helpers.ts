/**
 * RLS Test Helpers
 *
 * Utilities for testing Row Level Security policies
 * Ensures multi-tenant data isolation
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface TestUser {
  id: string;
  email: string;
  role: 'landlord' | 'tenant';
  token: string;
  supabaseClient: SupabaseClient;
}

export interface TestProperty {
  id: string;
  landlord_id: string;
  name: string;
  address: string;
  property_code?: string;
}

export interface TestMaintenanceRequest {
  id: string;
  property_id: string;
  tenant_id: string;
  title: string;
  status: string;
}

/**
 * Create a test landlord user with mocked authentication
 */
export async function createTestLandlord(email?: string): Promise<TestUser> {
  const testEmail = email || `landlord_${Date.now()}@test.com`;
  const mockUserId = `user_landlord_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  // Create mock JWT token
  const mockToken = createMockJWT(mockUserId, 'landlord');

  // Create Supabase client with mocked auth
  const supabaseClient = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key',
    {
      global: {
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
      },
    }
  );

  // Create profile in database
  const { data: profile, error } = await supabaseClient
    .from('profiles')
    .insert({
      id: mockUserId,
      email: testEmail,
      role: 'landlord',
      name: `Test Landlord ${mockUserId.slice(-6)}`,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test landlord: ${error.message}`);
  }

  return {
    id: profile.id,
    email: testEmail,
    role: 'landlord',
    token: mockToken,
    supabaseClient,
  };
}

/**
 * Create a test tenant user with mocked authentication
 */
export async function createTestTenant(email?: string): Promise<TestUser> {
  const testEmail = email || `tenant_${Date.now()}@test.com`;
  const mockUserId = `user_tenant_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const mockToken = createMockJWT(mockUserId, 'tenant');

  const supabaseClient = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key',
    {
      global: {
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
      },
    }
  );

  const { data: profile, error } = await supabaseClient
    .from('profiles')
    .insert({
      id: mockUserId,
      email: testEmail,
      role: 'tenant',
      name: `Test Tenant ${mockUserId.slice(-6)}`,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test tenant: ${error.message}`);
  }

  return {
    id: profile.id,
    email: testEmail,
    role: 'tenant',
    token: mockToken,
    supabaseClient,
  };
}

/**
 * Create a test property owned by specified landlord
 */
export async function createTestProperty(
  landlord: TestUser,
  overrides?: Partial<TestProperty>
): Promise<TestProperty> {
  if (landlord.role !== 'landlord') {
    throw new Error('Only landlords can create properties');
  }

  const propertyData = {
    landlord_id: landlord.id,
    name: `Test Property ${Date.now()}`,
    address: `${Math.floor(Math.random() * 9999)} Test St, Test City, TS 12345`,
    property_type: 'single_family',
    bedrooms: 3,
    bathrooms: 2,
    ...overrides,
  };

  const { data: property, error } = await landlord.supabaseClient
    .from('properties')
    .insert(propertyData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test property: ${error.message}`);
  }

  return property;
}

/**
 * Link a tenant to a property
 */
export async function linkTenantToProperty(
  landlord: TestUser,
  tenant: TestUser,
  property: TestProperty
): Promise<void> {
  const { error } = await landlord.supabaseClient
    .from('tenant_property_links')
    .insert({
      tenant_id: tenant.id,
      property_id: property.id,
      is_active: true,
      unit: 'Unit A',
    });

  if (error) {
    throw new Error(`Failed to link tenant to property: ${error.message}`);
  }
}

/**
 * Create a test maintenance request
 */
export async function createTestMaintenanceRequest(
  tenant: TestUser,
  property: TestProperty,
  overrides?: Partial<TestMaintenanceRequest>
): Promise<TestMaintenanceRequest> {
  if (tenant.role !== 'tenant') {
    throw new Error('Only tenants can create maintenance requests');
  }

  const requestData = {
    property_id: property.id,
    tenant_id: tenant.id,
    title: `Test Request ${Date.now()}`,
    description: 'Test maintenance issue',
    priority: 'medium',
    status: 'open',
    ...overrides,
  };

  const { data: request, error } = await tenant.supabaseClient
    .from('maintenance_requests')
    .insert(requestData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test maintenance request: ${error.message}`);
  }

  return request;
}

/**
 * Assert that a user CANNOT access a specific record
 */
export async function assertCannotAccess(
  user: TestUser,
  table: string,
  recordId: string,
  message?: string
): Promise<void> {
  const { data, error } = await user.supabaseClient
    .from(table)
    .select('*')
    .eq('id', recordId)
    .maybeSingle();

  if (data !== null) {
    throw new Error(
      message ||
        `RLS VIOLATION: ${user.role} ${user.id} was able to access ${table} record ${recordId}`
    );
  }

  // RLS should block access, so we expect either:
  // 1. data === null (policy filtered it out)
  // 2. error (policy rejected query)
  // Both are acceptable - the key is data should NOT be returned
}

/**
 * Assert that a user CAN access a specific record
 */
export async function assertCanAccess(
  user: TestUser,
  table: string,
  recordId: string,
  message?: string
): Promise<void> {
  const { data, error } = await user.supabaseClient
    .from(table)
    .select('*')
    .eq('id', recordId)
    .single();

  if (error || !data) {
    throw new Error(
      message ||
        `RLS ERROR: ${user.role} ${user.id} could not access ${table} record ${recordId} (expected access)`
    );
  }
}

/**
 * Assert that a user CANNOT insert into a table
 */
export async function assertCannotInsert(
  user: TestUser,
  table: string,
  data: Record<string, any>,
  message?: string
): Promise<void> {
  const { error } = await user.supabaseClient.from(table).insert(data);

  if (!error) {
    throw new Error(
      message ||
        `RLS VIOLATION: ${user.role} ${user.id} was able to INSERT into ${table} (should be blocked)`
    );
  }

  // Error expected - RLS should block the insert
}

/**
 * Assert that a user CANNOT update a specific record
 */
export async function assertCannotUpdate(
  user: TestUser,
  table: string,
  recordId: string,
  updates: Record<string, any>,
  message?: string
): Promise<void> {
  const { error } = await user.supabaseClient
    .from(table)
    .update(updates)
    .eq('id', recordId);

  if (!error) {
    throw new Error(
      message ||
        `RLS VIOLATION: ${user.role} ${user.id} was able to UPDATE ${table} record ${recordId} (should be blocked)`
    );
  }
}

/**
 * Assert that a user CANNOT delete a specific record
 */
export async function assertCannotDelete(
  user: TestUser,
  table: string,
  recordId: string,
  message?: string
): Promise<void> {
  const { error } = await user.supabaseClient
    .from(table)
    .delete()
    .eq('id', recordId);

  if (!error) {
    throw new Error(
      message ||
        `RLS VIOLATION: ${user.role} ${user.id} was able to DELETE ${table} record ${recordId} (should be blocked)`
    );
  }
}

/**
 * Clean up test user and all related data
 */
export async function cleanupTestUser(user: TestUser): Promise<void> {
  // In a real implementation, would delete all related records
  // For now, just log cleanup
  console.log(`Cleanup: ${user.role} ${user.id}`);

  // Note: Supabase CASCADE deletes should handle most cleanup
  // But we may need to manually clean up some records
  await user.supabaseClient.from('profiles').delete().eq('id', user.id);
}

/**
 * Create a mock JWT token for testing
 * In production, this would come from Supabase Auth
 */
function createMockJWT(userId: string, role: string): string {
  // This is a simplified mock - real implementation would use proper JWT library
  // For testing purposes, we just need the claims structure
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
  const payload = Buffer.from(
    JSON.stringify({
      sub: userId,
      role: role,
      aud: 'supabase',
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      iat: Math.floor(Date.now() / 1000),
    })
  ).toString('base64');
  const signature = 'mock-signature';

  return `${header}.${payload}.${signature}`;
}

/**
 * Wait for async operations to complete
 */
export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Get count of records user can see
 */
export async function getVisibleRecordCount(
  user: TestUser,
  table: string
): Promise<number> {
  const { data, error } = await user.supabaseClient.from(table).select('id');

  if (error) {
    return 0;
  }

  return data?.length || 0;
}
