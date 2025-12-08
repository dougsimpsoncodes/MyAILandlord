import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../src/services/supabase/types';

/**
 * Test Data Seeder for E2E Tests
 *
 * This helper seeds the database with test data required for E2E tests.
 * It creates test maintenance cases, properties, tenants, and vendors.
 *
 * Usage:
 *   const seeder = new TestDataSeeder();
 *   await seeder.seedTestData();
 *   // Run tests...
 *   await seeder.cleanupTestData();
 */

type MaintenanceRequest = Database['public']['Tables']['maintenance_requests']['Insert'];
type Property = Database['public']['Tables']['properties']['Insert'];
type Profile = Database['public']['Tables']['profiles']['Insert'];
type PropertyArea = Database['public']['Tables']['property_areas']['Insert'];

export interface TestIds {
  testCaseId: string;
  testPropertyId: string;
  testTenantId: string;
  testLandlordId: string;
  testAreaId: string;
}

// Well-known test IDs that match what tests expect
export const TEST_IDS: TestIds = {
  testCaseId: 'test-case-1',
  testPropertyId: 'test-property-1',
  testTenantId: 'test-tenant-1',
  testLandlordId: 'test-landlord-1',
  testAreaId: 'test-area-1',
};

// Test data fixtures
export const TEST_FIXTURES = {
  landlord: {
    id: TEST_IDS.testLandlordId,
    email: 'test-landlord@example.com',
    name: 'Test Landlord',
    role: 'landlord' as const,
    onboarding_completed: true,
  },
  tenant: {
    id: TEST_IDS.testTenantId,
    email: 'test-tenant@example.com',
    name: 'Test Tenant',
    role: 'tenant' as const,
    onboarding_completed: true,
  },
  property: {
    id: TEST_IDS.testPropertyId,
    name: 'Test Property',
    address: '123 Test Street, Test City, TS 12345',
    user_id: TEST_IDS.testLandlordId,
    landlord_id: TEST_IDS.testLandlordId,
    property_type: 'house',
    bedrooms: 3,
    bathrooms: 2,
    description: 'A test property for E2E testing',
    allow_tenant_signup: true,
    property_code: 'TEST123',
  },
  area: {
    id: TEST_IDS.testAreaId,
    property_id: TEST_IDS.testPropertyId,
    name: 'Kitchen',
    area_type: 'kitchen',
    is_default: true,
  },
  maintenanceRequest: {
    id: TEST_IDS.testCaseId,
    property_id: TEST_IDS.testPropertyId,
    tenant_id: TEST_IDS.testTenantId,
    title: 'Leaking Kitchen Faucet',
    description: 'The kitchen faucet has been dripping for a few days. Water pools under the sink.',
    issue_type: 'plumbing',
    area: 'Kitchen',
    asset: 'Faucet',
    status: 'pending' as const,
    priority: 'medium' as const,
    estimated_cost: 150,
    images: [],
    voice_notes: [],
  },
};

// Vendor test data (stored in app memory, not database)
export const TEST_VENDORS = [
  {
    id: 'vendor-1',
    name: 'Pro Plumbing Services',
    email: 'contact@proplumbing.example.com',
    phone: '555-0101',
    specialty: ['plumbing'],
    rating: 4.8,
    responseTime: '< 2 hours',
    isPreferred: true,
  },
  {
    id: 'vendor-2',
    name: 'FastFix Maintenance',
    email: 'service@fastfix.example.com',
    phone: '555-0102',
    specialty: ['plumbing', 'electrical', 'hvac'],
    rating: 4.5,
    responseTime: '< 4 hours',
    isPreferred: false,
  },
  {
    id: 'vendor-3',
    name: 'Elite Electric Co',
    email: 'info@eliteelectric.example.com',
    phone: '555-0103',
    specialty: ['electrical'],
    rating: 4.9,
    responseTime: '< 1 hour',
    isPreferred: true,
  },
];

export class TestDataSeeder {
  private supabase: SupabaseClient<Database>;
  private seededIds: string[] = [];

  constructor(supabaseUrl?: string, serviceRoleKey?: string) {
    const url = supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL;
    const key = serviceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      console.warn(
        '[TestDataSeeder] Supabase URL and key not available.\n' +
        'Test data seeding will be skipped. Tests will run in exploratory mode.'
      );
      // Create a dummy client that will fail gracefully
      this.supabase = null as any;
      return;
    }

    this.supabase = createClient<Database>(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log('[TestDataSeeder] Initialized');
  }

  /**
   * Seed all test data required for E2E tests
   */
  async seedTestData(): Promise<TestIds> {
    if (!this.supabase) {
      console.log('[TestDataSeeder] Skipping seeding - no Supabase client available');
      return TEST_IDS;
    }

    console.log('[TestDataSeeder] Starting test data seeding...');

    try {
      // 1. Create test profiles (landlord and tenant)
      await this.seedProfiles();

      // 2. Create test property
      await this.seedProperty();

      // 3. Create test property area
      await this.seedPropertyArea();

      // 4. Create test maintenance request
      await this.seedMaintenanceRequest();

      // 5. Link tenant to property
      await this.seedTenantPropertyLink();

      console.log('[TestDataSeeder] Test data seeding complete!');
      console.log('[TestDataSeeder] Seeded IDs:', TEST_IDS);

      return TEST_IDS;
    } catch (error) {
      console.error('[TestDataSeeder] Seeding error:', error);
      throw error;
    }
  }

  private async seedProfiles(): Promise<void> {
    console.log('[TestDataSeeder] Seeding profiles...');

    // Seed landlord profile
    const { error: landlordError } = await this.supabase
      .from('profiles')
      .upsert(TEST_FIXTURES.landlord, { onConflict: 'id' });

    if (landlordError) {
      console.error('[TestDataSeeder] Landlord profile error:', landlordError.message);
      // Continue - profile might already exist from auth
    } else {
      this.seededIds.push(`profile:${TEST_FIXTURES.landlord.id}`);
    }

    // Seed tenant profile
    const { error: tenantError } = await this.supabase
      .from('profiles')
      .upsert(TEST_FIXTURES.tenant, { onConflict: 'id' });

    if (tenantError) {
      console.error('[TestDataSeeder] Tenant profile error:', tenantError.message);
    } else {
      this.seededIds.push(`profile:${TEST_FIXTURES.tenant.id}`);
    }
  }

  private async seedProperty(): Promise<void> {
    console.log('[TestDataSeeder] Seeding property...');

    const { error } = await this.supabase
      .from('properties')
      .upsert(TEST_FIXTURES.property, { onConflict: 'id' });

    if (error) {
      console.error('[TestDataSeeder] Property error:', error.message);
      throw error;
    }

    this.seededIds.push(`property:${TEST_FIXTURES.property.id}`);
  }

  private async seedPropertyArea(): Promise<void> {
    console.log('[TestDataSeeder] Seeding property area...');

    const { error } = await this.supabase
      .from('property_areas')
      .upsert(TEST_FIXTURES.area, { onConflict: 'id' });

    if (error) {
      console.error('[TestDataSeeder] Property area error:', error.message);
      // Non-fatal - area might not be required for all tests
    } else {
      this.seededIds.push(`property_area:${TEST_FIXTURES.area.id}`);
    }
  }

  private async seedMaintenanceRequest(): Promise<void> {
    console.log('[TestDataSeeder] Seeding maintenance request...');

    const { error } = await this.supabase
      .from('maintenance_requests')
      .upsert(TEST_FIXTURES.maintenanceRequest, { onConflict: 'id' });

    if (error) {
      console.error('[TestDataSeeder] Maintenance request error:', error.message);
      throw error;
    }

    this.seededIds.push(`maintenance_request:${TEST_FIXTURES.maintenanceRequest.id}`);
  }

  private async seedTenantPropertyLink(): Promise<void> {
    console.log('[TestDataSeeder] Seeding tenant-property link...');

    const { error } = await this.supabase
      .from('tenant_property_links')
      .upsert({
        property_id: TEST_IDS.testPropertyId,
        tenant_id: TEST_IDS.testTenantId,
        is_active: true,
        invitation_status: 'accepted',
        accepted_at: new Date().toISOString(),
      }, { onConflict: 'tenant_id,property_id' });

    if (error) {
      console.error('[TestDataSeeder] Tenant-property link error:', error.message);
      // Non-fatal
    } else {
      this.seededIds.push(`tenant_property_link:${TEST_IDS.testTenantId}:${TEST_IDS.testPropertyId}`);
    }
  }

  /**
   * Create additional maintenance requests for testing different scenarios
   */
  async seedAdditionalCases(): Promise<string[]> {
    if (!this.supabase) {
      console.log('[TestDataSeeder] Skipping additional cases - no Supabase client available');
      return [];
    }

    const additionalCases = [
      {
        id: 'test-case-urgent',
        property_id: TEST_IDS.testPropertyId,
        tenant_id: TEST_IDS.testTenantId,
        title: 'Broken AC Unit - Very Hot',
        description: 'AC stopped working completely. Temperature inside is over 90°F.',
        issue_type: 'hvac',
        area: 'Living Room',
        asset: 'AC Unit',
        status: 'pending' as const,
        priority: 'urgent' as const,
        estimated_cost: 500,
      },
      {
        id: 'test-case-in-progress',
        property_id: TEST_IDS.testPropertyId,
        tenant_id: TEST_IDS.testTenantId,
        title: 'Electrical Outlet Not Working',
        description: 'The outlet in the bedroom stopped working.',
        issue_type: 'electrical',
        area: 'Bedroom',
        asset: 'Outlet',
        status: 'in_progress' as const,
        priority: 'medium' as const,
        estimated_cost: 100,
        assigned_vendor_email: 'info@eliteelectric.example.com',
      },
      {
        id: 'test-case-completed',
        property_id: TEST_IDS.testPropertyId,
        tenant_id: TEST_IDS.testTenantId,
        title: 'Fixed: Garage Door Issue',
        description: 'Garage door was not closing properly. Now fixed.',
        issue_type: 'garage',
        area: 'Garage',
        asset: 'Garage Door',
        status: 'completed' as const,
        priority: 'low' as const,
        estimated_cost: 200,
        actual_cost: 175,
        completion_notes: 'Replaced spring and adjusted tracks.',
      },
    ];

    const ids: string[] = [];

    for (const caseData of additionalCases) {
      const { error } = await this.supabase
        .from('maintenance_requests')
        .upsert(caseData, { onConflict: 'id' });

      if (error) {
        console.error(`[TestDataSeeder] Case ${caseData.id} error:`, error.message);
      } else {
        ids.push(caseData.id);
        this.seededIds.push(`maintenance_request:${caseData.id}`);
      }
    }

    return ids;
  }

  /**
   * Clean up all seeded test data
   */
  async cleanupTestData(): Promise<void> {
    if (!this.supabase) {
      console.log('[TestDataSeeder] Skipping cleanup - no Supabase client available');
      return;
    }

    console.log('[TestDataSeeder] Cleaning up test data...');

    // Delete in reverse order of creation (respecting foreign keys)

    // 1. Delete tenant-property links
    await this.supabase
      .from('tenant_property_links')
      .delete()
      .eq('property_id', TEST_IDS.testPropertyId);

    // 2. Delete maintenance requests
    await this.supabase
      .from('maintenance_requests')
      .delete()
      .eq('property_id', TEST_IDS.testPropertyId);

    // 3. Delete property areas
    await this.supabase
      .from('property_areas')
      .delete()
      .eq('property_id', TEST_IDS.testPropertyId);

    // 4. Delete property
    await this.supabase
      .from('properties')
      .delete()
      .eq('id', TEST_IDS.testPropertyId);

    // 5. Delete test profiles (only if they're truly test profiles)
    await this.supabase
      .from('profiles')
      .delete()
      .in('id', [TEST_IDS.testLandlordId, TEST_IDS.testTenantId]);

    console.log('[TestDataSeeder] Cleanup complete');
    this.seededIds = [];
  }

  /**
   * Check if test data already exists
   */
  async checkTestDataExists(): Promise<boolean> {
    if (!this.supabase) {
      return false;
    }

    const { data, error } = await this.supabase
      .from('maintenance_requests')
      .select('id')
      .eq('id', TEST_IDS.testCaseId)
      .single();

    return !error && !!data;
  }

  /**
   * Get the test vendors list (for mocking in tests)
   */
  getTestVendors() {
    return TEST_VENDORS;
  }
}

/**
 * Global setup function for Playwright
 * Called once before all tests run
 */
export async function globalSetup(): Promise<void> {
  console.log('[GlobalSetup] Running test data setup...');

  try {
    const seeder = new TestDataSeeder();

    // Check if data already exists
    const exists = await seeder.checkTestDataExists();

    if (!exists) {
      await seeder.seedTestData();
      await seeder.seedAdditionalCases();
    } else {
      console.log('[GlobalSetup] Test data already exists, skipping seeding');
    }
  } catch (error) {
    console.error('[GlobalSetup] Failed to seed test data:', error);
    // Don't throw - let tests run anyway (they'll skip if needed)
  }
}

/**
 * Global teardown function for Playwright
 * Called once after all tests complete
 */
export async function globalTeardown(): Promise<void> {
  console.log('[GlobalTeardown] Cleaning up test data...');

  try {
    const seeder = new TestDataSeeder();
    await seeder.cleanupTestData();
  } catch (error) {
    console.error('[GlobalTeardown] Failed to cleanup test data:', error);
  }
}
