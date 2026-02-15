// Supabase Edge Function to send push notifications via Expo
// Triggered by database webhook on messages and maintenance_requests tables

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  record: Record<string, unknown>;
  schema: string;
  old_record: Record<string, unknown> | null;
}

interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
  priority?: 'default' | 'normal' | 'high';
}

const maskToken = (token: string) => `${token.slice(0, 8)}...${token.slice(-6)}`;

serve(async (req: Request) => {
  try {
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    if (!serviceRoleKey) {
      return new Response('Server misconfiguration', { status: 500 });
    }

    // Verify webhook authorization (accept exact key or Bearer key)
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    const expectedHeader = `Bearer ${serviceRoleKey}`;
    const isAuthorized = !!authHeader && (
      authHeader.trim() === expectedHeader ||
      authHeader.trim() === serviceRoleKey
    );
    if (!isAuthorized) {
      return new Response('Unauthorized', { status: 401 });
    }

    const payload: WebhookPayload = await req.json();
    console.log('📬 Webhook received', {
      type: payload.type,
      table: payload.table,
      recordId: payload.record?.id,
    });

    // Only process INSERT events
    if (payload.type !== 'INSERT') {
      return new Response('OK - Skipping non-INSERT event', { status: 200 });
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let recipientId: string | null = null;
    let title: string;
    let body: string;
    let notificationData: Record<string, unknown> = {};

    // Handle different table types
    if (payload.table === 'messages') {
      recipientId = payload.record.recipient_id as string;
      title = 'New Message';
      body = (payload.record.content as string)?.substring(0, 100) || 'You have a new message';
      notificationData = { type: 'message', id: payload.record.id };
    } else if (payload.table === 'maintenance_requests') {
      // For maintenance requests, notify the landlord
      const propertyId = payload.record.property_id as string;

      // Get the landlord_id from the property
      const { data: property } = await supabase
        .from('properties')
        .select('landlord_id, name')
        .eq('id', propertyId)
        .single();

      if (property) {
        recipientId = property.landlord_id;
        title = 'New Maintenance Request';
        body = `${payload.record.title || 'New request'} at ${property.name}`;
        notificationData = { type: 'maintenance_request', id: payload.record.id };
      }
    } else {
      return new Response('OK - Unknown table', { status: 200 });
    }

    if (!recipientId) {
      console.log('No recipient ID found for push event');
      return new Response('OK - No recipient', { status: 200 });
    }

    // Get active push tokens for the recipient
    const { data: tokens, error: tokensError } = await supabase
      .from('device_tokens')
      .select('push_token')
      .eq('user_id', recipientId)
      .eq('is_active', true);

    if (tokensError) {
      console.error('Error fetching tokens:', tokensError.message);
      return new Response('Error fetching tokens', { status: 500 });
    }

    if (!tokens || tokens.length === 0) {
      console.log('No active push tokens for user');
      return new Response('OK - No tokens', { status: 200 });
    }

    console.log(`📱 Sending push to ${tokens.length} device(s)`);

    // Build Expo push messages
    const messages: ExpoPushMessage[] = tokens.map((t) => ({
      to: t.push_token,
      title,
      body,
      data: notificationData,
      sound: 'default',
      priority: 'high',
    }));

    // Send to Expo Push API
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    console.log('📬 Expo push response status', {
      ok: response.ok,
      count: Array.isArray(result?.data) ? result.data.length : 0,
    });

    // Handle invalid tokens (remove them from database)
    if (result.data) {
      for (let i = 0; i < result.data.length; i++) {
        const pushResult = result.data[i];
        if (pushResult.status === 'error') {
          if (
            pushResult.details?.error === 'DeviceNotRegistered' ||
            pushResult.details?.error === 'InvalidCredentials'
          ) {
            // Deactivate the invalid token
            await supabase
              .from('device_tokens')
              .update({ is_active: false })
              .eq('push_token', tokens[i].push_token);
            console.log('🗑️ Deactivated invalid token', maskToken(tokens[i].push_token));
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, sent: tokens.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error in push-notification function:', message);
    return new Response(JSON.stringify({ error: 'Push notification processing failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
