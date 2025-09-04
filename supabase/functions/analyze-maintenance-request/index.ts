import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as jose from 'https://deno.land/x/jose@v4.14.4/index.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': Deno.env.get('DENO_ENV') === 'development' ? 'http://localhost:8081' : 'https://myailandlord.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

// Simple in-memory rate limiter (per process, best-effort)
const WINDOW_MS = 60_000 // 1 minute
const LIMIT = 10 // 10 requests per minute per user
const buckets = new Map<string, { count: number; reset: number }>()

function rateLimited(key: string) {
  const now = Date.now()
  const entry = buckets.get(key)
  if (!entry || now > entry.reset) {
    buckets.set(key, { count: 1, reset: now + WINDOW_MS })
    return false
  }
  if (entry.count >= LIMIT) {
    return true
  }
  entry.count += 1
  return false
}

interface RequestBody {
  description: string
  images?: string[]
  clerkUserId: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Require Authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const token = authHeader.substring(7)

    // Verify JWT signature against Clerk JWKS
    const instance = Deno.env.get('CLERK_INSTANCE')
    const jwksUrl = Deno.env.get('CLERK_JWKS_URL') || (instance ? `https://${instance}.clerk.accounts.dev/.well-known/jwks.json` : 'https://api.clerk.dev/v1/jwks')
    const issuer = Deno.env.get('CLERK_ISSUER') || (instance ? `https://${instance}.clerk.accounts.dev` : undefined)
    const audience = Deno.env.get('SUPABASE_PROJECT_REF')

    let sub: string | undefined
    try {
      const JWKS = jose.createRemoteJWKSet(new URL(jwksUrl))
      const { payload } = await jose.jwtVerify(token, JWKS, {
        ...(issuer ? { issuer } : {}),
        ...(audience ? { audience } : {}),
      } as any)
      sub = (payload?.sub as string | undefined) || undefined
    } catch (_err) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Apply rate limiting per user (sub) or token hash fallback
    const key = sub || `anon:${token.slice(0,16)}`
    if (rateLimited(key)) {
      return new Response(JSON.stringify({ error: 'Too Many Requests' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { description, images, clerkUserId } = await req.json() as RequestBody

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Verify JWT corresponds to an existing user
    const userRes = await supabase.auth.getUser()
    if (userRes.error || !userRes.data?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Verify user exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', clerkUserId)
      .single()

    if (!profile) {
      throw new Error('User not found')
    }

    // Prepare the prompt for OpenAI
    const systemPrompt = `You are an AI assistant helping analyze maintenance requests for rental properties. 
    Based on the description (and images if provided), determine:
    1. Severity level (low, medium, high, urgent)
    2. Category of the issue
    3. Suggested actions for resolution
    4. Estimated cost range (if applicable)
    
    Return your analysis in JSON format.`

    const userPrompt = `Maintenance Request Description: ${description}
    ${images?.length ? `\nNumber of images provided: ${images.length}` : ''}`

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
        response_format: { type: 'json_object' }
      }),
    })

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`)
    }

    const openaiData = await openaiResponse.json()
    const analysis = JSON.parse(openaiData.choices[0].message.content)

    // Format the response
    const formattedAnalysis = {
      severity: analysis.severity || 'medium',
      category: analysis.category || 'General Maintenance',
      suggestedActions: analysis.suggestedActions || ['Inspect the issue', 'Contact appropriate vendor'],
      estimatedCost: analysis.estimatedCost || null,
    }

    return new Response(
      JSON.stringify({ analysis: formattedAnalysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in analyze-maintenance-request:', error)
    return new Response(JSON.stringify({ error: 'Bad Request' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
