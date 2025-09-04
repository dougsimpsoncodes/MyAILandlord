const base = process.env.EXPO_PUBLIC_SUPABASE_URL as string
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string

export interface TokenProvider { getToken: () => Promise<string | null> }

async function authHeaders(tokenProvider?: TokenProvider, retries = 6, delayMs = 200): Promise<HeadersInit> {
  // Prefer injected provider; fallback to window.Clerk for web to preserve compatibility
  const getToken = async () => {
    if (tokenProvider) return tokenProvider.getToken()
    const w: any = typeof window !== 'undefined' ? window : {}
    return (await w?.Clerk?.session?.getToken?.({ template: 'supabase' })) ?? null
  }

  for (let i = 0; i < retries; i++) {
    const t = await getToken()
    if (t) return { apikey: anon, Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }
    await new Promise(r => setTimeout(r, delayMs))
  }
  throw new Error('AUTH_NOT_READY')
}

export async function restGet(path: string, qs: Record<string, string>, tokenProvider?: TokenProvider) {
  const h = await authHeaders(tokenProvider)
  const q = new URLSearchParams(qs).toString()
  const r = await fetch(`${base}/rest/v1/${path}?${q}`, { headers: h })
  if (!r.ok) throw new Error(`${r.status}|${await r.text()}`)
  return r.json()
}
export async function restInsert(path: string, body: unknown, tokenProvider?: TokenProvider) {
  const h = await authHeaders(tokenProvider)
  const r = await fetch(`${base}/rest/v1/${path}`, { method: 'POST', headers: { ...h, Prefer: 'return=representation' }, body: JSON.stringify(body) })
  if (!r.ok) throw new Error(`${r.status}|${await r.text()}`)
  return r.json()
}
export async function restPatch(path: string, qs: Record<string, string>, body: unknown, tokenProvider?: TokenProvider) {
  const h = await authHeaders(tokenProvider)
  const q = new URLSearchParams(qs).toString()
  const r = await fetch(`${base}/rest/v1/${path}?${q}`, { method: 'PATCH', headers: { ...h, Prefer: 'return=representation' }, body: JSON.stringify(body) })
  if (!r.ok) throw new Error(`${r.status}|${await r.text()}`)
  return r.json()
}
export async function restDelete(path: string, qs: Record<string, string>, tokenProvider?: TokenProvider) {
  const h = await authHeaders(tokenProvider)
  const q = new URLSearchParams(qs).toString()
  const r = await fetch(`${base}/rest/v1/${path}?${q}`, { method: 'DELETE', headers: h })
  if (!r.ok) throw new Error(`${r.status}|${await r.text()}`)

  const text = await r.text()
  if (!text) return null
  return JSON.parse(text)
}
