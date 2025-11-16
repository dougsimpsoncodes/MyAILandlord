/**
 * REST API Client Tests
 *
 * Tests for the low-level REST API functions
 */

import { restGet, restInsert, restPatch, restDelete, TokenProvider } from '../../lib/rest';

// Mock fetch globally
global.fetch = jest.fn();

const mockTokenProvider: TokenProvider = {
  getToken: jest.fn().mockResolvedValue('mock-token-123'),
};

const BASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'test-anon-key';

describe('REST Client - authHeaders', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('uses token provider when available', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ([{ id: 1 }]),
    });

    await restGet('properties', { select: '*' }, mockTokenProvider);

    expect(mockTokenProvider.getToken).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/rest/v1/properties'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer mock-token-123',
          apikey: ANON_KEY,
          'Content-Type': 'application/json',
        }),
      })
    );
  });

  test('throws error after max retries if no token available', async () => {
    const failingProvider: TokenProvider = {
      getToken: jest.fn().mockResolvedValue(null),
    };

    await expect(
      restGet('properties', { select: '*' }, failingProvider)
    ).rejects.toThrow('AUTH_NOT_READY');

    // Should retry 6 times (default)
    expect(failingProvider.getToken).toHaveBeenCalledTimes(6);
  });
});

describe('restGet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('makes GET request with query params', async () => {
    const mockData = [{ id: 1, name: 'Test Property' }];
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const result = await restGet('properties', { select: '*', limit: '10' }, mockTokenProvider);

    expect(result).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/rest/v1/properties?select=*&limit=10`,
      expect.objectContaining({
        headers: expect.any(Object),
      })
    );
  });

  test('throws error on failed request', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'Not Found',
    });

    await expect(
      restGet('properties', { id: 'eq.999' }, mockTokenProvider)
    ).rejects.toThrow('404|Not Found');
  });
});

describe('restInsert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('makes POST request with body', async () => {
    const insertData = { name: 'New Property', address: '123 Main St' };
    const mockResponse = [{ id: 1, ...insertData }];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await restInsert('properties', insertData, mockTokenProvider);

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/rest/v1/properties`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Prefer: 'return=representation',
        }),
        body: JSON.stringify(insertData),
      })
    );
  });

  test('throws error on insert failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'Bad Request',
    });

    await expect(
      restInsert('properties', {}, mockTokenProvider)
    ).rejects.toThrow('400|Bad Request');
  });
});

describe('restPatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('makes PATCH request with query params and body', async () => {
    const updateData = { status: 'in_progress' };
    const mockResponse = [{ id: 1, ...updateData }];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await restPatch(
      'maintenance_requests',
      { id: 'eq.1' },
      updateData,
      mockTokenProvider
    );

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/rest/v1/maintenance_requests?id=eq.1`,
      expect.objectContaining({
        method: 'PATCH',
        headers: expect.objectContaining({
          Prefer: 'return=representation',
        }),
        body: JSON.stringify(updateData),
      })
    );
  });

  test('throws error on update failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
    });

    await expect(
      restPatch('maintenance_requests', { id: 'eq.999' }, {}, mockTokenProvider)
    ).rejects.toThrow('403|Forbidden');
  });
});

describe('restDelete', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('makes DELETE request with query params', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: async () => '',
    });

    const result = await restDelete('maintenance_requests', { id: 'eq.1' }, mockTokenProvider);

    expect(result).toBeNull();
    expect(global.fetch).toHaveBeenCalledWith(
      `${BASE_URL}/rest/v1/maintenance_requests?id=eq.1`,
      expect.objectContaining({
        method: 'DELETE',
      })
    );
  });

  test('parses JSON response if present', async () => {
    const mockResponse = { id: 1, deleted: true };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      text: async () => JSON.stringify(mockResponse),
    });

    const result = await restDelete('maintenance_requests', { id: 'eq.1' }, mockTokenProvider);

    expect(result).toEqual(mockResponse);
  });

  test('throws error on delete failure', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => 'Forbidden',
    });

    await expect(
      restDelete('maintenance_requests', { id: 'eq.999' }, mockTokenProvider)
    ).rejects.toThrow('403|Forbidden');
  });
});

describe('Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('handles network errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    await expect(
      restGet('properties', { select: '*' }, mockTokenProvider)
    ).rejects.toThrow('Network error');
  });

  test('handles malformed JSON responses', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error('Invalid JSON');
      },
    });

    await expect(
      restGet('properties', { select: '*' }, mockTokenProvider)
    ).rejects.toThrow('Invalid JSON');
  });
});
