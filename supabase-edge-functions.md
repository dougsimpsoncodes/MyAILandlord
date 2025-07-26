# Supabase Edge Functions Setup

## 1. Install Supabase CLI

```bash
brew install supabase/tap/supabase
```

## 2. Initialize Supabase in your project

```bash
cd /Users/dougsimpson/Projects/MyAILandlord
supabase init
```

## 3. Create the AI Analysis Edge Function

Create the function:
```bash
supabase functions new analyze-maintenance-request
```

## 4. Edge Function Code

Save this as `supabase/functions/analyze-maintenance-request/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
    const { description, images, clerkUserId } = await req.json() as RequestBody

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

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
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
```

## 5. Deploy the Function

```bash
# Set your OpenAI API key as a secret
supabase secrets set OPENAI_API_KEY=your-openai-api-key

# Deploy the function
supabase functions deploy analyze-maintenance-request
```

## 6. Test the Function

```bash
# Get your Supabase anon key and URL
supabase status

# Test the function
curl -i --location --request POST 'https://your-project-id.supabase.co/functions/v1/analyze-maintenance-request' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"description":"Kitchen sink is leaking water","clerkUserId":"your-clerk-user-id"}'
```

## 7. Update Environment Variables

Add to your `.env` file:
```
EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL=https://your-project-id.supabase.co/functions/v1
```

## Notes

- The function uses OpenAI's GPT-4 for analysis
- You need to set up an OpenAI API key
- The function validates that the user exists in the database
- CORS headers are configured for browser-based requests
- The response format matches what the app expects