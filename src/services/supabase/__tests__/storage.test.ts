import { storageService } from '../storage'

jest.mock('../config', () => {
  const createSignedUrl = jest.fn(async (_path: string, _expires: number) => ({ data: { signedUrl: 'https://signed.example/url' }, error: null }))
  const from = jest.fn(() => ({ createSignedUrl }))
  return {
    supabase: { storage: { from } }
  }
})

describe('SupabaseStorageService signed URL cache', () => {
  it('returns a signed URL and caches it', async () => {
    const url = await storageService.getSignedUrl('property-images', 'some/path.jpg', 3600)
    expect(url).toMatch(/^https:\/\/signed\.example\/url/)
    const url2 = await storageService.getSignedUrl('property-images', 'some/path.jpg', 3600)
    expect(url2).toBe(url) // cache hit
  })
})

