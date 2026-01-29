import { storageService, setStorageSupabaseClient } from '../storage'

// Create a mock Supabase client
const mockCreateSignedUrl = jest.fn(async (_path: string, _expires: number) => ({
  data: { signedUrl: 'https://signed.example/url' },
  error: null
}))

const mockFrom = jest.fn(() => ({
  createSignedUrl: mockCreateSignedUrl
}))

const mockSupabaseClient = {
  storage: {
    from: mockFrom
  }
} as any

describe('SupabaseStorageService signed URL cache', () => {
  beforeEach(() => {
    // Set the mock storage client before tests
    setStorageSupabaseClient(mockSupabaseClient)
    jest.clearAllMocks()
  })

  it('returns a signed URL and caches it', async () => {
    const url = await storageService.getSignedUrl('property-images', 'some/path.jpg', 3600)
    expect(url).toBe('https://signed.example/url')

    // Second call should use cache
    const url2 = await storageService.getSignedUrl('property-images', 'some/path.jpg', 3600)
    expect(url2).toBe(url) // cache hit

    // createSignedUrl should only be called once due to caching
    expect(mockCreateSignedUrl).toHaveBeenCalledTimes(1)
  })
})
