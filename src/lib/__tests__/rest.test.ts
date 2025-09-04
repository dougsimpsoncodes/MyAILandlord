import { restGet, TokenProvider } from '../rest'

describe('rest.ts token injection', () => {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://example.supabase.co'
  const originalFetch = global.fetch as any

  beforeEach(() => {
    ;(global as any).fetch = jest.fn(async (url: string, init: any) => ({
      ok: true,
      json: async () => ([]),
      text: async () => ''
    }))
  })

  afterEach(() => {
    ;(global as any).fetch = originalFetch
    jest.clearAllMocks()
  })

  it('adds Authorization and apikey headers using injected tokenProvider', async () => {
    const tokenProvider: TokenProvider = { getToken: async () => 'TEST_TOKEN' }
    await restGet('maintenance_requests', { select: '*' }, tokenProvider)
    expect(global.fetch).toHaveBeenCalled()
    const [url, init] = (global.fetch as jest.Mock).mock.calls[0]
    expect(url).toContain(`${base}/rest/v1/maintenance_requests`)
    expect(init.headers.Authorization).toBe('Bearer TEST_TOKEN')
    expect(init.headers.apikey).toBeDefined()
  })
})

