const base = process.env.EXPO_PUBLIC_SUPABASE_URL as string
const anon = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string
async function getClerkToken() {
  const w:any = typeof window !== 'undefined' ? window : {}
  return await w?.Clerk?.session?.getToken?.() ?? null
}
async function authHeaders(retries = 6, delayMs = 200): Promise<HeadersInit> {
  for (let i=0;i<retries;i++) {
    const t = await getClerkToken()
    if (t) return { apikey: anon, Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }
    await new Promise(r=>setTimeout(r, delayMs))
  }
  throw new Error('AUTH_NOT_READY')
}
export async function restGet(path: string, qs: Record<string,string>) {
  const h = await authHeaders()
  const q = new URLSearchParams(qs).toString()
  const r = await fetch(`${base}/rest/v1/${path}?${q}`, { headers: h })
  if (!r.ok) throw new Error(`${r.status}|${await r.text()}`)
  return r.json()
}
export async function restInsert(path: string, body: unknown) {
  const h = await authHeaders()
  const r = await fetch(`${base}/rest/v1/${path}`, { method: 'POST', headers: { ...h, Prefer: 'return=representation' }, body: JSON.stringify(body) })
  if (!r.ok) throw new Error(`${r.status}|${await r.text()}`)
  return r.json()
}
export async function restPatch(path: string, qs: Record<string,string>, body: unknown) {
  const h = await authHeaders()
  const q = new URLSearchParams(qs).toString()
  const r = await fetch(`${base}/rest/v1/${path}?${q}`, { method: 'PATCH', headers: { ...h, Prefer: 'return=representation' }, body: JSON.stringify(body) })
  if (!r.ok) throw new Error(`${r.status}|${await r.text()}`)
  return r.json()
}
