import { jest } from '@jest/globals';

// Mocks
jest.mock('@clerk/clerk-expo', () => ({
  useAuth: () => ({ getToken: jest.fn(async () => 'jwt'), userId: 'user_123' }),
}));

// Provide a minimal supabase client mock via hook
const makeChain = (handlers: any = {}) => ({
  insert: jest.fn((payload: any) => handlers.insert?.(payload) || makeChain(handlers)),
  update: jest.fn((payload: any) => handlers.update?.(payload) || makeChain(handlers)),
  delete: jest.fn((...args: any[]) => handlers.delete?.(...args) || makeChain(handlers)),
  select: jest.fn(() => ({ single: jest.fn(async () => handlers.single?.() || { data: null, error: null }) })),
  eq: jest.fn(() => makeChain(handlers)),
  order: jest.fn(() => makeChain(handlers)),
  limit: jest.fn(() => makeChain(handlers)),
});

const rpcMock = jest.fn();

const supabaseMockFactory = (overrides: any = {}) => ({
  from: jest.fn((table: string) => makeChain(overrides[table] || {})),
  functions: { invoke: jest.fn() },
  rpc: rpcMock,
});

jest.mock('../../../hooks/useSupabaseWithAuth', () => ({
  useSupabaseWithAuth: () => ({
    supabase: supabaseMockFactory(),
    getAccessToken: async () => 'clerk_access_token',
  }),
}));

// Mock typed Supabase client wrapper used inside useApiClient
const getProfileMock = jest.fn();
jest.mock('../../supabase/client', () => ({
  SupabaseClient: class {
    constructor(_client?: any) {}
    getProfile = getProfileMock;
    getUserProperties = jest.fn(async () => []);
    updateProfile = jest.fn(async () => ({}));
  },
}));

// Subject under test
import { useApiClient } from '../client';

describe('useApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when unauthenticated', async () => {
    jest.doMock('@clerk/clerk-expo', () => ({
      useAuth: () => ({ getToken: jest.fn(), userId: null }),
    }));
    const { useApiClient: makeClient } = await import('../client');
    const api = makeClient();
    expect(api).toBeNull();
  });

  it('creates a property (happy path)', async () => {
    // Prepare supabase chain to return inserted row with property_code
    const inserted = { id: 'prop1', name: 'P', property_code: 'ABC123' };
    const overrides = {
      properties: {
        insert: () => ({
          select: () => ({ single: async () => ({ data: inserted, error: null }) }),
        }),
      },
    };
    (jest.requireMock('../../../hooks/useSupabaseWithAuth') as any).useSupabaseWithAuth = () => ({
      supabase: supabaseMockFactory(overrides),
      getAccessToken: async () => 'tok',
    });

    const api = useApiClient();
    expect(api).not.toBeNull();
    const created = await api!.createProperty({ name: 'P', address_jsonb: {}, property_type: 'house' });
    expect(created).toEqual(inserted);
  });

  it('creates a property and falls back to RPC code generation when code missing', async () => {
    const insertedNoCode = { id: 'prop2', name: 'Q', property_code: null } as any;
    const updated = { id: 'prop2', name: 'Q', property_code: 'ZZZ999' } as any;

    const overrides = {
      properties: {
        insert: () => ({
          select: () => ({ single: async () => ({ data: insertedNoCode, error: null }) }),
        }),
        update: () => ({
          eq: () => ({ select: () => ({ single: async () => ({ data: updated, error: null }) }) }),
        }),
      },
    };
    rpcMock.mockResolvedValueOnce({ data: 'ZZZ999', error: null });
    (jest.requireMock('../../../hooks/useSupabaseWithAuth') as any).useSupabaseWithAuth = () => ({
      supabase: supabaseMockFactory(overrides),
      getAccessToken: async () => 'tok',
    });

    const api = useApiClient();
    const created = await api!.createProperty({ name: 'Q', address_jsonb: {}, property_type: 'condo' });
    expect(created).toEqual(updated);
    expect(rpcMock).toHaveBeenCalledWith('generate_property_code');
  });

  it('links tenant to property by id', async () => {
    // Mock profile fetch and insert
    getProfileMock.mockResolvedValueOnce({ id: 'tenant-uuid' });
    const overrides = {
      tenant_property_links: {
        insert: () => ({ select: () => ({ single: async () => ({ data: {}, error: null }) }) }),
      },
    };
    (jest.requireMock('../../../hooks/useSupabaseWithAuth') as any).useSupabaseWithAuth = () => ({
      supabase: supabaseMockFactory(overrides),
      getAccessToken: async () => 'tok',
    });

    const api = useApiClient();
    await expect(api!.linkTenantToPropertyById('property-uuid', '12B')).resolves.toBe(true);
  });

  it('creates property areas', async () => {
    const overrides = {
      property_areas: {
        insert: () => ({ single: async () => ({ data: {}, error: null }) }),
      },
    };
    (jest.requireMock('../../../hooks/useSupabaseWithAuth') as any).useSupabaseWithAuth = () => ({
      supabase: supabaseMockFactory(overrides),
      getAccessToken: async () => 'tok',
    });

    const api = useApiClient();
    await expect(
      api!.createPropertyAreas([{ property_id: 'p', name: 'Kitchen', area_type: 'kitchen' }])
    ).resolves.toBe(true);
  });
});

