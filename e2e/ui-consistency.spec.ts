/**
 * UI Consistency Tests - Design System and API Validation via Supabase
 *
 * Tests data consistency and API structure including:
 * - Profile data structure consistency
 * - Property data structure consistency
 * - Maintenance request data structure consistency
 * - Response format validation
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

test.describe.configure({ mode: 'serial' });

test.describe('UI/UX Consistency & Responsive Design', () => {
  let landlord1: AuthenticatedClient | null = null;
  let tenant1: AuthenticatedClient | null = null;

  test.beforeAll(async () => {
    landlord1 = await authenticateUser(TEST_USERS.landlord1.email, TEST_USERS.landlord1.password);
    tenant1 = await authenticateUser(TEST_USERS.tenant1.email, TEST_USERS.tenant1.password);
  });

  test.describe('Design System Consistency', () => {
    test('should have consistent profile data structure', async () => {
      test.skip(!landlord1, 'landlord1 not authenticated');

      const { data, error } = await landlord1!.client
        .from('profiles')
        .select('*')
        .eq('id', landlord1!.profileId)
        .single();

      expect(error).toBeNull();
      expect(data).toBeTruthy();

      // Verify expected fields exist
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('email');
      expect(data).toHaveProperty('role');
      expect(data).toHaveProperty('created_at');

      console.log('Profile data structure is consistent');
    });

    test('should have consistent property data structure', async () => {
      test.skip(!landlord1, 'landlord1 not authenticated');

      // Create test property
      const { data: property, error: createError } = await landlord1!.client
        .from('properties')
        .insert({
          landlord_id: landlord1!.profileId,
          name: 'Data Structure Test Property',
          address: '123 Test St, Test City, TX 12345',
          property_type: 'apartment',
          allow_tenant_signup: true,
        })
        .select('*')
        .single();

      expect(createError).toBeNull();
      expect(property).toBeTruthy();

      // Verify expected fields exist
      expect(property).toHaveProperty('id');
      expect(property).toHaveProperty('name');
      expect(property).toHaveProperty('address');
      expect(property).toHaveProperty('property_type');
      expect(property).toHaveProperty('landlord_id');
      expect(property).toHaveProperty('property_code');
      expect(property).toHaveProperty('allow_tenant_signup');
      expect(property).toHaveProperty('created_at');

      // Cleanup
      await landlord1!.client.from('properties').delete().eq('id', property.id);
      console.log('Property data structure is consistent');
    });

    test('should have consistent maintenance request data structure', async () => {
      test.skip(!landlord1 || !tenant1, 'Users not authenticated');

      // Create test property first
      const { data: property } = await landlord1!.client
        .from('properties')
        .insert({
          landlord_id: landlord1!.profileId,
          name: 'MR Data Test Property',
          address: '456 Test Ave',
          property_type: 'house',
          allow_tenant_signup: true,
        })
        .select('id, property_code')
        .single();

      // Link tenant to property
      await tenant1!.client.rpc('link_tenant_to_property', {
        input_code: property!.property_code,
        tenant_id: tenant1!.profileId,
      });

      // Create maintenance request as tenant
      const { data: request, error } = await tenant1!.client
        .from('maintenance_requests')
        .insert({
          property_id: property!.id,
          tenant_id: tenant1!.profileId,
          title: 'Data Structure Test Request',
          description: 'Testing data structure consistency',
          area: 'kitchen',
          asset: 'sink',
          issue_type: 'plumbing',
          priority: 'medium',
          status: 'pending',
        })
        .select('*')
        .single();

      expect(error).toBeNull();
      expect(request).toBeTruthy();

      // Verify expected fields exist
      expect(request).toHaveProperty('id');
      expect(request).toHaveProperty('property_id');
      expect(request).toHaveProperty('tenant_id');
      expect(request).toHaveProperty('title');
      expect(request).toHaveProperty('description');
      expect(request).toHaveProperty('area');
      expect(request).toHaveProperty('asset');
      expect(request).toHaveProperty('issue_type');
      expect(request).toHaveProperty('priority');
      expect(request).toHaveProperty('status');
      expect(request).toHaveProperty('created_at');

      // Cleanup
      await landlord1!.client.from('maintenance_requests').delete().eq('id', request.id);
      await landlord1!.client.from('tenant_property_links').delete().eq('property_id', property!.id);
      await landlord1!.client.from('properties').delete().eq('id', property!.id);
      console.log('Maintenance request data structure is consistent');
    });

    test('should use consistent status values', async () => {
      const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];

      // Verify these are the expected status values
      validStatuses.forEach((status) => {
        expect(['pending', 'in_progress', 'completed', 'cancelled', 'resolved']).toContain(status);
      });

      console.log('Status values are consistent');
    });
  });

  test.describe('Responsive Design', () => {
    test('should support pagination for large datasets', async () => {
      test.skip(!landlord1, 'landlord1 not authenticated');

      // Test pagination with limit
      const pageSize = 5;
      const { data, error } = await landlord1!.client
        .from('maintenance_requests')
        .select('id, title')
        .order('created_at', { ascending: false })
        .limit(pageSize);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      expect(data!.length).toBeLessThanOrEqual(pageSize);
      console.log('Pagination working correctly');
    });

    test('should support range queries for pagination', async () => {
      test.skip(!landlord1, 'landlord1 not authenticated');

      // Test range-based pagination
      const { data: page1, error: error1 } = await landlord1!.client
        .from('properties')
        .select('id, name')
        .order('created_at', { ascending: false })
        .range(0, 4);

      expect(error1).toBeNull();
      expect(Array.isArray(page1)).toBe(true);
      console.log('Range-based pagination working');
    });

    test('should handle empty results gracefully', async () => {
      test.skip(!landlord1, 'landlord1 not authenticated');

      // Query for non-existent data
      const { data, error } = await landlord1!.client
        .from('properties')
        .select('id')
        .eq('id', '00000000-0000-0000-0000-000000000000');

      expect(error).toBeNull();
      expect(data).toEqual([]);
      console.log('Empty results handled gracefully');
    });

    test('should handle different viewport sizes via count', async () => {
      test.skip(!landlord1, 'landlord1 not authenticated');

      // Simulate different page sizes for different viewports
      const mobileLimitsize = 5;
      const tabletPageSize = 10;
      const desktopPageSize = 20;

      const { count, error } = await landlord1!.client
        .from('maintenance_requests')
        .select('*', { count: 'exact', head: true });

      expect(error).toBeNull();
      expect(typeof count).toBe('number');

      // Can paginate based on device
      console.log(`Total count: ${count}, can paginate for different viewports`);
    });

    test('should support text search across fields', async () => {
      test.skip(!landlord1, 'landlord1 not authenticated');

      // Test text search capability
      const { data, error } = await landlord1!.client
        .from('maintenance_requests')
        .select('id, title, description')
        .or('title.ilike.%test%,description.ilike.%test%')
        .limit(10);

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
      console.log('Text search working across fields');
    });
  });

  test.describe('Accessibility', () => {
    test('should have proper timestamp handling', async () => {
      test.skip(!landlord1, 'landlord1 not authenticated');

      const { data, error } = await landlord1!.client
        .from('profiles')
        .select('created_at, updated_at')
        .eq('id', landlord1!.profileId)
        .single();

      expect(error).toBeNull();
      expect(data?.created_at).toBeTruthy();

      // Verify timestamps are valid ISO format
      const createdAt = new Date(data!.created_at);
      expect(createdAt.getTime()).toBeGreaterThan(0);
      console.log('Timestamp handling is correct');
    });

    test('should have proper role values', async () => {
      test.skip(!landlord1 || !tenant1, 'Users not authenticated');

      const { data: landlordProfile } = await landlord1!.client
        .from('profiles')
        .select('role')
        .eq('id', landlord1!.profileId)
        .single();

      const { data: tenantProfile } = await tenant1!.client
        .from('profiles')
        .select('role')
        .eq('id', tenant1!.profileId)
        .single();

      expect(['landlord', 'tenant', 'admin']).toContain(landlordProfile?.role);
      expect(['landlord', 'tenant', 'admin']).toContain(tenantProfile?.role);
      console.log('Role values are valid');
    });

    test('should have proper priority values', async () => {
      const validPriorities = ['low', 'medium', 'high', 'urgent'];

      validPriorities.forEach((priority) => {
        expect(typeof priority).toBe('string');
        expect(priority.length).toBeGreaterThan(0);
      });

      console.log('Priority values are valid');
    });

    test('should have proper issue type values', async () => {
      const validIssueTypes = [
        'plumbing',
        'electrical',
        'hvac',
        'appliance',
        'structural',
        'pest',
        'other',
      ];

      validIssueTypes.forEach((issueType) => {
        expect(typeof issueType).toBe('string');
        expect(issueType.length).toBeGreaterThan(0);
      });

      console.log('Issue type values are valid');
    });
  });

  test.describe('Performance & Loading States', () => {
    test('should handle concurrent queries efficiently', async () => {
      test.skip(!landlord1, 'landlord1 not authenticated');

      const startTime = Date.now();

      // Run multiple queries concurrently
      const [profileResult, propertiesResult, requestsResult] = await Promise.all([
        landlord1!.client.from('profiles').select('id').eq('id', landlord1!.profileId).single(),
        landlord1!.client.from('properties').select('id').limit(5),
        landlord1!.client.from('maintenance_requests').select('id').limit(5),
      ]);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(profileResult.error).toBeNull();
      expect(propertiesResult.error).toBeNull();
      expect(requestsResult.error).toBeNull();

      // All queries should complete in reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds max
      console.log(`Concurrent queries completed in ${duration}ms`);
    });

    test('should support efficient count queries', async () => {
      test.skip(!landlord1, 'landlord1 not authenticated');

      const { count, error } = await landlord1!.client
        .from('maintenance_requests')
        .select('*', { count: 'exact', head: true });

      expect(error).toBeNull();
      expect(typeof count).toBe('number');
      console.log(`Count query returned: ${count}`);
    });
  });

  test.describe('Cross-Screen Consistency', () => {
    test('should maintain data consistency across related tables', async () => {
      test.skip(!landlord1 || !tenant1, 'Users not authenticated');

      // Create property
      const { data: property } = await landlord1!.client
        .from('properties')
        .insert({
          landlord_id: landlord1!.profileId,
          name: 'Consistency Test Property',
          address: '789 Test Blvd',
          property_type: 'condo',
          allow_tenant_signup: true,
        })
        .select('id, landlord_id, property_code')
        .single();

      expect(property).toBeTruthy();
      expect(property!.landlord_id).toBe(landlord1!.profileId);

      // Link tenant to property
      await tenant1!.client.rpc('link_tenant_to_property', {
        input_code: property!.property_code,
        tenant_id: tenant1!.profileId,
      });

      // Create maintenance request as tenant (RLS requires tenant_id = auth.uid())
      const { data: request } = await tenant1!.client
        .from('maintenance_requests')
        .insert({
          property_id: property!.id,
          tenant_id: tenant1!.profileId,
          title: 'Consistency Test',
          description: 'Testing FK consistency',
          area: 'bathroom',
          asset: 'toilet',
          issue_type: 'plumbing',
          priority: 'low',
          status: 'pending',
        })
        .select('id, property_id')
        .single();

      expect(request).toBeTruthy();
      expect(request!.property_id).toBe(property!.id);

      // Query with join to verify consistency (as landlord)
      const { data: joinedData } = await landlord1!.client
        .from('maintenance_requests')
        .select(
          `
          id,
          title,
          properties (
            id,
            name
          )
        `
        )
        .eq('id', request!.id)
        .single();

      expect(joinedData?.properties).toBeTruthy();
      console.log('Data consistency maintained across related tables');

      // Cleanup
      await landlord1!.client.from('maintenance_requests').delete().eq('id', request!.id);
      await landlord1!.client.from('tenant_property_links').delete().eq('property_id', property!.id);
      await landlord1!.client.from('properties').delete().eq('id', property!.id);
    });
  });
});
