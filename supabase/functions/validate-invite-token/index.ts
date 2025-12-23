import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, isOriginAllowed, checkRateLimit, getClientIp, sanitizeLog, errorResponse } from '../_shared/cors-production.ts'

serve(async (req) => {
  const origin = req.headers.get('origin');
  const authHeader = req.headers.get('Authorization');
  const headers = getCorsHeaders(origin, authHeader);

  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  try {
    // CORS check (allows native apps without Origin)
    if (!isOriginAllowed(origin, authHeader)) {
      console.warn('Origin not allowed:', { origin, hasAuth: !!authHeader });
      return errorResponse('Origin not allowed', 403, headers);
    }

    // Rate limiting (stricter for unauthenticated)
    const clientIp = getClientIp(req);
    const rateLimit = await checkRateLimit('validate-invite-token', clientIp, {
      maxTokens: 20, // Stricter limit to prevent token scanning
      refillRate: 20,
      windowSeconds: 60
    });

    if (!rateLimit.allowed) {
      console.warn('Rate limit exceeded:', { ip: clientIp, endpoint: 'validate-invite-token' });
      return errorResponse(
        'Too many requests',
        429,
        {
          ...headers,
          'Retry-After': String(rateLimit.retryAfter || 60)
        }
      );
    }

    const { token } = await req.json();

    if (!token || typeof token !== 'string' || token.length !== 12) {
      return errorResponse('Invalid token format', 400, headers);
    }

    // Use SERVICE ROLE to call validation (bypasses RLS)
    // This prevents token enumeration via direct RPC calls
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data, error } = await supabase.rpc('validate_invite_token', {
      p_token: token
    });

    if (error) {
      console.error('Validation RPC error:', sanitizeLog(error));
      return errorResponse('Failed to validate invite', 500, headers);
    }

    // Log validation (safe to log - no sensitive data)
    console.log('Token validated:', sanitizeLog({
      valid: data.valid,
      error: data.error,
      has_property: !!data.property,
      ip: clientIp,
      timestamp: new Date().toISOString()
    }));

    return new Response(
      JSON.stringify(data),
      { headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error in validate-invite-token:', sanitizeLog(err));
    return errorResponse('Internal server error', 500, headers);
  }
})
