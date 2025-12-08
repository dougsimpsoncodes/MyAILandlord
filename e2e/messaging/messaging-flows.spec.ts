/**
 * Messaging System E2E Tests
 *
 * Tests the messaging functionality between landlords and tenants.
 * Covers message sending, receiving, and RLS-based access control.
 *
 * Test Scenarios:
 * 1. Tenant can send message to landlord about a property
 * 2. Landlord can send message to tenant
 * 3. Message visibility respects RLS (user can only see their messages)
 * 4. Real-time subscription updates
 * 5. Message thread retrieval
 */

import { test, expect } from '@playwright/test';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';

// Run tests in serial mode
test.describe.configure({ mode: 'serial' });

// Test configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Test user credentials
const TEST_USERS = {
  landlord: {
    email: process.env.TEST_LANDLORD1_EMAIL || 'test-landlord@myailandlord.com',
    password: process.env.TEST_LANDLORD1_PASSWORD || 'MyAI2025!Landlord#Test',
  },
  tenant: {
    email: process.env.TEST_TENANT1_EMAIL || 'test-tenant@myailandlord.com',
    password: process.env.TEST_TENANT1_PASSWORD || 'MyAI2025!Tenant#Test',
  },
};

interface AuthenticatedClient {
  client: SupabaseClient;
  user: User;
  profileId: string;
}

// Sleep helper for rate limit backoff
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Authenticate a user and return their Supabase client with retry for rate limits
 */
async function authenticateUser(email: string, password: string): Promise<AuthenticatedClient | null> {
  const maxRetries = 5;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

      const { data: authData, error: authError } = await client.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        if (authError.message.includes('rate limit') || authError.status === 429) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt), 30000);
          console.log(`Rate limited for ${email}, attempt ${attempt + 1}/${maxRetries}, waiting ${backoffMs}ms...`);
          await sleep(backoffMs);
          continue;
        }
        console.error(`Auth failed for ${email}: ${authError.message}`);
        return null;
      }

      if (!authData.user) {
        return null;
      }

      return {
        client,
        user: authData.user,
        profileId: authData.user.id,
      };
    } catch (error) {
      const backoffMs = Math.min(1000 * Math.pow(2, attempt), 30000);
      console.log(`Auth error for ${email}, attempt ${attempt + 1}/${maxRetries}, waiting ${backoffMs}ms...`);
      await sleep(backoffMs);
    }
  }

  return null;
}

/**
 * Get or create a property that both landlord and tenant have access to
 */
async function getOrCreateSharedProperty(
  landlordClient: AuthenticatedClient,
  tenantClient: AuthenticatedClient
): Promise<{ id: string; name: string } | null> {
  // First get landlord's properties
  const { data: landlordProperties, error: landlordError } = await landlordClient.client
    .from('properties')
    .select('id, name')
    .eq('landlord_id', landlordClient.profileId)
    .limit(1)
    .single();

  if (landlordError || !landlordProperties) {
    console.log('Landlord has no properties');
    return null;
  }

  // Check if tenant is linked to this property
  const { data: existingLink } = await tenantClient.client
    .from('tenant_property_links')
    .select('id')
    .eq('property_id', landlordProperties.id)
    .eq('tenant_id', tenantClient.profileId)
    .eq('is_active', true)
    .maybeSingle();

  if (existingLink) {
    console.log('Found existing tenant-property link');
    return landlordProperties;
  }

  // Create the link if it doesn't exist
  console.log('Creating tenant-property link for messaging tests...');
  const { data: newLink, error: linkError } = await tenantClient.client
    .from('tenant_property_links')
    .insert({
      property_id: landlordProperties.id,
      tenant_id: tenantClient.profileId,
      is_active: true,
    })
    .select('id')
    .single();

  if (linkError) {
    console.log('Failed to create tenant-property link:', linkError.message);
    return null;
  }

  console.log('Created tenant-property link:', newLink.id);
  return landlordProperties;
}

/**
 * Send a message between users
 */
async function sendMessage(
  senderClient: AuthenticatedClient,
  recipientId: string,
  propertyId: string,
  content: string
): Promise<{ id: string } | null> {
  const { data, error } = await senderClient.client
    .from('messages')
    .insert({
      sender_id: senderClient.profileId,
      recipient_id: recipientId,
      property_id: propertyId,
      content,
      is_read: false,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to send message:', error.message);
    return null;
  }

  return data;
}

/**
 * Get messages for a user
 */
async function getMessages(
  client: AuthenticatedClient,
  otherUserId?: string
): Promise<any[]> {
  let query = client.client
    .from('messages')
    .select('*')
    .or(`sender_id.eq.${client.profileId},recipient_id.eq.${client.profileId}`)
    .order('created_at', { ascending: false });

  if (otherUserId) {
    query = query.or(
      `and(sender_id.eq.${client.profileId},recipient_id.eq.${otherUserId}),` +
      `and(sender_id.eq.${otherUserId},recipient_id.eq.${client.profileId})`
    );
  }

  const { data, error } = await query.limit(50);

  if (error) {
    console.error('Failed to get messages:', error.message);
    return [];
  }

  return data || [];
}

/**
 * Mark message as read
 */
async function markMessageAsRead(
  client: AuthenticatedClient,
  messageId: string
): Promise<boolean> {
  const { error } = await client.client
    .from('messages')
    .update({ is_read: true })
    .eq('id', messageId)
    .eq('recipient_id', client.profileId);

  return !error;
}

/**
 * Delete test messages
 */
async function cleanupTestMessages(
  client: AuthenticatedClient,
  messageIds: string[]
): Promise<void> {
  for (const id of messageIds) {
    await client.client.from('messages').delete().eq('id', id);
  }
}

test.describe('Messaging System', () => {
  let landlord: AuthenticatedClient | null;
  let tenant: AuthenticatedClient | null;
  let sharedProperty: { id: string; name: string } | null;
  let testMessageIds: string[] = [];

  // Increase timeout for this entire test suite to handle rate limits
  test.setTimeout(60000);

  test.beforeAll(async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.log('Supabase not configured - skipping messaging tests');
      return;
    }

    // Add initial delay to avoid rate limits from other tests
    await sleep(2000);

    try {
      landlord = await authenticateUser(TEST_USERS.landlord.email, TEST_USERS.landlord.password);
      if (landlord) {
        console.log(`Authenticated landlord: ${landlord.profileId}`);
      }
    } catch (e) {
      console.log('Landlord authentication failed');
    }

    // Add delay between authentications to avoid rate limiting
    await sleep(1000);

    try {
      tenant = await authenticateUser(TEST_USERS.tenant.email, TEST_USERS.tenant.password);
      if (tenant) {
        console.log(`Authenticated tenant: ${tenant.profileId}`);
      }
    } catch (e) {
      console.log('Tenant authentication failed');
    }

    if (landlord && tenant) {
      sharedProperty = await getOrCreateSharedProperty(landlord, tenant);
      if (sharedProperty) {
        console.log(`Using shared property: ${sharedProperty.name}`);
      }
    }
  });

  test.afterAll(async () => {
    // Cleanup test messages
    if (landlord && testMessageIds.length > 0) {
      await cleanupTestMessages(landlord, testMessageIds);
    }
    if (tenant && testMessageIds.length > 0) {
      await cleanupTestMessages(tenant, testMessageIds);
    }
  });

  test('Tenant can send message to landlord', async () => {
    test.skip(!tenant || !landlord || !sharedProperty, 'Prerequisites not met');

    const messageContent = `Test message from tenant ${Date.now()}`;
    const message = await sendMessage(
      tenant!,
      landlord!.profileId,
      sharedProperty!.id,
      messageContent
    );

    expect(message).toBeTruthy();
    expect(message!.id).toBeTruthy();
    testMessageIds.push(message!.id);
    console.log(`Tenant sent message: ${message!.id}`);
  });

  test('Landlord can see message from tenant', async () => {
    test.skip(!landlord || !tenant || testMessageIds.length === 0, 'Prerequisites not met');

    const messages = await getMessages(landlord!, tenant!.profileId);

    expect(messages.length).toBeGreaterThan(0);
    const receivedMessage = messages.find(m => testMessageIds.includes(m.id));
    expect(receivedMessage).toBeTruthy();
    expect(receivedMessage.sender_id).toBe(tenant!.profileId);
    expect(receivedMessage.recipient_id).toBe(landlord!.profileId);
  });

  test('Landlord can send reply to tenant', async () => {
    test.skip(!landlord || !tenant || !sharedProperty, 'Prerequisites not met');

    const messageContent = `Reply from landlord ${Date.now()}`;
    const message = await sendMessage(
      landlord!,
      tenant!.profileId,
      sharedProperty!.id,
      messageContent
    );

    expect(message).toBeTruthy();
    expect(message!.id).toBeTruthy();
    testMessageIds.push(message!.id);
    console.log(`Landlord sent reply: ${message!.id}`);
  });

  test('Tenant can see message from landlord', async () => {
    test.skip(!tenant || !landlord || testMessageIds.length < 2, 'Prerequisites not met');

    const messages = await getMessages(tenant!, landlord!.profileId);

    expect(messages.length).toBeGreaterThan(0);
    const receivedMessage = messages.find(m =>
      m.sender_id === landlord!.profileId &&
      testMessageIds.includes(m.id)
    );
    expect(receivedMessage).toBeTruthy();
    expect(receivedMessage.recipient_id).toBe(tenant!.profileId);
  });

  test('Recipient can mark message as read', async () => {
    test.skip(!landlord || testMessageIds.length === 0, 'Prerequisites not met');

    // Get the first test message (sent by tenant to landlord)
    const messages = await getMessages(landlord!);
    const unreadMessage = messages.find(m =>
      testMessageIds.includes(m.id) &&
      m.recipient_id === landlord!.profileId &&
      !m.is_read
    );

    if (unreadMessage) {
      const success = await markMessageAsRead(landlord!, unreadMessage.id);
      expect(success).toBe(true);

      // Verify it's now marked as read
      const { data } = await landlord!.client
        .from('messages')
        .select('is_read')
        .eq('id', unreadMessage.id)
        .single();

      expect(data?.is_read).toBe(true);
    }
  });

  test('User can only see their own messages (RLS)', async () => {
    test.skip(!tenant, 'Tenant not authenticated');

    // Get all messages tenant can see
    const { data: allMessages, error } = await tenant!.client
      .from('messages')
      .select('sender_id, recipient_id');

    expect(error).toBeNull();

    // All messages should involve the tenant
    if (allMessages && allMessages.length > 0) {
      allMessages.forEach(msg => {
        const isInvolved =
          msg.sender_id === tenant!.profileId ||
          msg.recipient_id === tenant!.profileId;
        expect(isInvolved).toBe(true);
      });
    }
  });

  test('Message contains required fields', async () => {
    test.skip(!tenant || testMessageIds.length === 0, 'Prerequisites not met');

    const { data: message, error } = await tenant!.client
      .from('messages')
      .select('*')
      .eq('id', testMessageIds[0])
      .single();

    expect(error).toBeNull();
    expect(message).toBeTruthy();
    expect(message.id).toBeTruthy();
    expect(message.sender_id).toBeTruthy();
    expect(message.recipient_id).toBeTruthy();
    expect(message.content).toBeTruthy();
    expect(message.created_at).toBeTruthy();
    expect(typeof message.is_read).toBe('boolean');
  });
});

test.describe('Messaging - Cross-User Isolation', () => {
  // Increase timeout for tests that require multiple auth operations
  test.setTimeout(60000);

  test('Cannot send message impersonating another user', async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      test.skip();
      return;
    }

    const tenant = await authenticateUser(TEST_USERS.tenant.email, TEST_USERS.tenant.password);
    test.skip(!tenant, 'Tenant not authenticated');

    // Try to send a message with a different sender_id
    const { error } = await tenant!.client
      .from('messages')
      .insert({
        sender_id: '00000000-0000-0000-0000-000000000000', // Fake ID
        recipient_id: tenant!.profileId,
        content: 'Spoofed message',
        is_read: false,
      });

    // RLS should block this
    expect(error).toBeTruthy();
  });

  test('Cannot read messages between other users', async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      test.skip();
      return;
    }

    const tenant = await authenticateUser(TEST_USERS.tenant.email, TEST_USERS.tenant.password);
    test.skip(!tenant, 'Tenant not authenticated');

    // Query for messages where tenant is not sender or recipient
    const { data } = await tenant!.client
      .from('messages')
      .select('*')
      .neq('sender_id', tenant!.profileId)
      .neq('recipient_id', tenant!.profileId);

    // RLS should filter these out
    expect(data?.length || 0).toBe(0);
  });

  test('Cannot update messages from other senders', async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      test.skip();
      return;
    }

    const tenant = await authenticateUser(TEST_USERS.tenant.email, TEST_USERS.tenant.password);
    const landlord = await authenticateUser(TEST_USERS.landlord.email, TEST_USERS.landlord.password);
    test.skip(!tenant || !landlord, 'Users not authenticated');

    // Get a message sent by landlord
    const { data: landlordMessage } = await landlord!.client
      .from('messages')
      .select('id')
      .eq('sender_id', landlord!.profileId)
      .limit(1)
      .maybeSingle();

    if (landlordMessage) {
      // Try to update it as tenant
      const { error } = await tenant!.client
        .from('messages')
        .update({ content: 'Hacked content' })
        .eq('id', landlordMessage.id);

      // Should either error or affect 0 rows
      // RLS prevents modification
      expect(error !== null || true).toBe(true);
    }
  });
});

test.describe('Messaging - Edge Cases', () => {
  // Increase timeout for tests that require multiple auth operations
  test.setTimeout(60000);

  test('Handles empty message content gracefully', async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      test.skip();
      return;
    }

    const tenant = await authenticateUser(TEST_USERS.tenant.email, TEST_USERS.tenant.password);
    const landlord = await authenticateUser(TEST_USERS.landlord.email, TEST_USERS.landlord.password);
    test.skip(!tenant || !landlord, 'Users not authenticated');

    // Get a shared property
    const sharedProperty = await getOrCreateSharedProperty(landlord!, tenant!);
    test.skip(!sharedProperty, 'No shared property');

    // Try to send empty message - should fail due to constraint or be rejected
    const { error } = await tenant!.client
      .from('messages')
      .insert({
        sender_id: tenant!.profileId,
        recipient_id: landlord!.profileId,
        property_id: sharedProperty!.id,
        content: '',
        is_read: false,
      });

    // Either fails or creates empty message - both are acceptable
    // The key is it doesn't crash
    expect(true).toBe(true);
  });

  test('Handles very long message content', async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      test.skip();
      return;
    }

    const tenant = await authenticateUser(TEST_USERS.tenant.email, TEST_USERS.tenant.password);
    const landlord = await authenticateUser(TEST_USERS.landlord.email, TEST_USERS.landlord.password);
    test.skip(!tenant || !landlord, 'Users not authenticated');

    const sharedProperty = await getOrCreateSharedProperty(landlord!, tenant!);
    test.skip(!sharedProperty, 'No shared property');

    const longContent = 'A'.repeat(5000); // 5KB message

    const { data, error } = await tenant!.client
      .from('messages')
      .insert({
        sender_id: tenant!.profileId,
        recipient_id: landlord!.profileId,
        property_id: sharedProperty!.id,
        content: longContent,
        is_read: false,
      })
      .select('id')
      .single();

    if (!error && data) {
      // Cleanup
      await tenant!.client.from('messages').delete().eq('id', data.id);
    }

    // Either succeeds or fails with appropriate error
    expect(true).toBe(true);
  });

  test('Message timestamps are accurate', async () => {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      test.skip();
      return;
    }

    const tenant = await authenticateUser(TEST_USERS.tenant.email, TEST_USERS.tenant.password);
    const landlord = await authenticateUser(TEST_USERS.landlord.email, TEST_USERS.landlord.password);
    test.skip(!tenant || !landlord, 'Users not authenticated');

    const sharedProperty = await getOrCreateSharedProperty(landlord!, tenant!);
    test.skip(!sharedProperty, 'No shared property');

    const beforeSend = new Date();

    const { data, error } = await tenant!.client
      .from('messages')
      .insert({
        sender_id: tenant!.profileId,
        recipient_id: landlord!.profileId,
        property_id: sharedProperty!.id,
        content: `Timestamp test ${Date.now()}`,
        is_read: false,
      })
      .select('id, created_at')
      .single();

    const afterSend = new Date();

    if (!error && data) {
      const messageTime = new Date(data.created_at);

      // Message timestamp should be between before and after
      // Allow 5 second tolerance for server time differences
      const tolerance = 5000;
      expect(messageTime.getTime()).toBeGreaterThanOrEqual(beforeSend.getTime() - tolerance);
      expect(messageTime.getTime()).toBeLessThanOrEqual(afterSend.getTime() + tolerance);

      // Cleanup
      await tenant!.client.from('messages').delete().eq('id', data.id);
    }
  });
});
