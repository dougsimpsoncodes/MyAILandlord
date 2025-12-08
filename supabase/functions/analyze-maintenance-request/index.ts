import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
  userId: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Require Authorization header (Supabase user JWT)
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const token = authHeader.substring(7)

    // Apply rate limiting per user (sub) or token hash fallback
    const key = `user:${token.slice(0,16)}`
    if (rateLimited(key)) {
      return new Response(JSON.stringify({ error: 'Too Many Requests' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { description, images, userId } = await req.json() as RequestBody

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!

    // Create a service client for database operations (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify JWT corresponds to an existing user
    const userRes = await supabase.auth.getUser(token)
    if (userRes.error || !userRes.data?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Verify profile exists for provided userId
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single()

    if (!profile) {
      throw new Error('User not found')
    }

    // Prepare the prompt for Gemini
    const prompt = `You are an AI assistant helping analyze maintenance requests for rental properties.

Based on this maintenance request, provide your analysis:

Description: ${description}
${images?.length ? `Number of images provided: ${images.length}` : 'No images provided'}

Analyze and determine:
1. Severity level (must be one of: low, medium, high, urgent)
2. Category of the issue (e.g., plumbing, electrical, HVAC, appliance, structural, pest, general)
3. Suggested actions for resolution (list 2-4 specific steps)
4. Estimated cost range (provide min and max in USD, or null if unknown)

Respond ONLY with a valid JSON object in this exact format:
{
  "severity": "low|medium|high|urgent",
  "category": "string",
  "suggestedActions": ["action1", "action2"],
  "estimatedCost": { "min": number, "max": number } or null
}`

    // Call Google Gemini API (free tier: gemini-2.0-flash)
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
          ]
        }),
      }
    )

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('Gemini API error:', errorText)
      throw new Error(`Gemini API error: ${geminiResponse.statusText}`)
    }

    const geminiData = await geminiResponse.json()

    // Extract text from Gemini response
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Parse JSON from response (handle markdown code blocks if present)
    let jsonStr = responseText
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1]
    }

    let analysis
    try {
      analysis = JSON.parse(jsonStr.trim())
    } catch {
      console.error('Failed to parse Gemini response:', responseText)
      // Provide fallback response
      analysis = {
        severity: 'medium',
        category: 'General Maintenance',
        suggestedActions: ['Inspect the issue', 'Contact appropriate vendor'],
        estimatedCost: null
      }
    }

    // Format and validate the response
    const validSeverities = ['low', 'medium', 'high', 'urgent']
    const formattedAnalysis = {
      severity: validSeverities.includes(analysis.severity?.toLowerCase())
        ? analysis.severity.toLowerCase()
        : 'medium',
      category: analysis.category || 'General Maintenance',
      suggestedActions: Array.isArray(analysis.suggestedActions)
        ? analysis.suggestedActions
        : ['Inspect the issue', 'Contact appropriate vendor'],
      estimatedCost: analysis.estimatedCost || null,
    }

    return new Response(
      JSON.stringify({ analysis: formattedAnalysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Error in analyze-maintenance-request:', errorMessage)
    return new Response(JSON.stringify({ error: errorMessage || 'Bad Request' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
