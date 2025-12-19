import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

// Rate limiter: 20 requests per minute per user (label scanning is heavier)
const WINDOW_MS = 60_000
const LIMIT = 20
const buckets = new Map<string, { count: number; reset: number }>()

function rateLimited(key: string): boolean {
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
  imageBase64: string
  mimeType: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Require Authorization header
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const token = authHeader.substring(7)

    // Rate limiting
    const key = `label:${token.slice(0, 16)}`
    if (rateLimited(key)) {
      return new Response(
        JSON.stringify({ error: 'Too Many Requests' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { imageBase64, mimeType } = await req.json() as RequestBody

    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Missing imageBase64' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify JWT with Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const userRes = await supabase.auth.getUser(token)

    if (userRes.error || !userRes.data?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Prompt for Gemini Vision
    const prompt = `Analyze this image of an appliance label, nameplate, or energy guide.
Extract all visible information and return a JSON object with these fields (use null for fields you cannot find):

{
  "brand": "manufacturer name",
  "model": "model number",
  "serialNumber": "serial number",
  "year": "manufacture year or date",
  "energyRating": "energy rating or certification",
  "capacity": "capacity with units",
  "voltage": "voltage rating",
  "wattage": "power consumption",
  "dimensions": "size if visible",
  "weight": "weight if visible",
  "color": "color/finish if visible",
  "confidence": 0.0-1.0 based on how clearly you could read the information
}

Respond ONLY with the JSON object, no other text.`

    // Call Gemini Vision API
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType || 'image/jpeg',
                  data: imageBase64
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.2,
            topK: 32,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
        }),
      }
    )

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text()
      console.error('Gemini Vision API error:', errorText)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to analyze image. Please try again.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const geminiData = await geminiResponse.json()
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = responseText
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1]
    }

    let extractedData
    try {
      extractedData = JSON.parse(jsonStr.trim())
    } catch {
      console.error('Failed to parse Gemini response:', responseText)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Could not extract clear text from the image. Please ensure the label is well-lit and in focus.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Clean up null values
    const cleanedData: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(extractedData)) {
      if (value !== null && value !== undefined && value !== '') {
        cleanedData[key] = value
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: cleanedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('Error in extract-asset-label:', errorMessage)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to process image. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
