import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Parse allowed origins once at start
const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || 'http://localhost:8081,https://myailandlord.app')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean)

function originAllowed(origin: string | null): boolean {
  if (!origin) return false
  try {
    const o = new URL(origin).origin.toLowerCase()
    return allowedOrigins.includes(o)
  } catch {
    return false
  }
}

function corsHeaders(origin: string | null) {
  const hdrs: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (origin && originAllowed(origin)) {
    hdrs['Access-Control-Allow-Origin'] = origin
  }
  return hdrs
}

// Simple best-effort rate limiter (per function instance)
const WINDOW_MS = 60_000
const LIMIT = 30
const buckets = new Map<string, { count: number; reset: number }>()

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const e = buckets.get(key)
  if (!e || now > e.reset) {
    buckets.set(key, { count: 1, reset: now + WINDOW_MS })
    return false
  }
  if (e.count >= LIMIT) return true
  e.count += 1
  return false
}

// UUID v4 basic validation
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

serve(async (req) => {
  const origin = req.headers.get('origin')
  const headers = { ...corsHeaders(origin) }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers })
  }

  try {
    if (!originAllowed(origin)) {
      return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
        status: 403,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown'
    if (isRateLimited(ip)) {
      return new Response(JSON.stringify({ error: 'Too Many Requests' }), {
        status: 429,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    const { propertyId } = await req.json()
    if (!propertyId || typeof propertyId !== 'string' || !UUID_RE.test(propertyId)) {
      return new Response(JSON.stringify({ error: 'Invalid propertyId' }), {
        status: 400,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    // Optional: gate previews behind a flag or token before reading from DB
    const previewEnabled = (Deno.env.get('ENABLE_PUBLIC_INVITE_PREVIEW') || 'true').toLowerCase() === 'true'
    if (!previewEnabled) {
      return new Response(JSON.stringify({ error: 'Invite preview disabled' }), {
        status: 403,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    // Service role client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceKey)

    const { data: property, error } = await supabase
      .from('properties')
      .select('id, name, address, property_type, created_at')
      .eq('id', propertyId)
      .single()

    if (error || !property) {
      return new Response(JSON.stringify({ error: 'Property not found' }), {
        status: 404,
        headers: { ...headers, 'Content-Type': 'application/json' },
      })
    }

    const safe = {
      id: property.id,
      name: property.name,
      address: property.address,
      property_type: property.property_type,
      created_at: property.created_at,
    }

    return new Response(JSON.stringify(safe), {
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Error in property-invite-preview:', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  }
})