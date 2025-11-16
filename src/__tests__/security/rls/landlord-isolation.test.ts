/**
 * Landlord Isolation Tests
 *
 * Validates that landlords can only access their own data
 * Prevents cross-tenant data leakage
 */

import {
  createTestLandlord,
  createTestProperty,
  createTestTenant,
  linkTenantToProperty,
  createTestMaintenanceRequest,
  assertCannotAccess,
  assertCanAccess,
  assertCannotUpdate,
  assertCannotDelete,
  cleanupTestUser,
  TestUser,
  TestProperty,
} from './helpers';

describe('Landlord Isolation - Properties Table', () => {
  let landlordA: TestUser;
  let landlordB: TestUser;
  let propertyA: TestProperty;
  let propertyB: TestProperty;

  beforeAll(async () => {
    landlordA = await createTestLandlord();
    landlordB = await createTestLandlord();
    propertyA = await createTestProperty(landlordA);
    propertyB = await createTestProperty(landlordB);
  });

  afterAll(async () => {
    await cleanupTestUser(landlordA);
    await cleanupTestUser(landlordB);
  });

  test('Landlord A cannot SELECT properties owned by Landlord B', async () => {
    await assertCannotAccess(
      landlordA,
      'properties',
      propertyB.id,
      'RLS VIOLATION: Landlord A accessed Landlord B property'
    );
  });

  test('Landlord A can SELECT their own properties', async () => {
    await assertCanAccess(
      landlordA,
      'properties',
      propertyA.id,
      'RLS ERROR: Landlord A could not access their own property'
    );
  });

  test('Landlord A cannot UPDATE properties owned by Landlord B', async () => {
    await assertCannotUpdate(
      landlordA,
      'properties',
      propertyB.id,
      { name: 'Hacked Property Name' },
      'RLS VIOLATION: Landlord A updated Landlord B property'
    );
  });

  test('Landlord A cannot DELETE properties owned by Landlord B', async () => {
    await assertCannotDelete(
      landlordA,
      'properties',
      propertyB.id,
      'RLS VIOLATION: Landlord A deleted Landlord B property'
    );
  });
});

describe('Landlord Isolation - Tenant Property Links', () => {
  let landlordA: TestUser;
  let landlordB: TestUser;
  let tenantA: TestUser;
  let tenantB: TestUser;
  let propertyA: TestProperty;
  let propertyB: TestProperty;

  beforeAll(async () => {
    landlordA = await createTestLandlord();
    landlordB = await createTestLandlord();
    tenantA = await createTestTenant();
    tenantB = await createTestTenant();

    propertyA = await createTestProperty(landlordA);
    propertyB = await createTestProperty(landlordB);

    await linkTenantToProperty(landlordA, tenantA, propertyA);
    await linkTenantToProperty(landlordB, tenantB, propertyB);
  });

  afterAll(async () => {
    await cleanupTestUser(landlordA);
    await cleanupTestUser(landlordB);
    await cleanupTestUser(tenantA);
    await cleanupTestUser(tenantB);
  });

  test('Landlord A cannot SELECT tenant_property_links for Landlord B properties', async () => {
    // Try to query tenant_property_links for property B (owned by landlord B)
    const { data, error } = await landlordA.supabaseClient
      .from('tenant_property_links')
      .select('*')
      .eq('property_id', propertyB.id);

    if (data && data.length > 0) {
      throw new Error(
        'RLS VIOLATION: Landlord A accessed tenant links for Landlord B property'
      );
    }
  });

  test('Landlord A can SELECT tenant_property_links for their own properties', async () => {
    const { data, error } = await landlordA.supabaseClient
      .from('tenant_property_links')
      .select('*')
      .eq('property_id', propertyA.id);

    if (error || !data || data.length === 0) {
      throw new Error(
        'RLS ERROR: Landlord A could not access tenant links for their own property'
      );
    }
  });
});

describe('Landlord Isolation - Maintenance Requests', () => {
  let landlordA: TestUser;
  let landlordB: TestUser;
  let tenantA: TestUser;
  let tenantB: TestUser;
  let propertyA: TestProperty;
  let propertyB: TestProperty;

  beforeAll(async () => {
    landlordA = await createTestLandlord();
    landlordB = await createTestLandlord();
    tenantA = await createTestTenant();
    tenantB = await createTestTenant();

    propertyA = await createTestProperty(landlordA);
    propertyB = await createTestProperty(landlordB);

    await linkTenantToProperty(landlordA, tenantA, propertyA);
    await linkTenantToProperty(landlordB, tenantB, propertyB);

    await createTestMaintenanceRequest(tenantA, propertyA);
    await createTestMaintenanceRequest(tenantB, propertyB);
  });

  afterAll(async () => {
    await cleanupTestUser(landlordA);
    await cleanupTestUser(landlordB);
    await cleanupTestUser(tenantA);
    await cleanupTestUser(tenantB);
  });

  test('Landlord A cannot SELECT maintenance_requests for Landlord B properties', async () => {
    const { data, error } = await landlordA.supabaseClient
      .from('maintenance_requests')
      .select('*')
      .eq('property_id', propertyB.id);

    if (data && data.length > 0) {
      throw new Error(
        'RLS VIOLATION: Landlord A accessed maintenance requests for Landlord B property'
      );
    }
  });

  test('Landlord A can SELECT maintenance_requests for their own properties', async () => {
    const { data, error } = await landlordA.supabaseClient
      .from('maintenance_requests')
      .select('*')
      .eq('property_id', propertyA.id);

    if (error || !data || data.length === 0) {
      throw new Error(
        'RLS ERROR: Landlord A could not access maintenance requests for their own property'
      );
    }
  });
});
