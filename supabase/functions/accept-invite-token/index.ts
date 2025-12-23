import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { getCorsHeaders, isOriginAllowed, checkRateLimit, getClientIp, sanitizeLog } from '../_shared/cors-production.ts'

serve(async (req) => {
  const origin = req.headers.get('origin');
  const authHeader = req.headers.get('Authorization');
  const headers = getCorsHeaders(origin);

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers });
  }

  try {
    // Get authenticated user first (needed for CORS check)
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // CORS check (supports native apps without Origin header)
    if (!isOriginAllowed(origin, authHeader)) {
      console.warn('Origin not allowed:', origin);
      return new Response(
        JSON.stringify({ error: 'Origin not allowed' }),
        { status: 403, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting (Postgres-backed)
    const clientIp = getClientIp(req);
    const rateLimitResult = await checkRateLimit(supabaseClient, clientIp, 'accept-invite-token', 20, 60);

    if (!rateLimitResult.allowed) {
      console.warn('Rate limit exceeded:', clientIp);
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        {
          status: 429,
          headers: {
            ...headers,
            'Content-Type': 'application/json',
            'Retry-After': '60'
          }
        }
      );
    }

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    const { token } = await req.json();

    if (!token || typeof token !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Token is required' }),
        { status: 400, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    // Call atomic RPC function
    // This handles all validation, locking, and linking in a single transaction
    const { data: result, error: rpcError } = await supabaseClient.rpc(
      'accept_invite_token',
      {
        p_token: token,
        p_tenant_id: user.id
      }
    );

    if (rpcError) {
      console.error('RPC error:', sanitizeLog({ error: rpcError, user_id: user.id }));
      return new Response(
        JSON.stringify({ error: 'Failed to process invite' }),
        { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } }
      );
    }

    // Log success (token_id only, never the token value)
    if (result.success) {
      console.log('Invite accepted:', sanitizeLog({
        user_id: user.id,
        property_id: result.property_id,
        already_linked: result.already_linked,
        timestamp: new Date().toISOString()
      }));
    } else {
      console.log('Invite rejected:', sanitizeLog({
        user_id: user.id,
        error: result.error,
        timestamp: new Date().toISOString()
      }));
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error in accept-invite-token:', sanitizeLog(err));
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...headers, 'Content-Type': 'application/json' } }
    );
  }
})
