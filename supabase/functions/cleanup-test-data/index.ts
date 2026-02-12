// Cleanup Test Data Edge Function
// Purpose: Remove test users and associated data from staging/production
// Security: Requires exact Bearer service role authorization

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const DEFAULT_ALLOWED_ORIGINS = [
  'https://myailandlord.app',
  'https://www.myailandlord.app',
  'http://localhost:8081',
  'http://localhost:19006',
];

const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const resolvedAllowedOrigins = allowedOrigins.length > 0 ? allowedOrigins : DEFAULT_ALLOWED_ORIGINS;

const getCorsHeaders = (req: Request) => {
  const requestOrigin = req.headers.get('origin');
  const allowOrigin = requestOrigin && resolvedAllowedOrigins.includes(requestOrigin)
    ? requestOrigin
    : resolvedAllowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
};

interface CleanupRequest {
  email_prefix?: string;
  older_than_days?: number;
  dry_run?: boolean;
}

interface CleanupResult {
  success: boolean;
  deleted: {
    users: number;
    profiles: number;
    properties: number;
    invite_tokens: number;
    tenant_links: number;
    property_areas: number;
    property_assets: number;
  };
  errors: string[];
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authorization (service role only)
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Server misconfiguration: missing service role key' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const expectedHeader = `Bearer ${serviceRoleKey}`;
    if (!authHeader || authHeader.trim() !== expectedHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - exact Bearer service role key required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email_prefix = 'e2e-test', older_than_days = 1, dry_run = false }: CleanupRequest =
      await req.json();

    console.log('🧹 Cleanup request:', { email_prefix, older_than_days, dry_run });

    // Create admin Supabase client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const result: CleanupResult = {
      success: true,
      deleted: {
        users: 0,
        profiles: 0,
        properties: 0,
        invite_tokens: 0,
        tenant_links: 0,
        property_areas: 0,
        property_assets: 0,
      },
      errors: [],
    };

    // 1. Find test users
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - older_than_days);

    const { data: testUsers, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

    if (usersError) {
      result.errors.push(`Failed to list users: ${usersError.message}`);
      result.success = false;
      return new Response(JSON.stringify(result), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const targetUsers = testUsers.users.filter(
      (u) =>
        u.email?.startsWith(email_prefix) &&
        new Date(u.created_at) < cutoffDate
    );

    console.log(`📊 Found ${targetUsers.length} test users to cleanup`);

    if (dry_run) {
      result.deleted.users = targetUsers.length;
      console.log('🔍 DRY RUN - No data will be deleted');
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userIds = targetUsers.map((u) => u.id);

    if (userIds.length === 0) {
      console.log('✅ No test data to cleanup');
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Delete in dependency order

    // Delete invite tokens
    const { data: deletedTokens, error: tokensError } = await supabaseAdmin
      .from('invite_tokens')
      .delete()
      .in('created_by', userIds)
      .select('id');

    if (tokensError) {
      result.errors.push(`Tokens: ${tokensError.message}`);
    } else {
      result.deleted.invite_tokens = deletedTokens?.length || 0;
    }

    // Delete tenant-property links
    const { data: deletedLinks, error: linksError } = await supabaseAdmin
      .from('tenant_property_links')
      .delete()
      .in('tenant_id', userIds)
      .select('id');

    if (linksError) {
      result.errors.push(`Tenant links: ${linksError.message}`);
    } else {
      result.deleted.tenant_links = deletedLinks?.length || 0;
    }

    // Get property IDs owned by test users
    const { data: properties } = await supabaseAdmin
      .from('properties')
      .select('id')
      .in('user_id', userIds);

    const propertyIds = properties?.map((p) => p.id) || [];

    if (propertyIds.length > 0) {
      // Delete property assets
      const { data: deletedAssets, error: assetsError } = await supabaseAdmin
        .from('property_assets')
        .delete()
        .in('property_id', propertyIds)
        .select('id');

      if (assetsError) {
        result.errors.push(`Assets: ${assetsError.message}`);
      } else {
        result.deleted.property_assets = deletedAssets?.length || 0;
      }

      // Delete property areas
      const { data: deletedAreas, error: areasError } = await supabaseAdmin
        .from('property_areas')
        .delete()
        .in('property_id', propertyIds)
        .select('id');

      if (areasError) {
        result.errors.push(`Areas: ${areasError.message}`);
      } else {
        result.deleted.property_areas = deletedAreas?.length || 0;
      }

      // Delete properties
      const { data: deletedProps, error: propsError } = await supabaseAdmin
        .from('properties')
        .delete()
        .in('id', propertyIds)
        .select('id');

      if (propsError) {
        result.errors.push(`Properties: ${propsError.message}`);
      } else {
        result.deleted.properties = deletedProps?.length || 0;
      }
    }

    // Delete profiles
    const { data: deletedProfiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .in('id', userIds)
      .select('id');

    if (profilesError) {
      result.errors.push(`Profiles: ${profilesError.message}`);
    } else {
      result.deleted.profiles = deletedProfiles?.length || 0;
    }

    // Delete auth users (this will cascade to remaining profiles)
    for (const userId of userIds) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteError) {
        result.errors.push(`User ${userId}: ${deleteError.message}`);
      } else {
        result.deleted.users++;
      }
    }

    result.success = result.errors.length === 0;

    console.log('✅ Cleanup completed:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// ============================================================
// Usage Examples
// ============================================================

// Dry run (no deletion):
// curl -X POST https://[project-ref].supabase.co/functions/v1/cleanup-test-data \
//   -H "Authorization: Bearer [service-role-key]" \
//   -H "Content-Type: application/json" \
//   -d '{"email_prefix": "e2e-test", "dry_run": true}'

// Cleanup test users older than 1 day:
// curl -X POST https://[project-ref].supabase.co/functions/v1/cleanup-test-data \
//   -H "Authorization: Bearer [service-role-key]" \
//   -H "Content-Type: application/json" \
//   -d '{"email_prefix": "e2e-test", "older_than_days": 1}'

// Cleanup all test users:
// curl -X POST https://[project-ref].supabase.co/functions/v1/cleanup-test-data \
//   -H "Authorization: Bearer [service-role-key]" \
//   -H "Content-Type: application/json" \
//   -d '{"email_prefix": "e2e-test", "older_than_days": 0}'
