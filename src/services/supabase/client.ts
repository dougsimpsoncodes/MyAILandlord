import { supabase } from './config';
export { supabase } from './config';
import { Database } from './types';
import { SupabaseClient as SupabaseClientType, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { log } from '../../lib/log';

type Profile = Database['public']['Tables']['profiles']['Row'];
type MaintenanceRequest = Database['public']['Tables']['maintenance_requests']['Row'];
type Property = Database['public']['Tables']['properties']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];
type Announcement = Database['public']['Tables']['announcements']['Row'];

export class SupabaseClient {
  private client: SupabaseClientType<Database>;
  private currentUserId: string | null = null;

  constructor(client?: SupabaseClientType<Database>) {
    this.client = client || supabase;
  }

  // Method to update the client with an authenticated instance
  setAuthenticatedClient(authenticatedClient: SupabaseClientType<Database>) {
    this.client = authenticatedClient;
  }

  // Method to set the RLS context for the current user
  private async setRLSContext(userId: string) {
    if (this.currentUserId !== userId) {
      // With Supabase Auth, JWT is attached automatically by client configuration
      log.info('RLS context set for user:', { userId });
      this.currentUserId = userId;
    }
  }

  // Profile methods
  async getProfile(userId: string): Promise<Profile | null> {
    // Set RLS context for this user
    await this.setRLSContext(userId);
    
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No profile found
        return null;
      }
      throw new Error(`Failed to get profile: ${error.message}`);
    }
    return data;
  }

  async createProfile(profileData: {
    userId: string;
    email: string;
    name?: string;
    avatarUrl?: string;
    role?: 'tenant' | 'landlord';
  }): Promise<Profile> {
    // Use upsert to handle race conditions where profile might already exist
    const { data, error } = await this.client
      .from('profiles')
      .upsert({
        id: profileData.userId,
        email: profileData.email,
        name: profileData.name || null,
        avatar_url: profileData.avatarUrl || null,
        role: profileData.role || null,
      }, {
        onConflict: 'id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create profile: ${error.message}`);
    }

    return data;
  }

  async updateProfile(userId: string, updates: {
    name?: string;
    role?: 'tenant' | 'landlord';
    avatarUrl?: string;
  }): Promise<Profile> {
    const { data, error } = await this.client
      .from('profiles')
      .update({
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.role !== undefined && { role: updates.role }),
        ...(updates.avatarUrl !== undefined && { avatar_url: updates.avatarUrl }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }

    return data;
  }

  // Property methods
  async getUserProperties(
    userId: string,
    opts?: { limit?: number; offset?: number }
  ): Promise<Property[]> {
    const limit = Math.max(1, Math.min(opts?.limit ?? 20, 200));
    const offset = Math.max(0, opts?.offset ?? 0);
    const to = offset + limit - 1;
    // First get the user's profile to determine their role
    const profile = await this.getProfile(userId);
    if (!profile) {
      throw new Error('User profile not found');
    }

    if (profile.role === 'landlord') {
      // Get properties owned by landlord
      const { data, error } = await this.client
        .from('properties')
        .select('*')
        .eq('landlord_id', profile.id)
        .order('created_at', { ascending: false })
        .range(offset, to);

      if (error) {
        throw new Error(`Failed to get landlord properties: ${error.message}`);
      }

      return data || [];
    } else if (profile.role === 'tenant') {
      // Get properties linked to tenant
      const { data, error } = await this.client
        .from('properties')
        .select(`
          *,
          tenant_property_links!inner (
            tenant_id,
            is_active
          )
        `)
        .eq('tenant_property_links.tenant_id', profile.id)
        .eq('tenant_property_links.is_active', true)
        .range(offset, to);

      if (error) {
        throw new Error(`Failed to get tenant properties: ${error.message}`);
      }

      return data || [];
    }

    return [];
  }

  // Maintenance request methods
  async getMaintenanceRequests(userId: string): Promise<MaintenanceRequest[]> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      throw new Error('User profile not found');
    }

    let query = this.client
      .from('maintenance_requests')
      .select(`
        *,
        profiles!tenant_id (
          name,
          email
        ),
        properties (
          name,
          address
        )
      `)
      .order('created_at', { ascending: false });

    if (profile.role === 'tenant') {
      query = query.eq('tenant_id', profile.id);
    } else if (profile.role === 'landlord') {
      // Get requests for landlord's properties
      const properties = await this.getUserProperties(userId);
      const propertyIds = properties.map(p => p.id);
      
      if (propertyIds.length === 0) {
        return [];
      }
      
      query = query.in('property_id', propertyIds);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get maintenance requests: ${error.message}`);
    }

    return data || [];
  }

  async createMaintenanceRequest(requestData: {
    tenantId: string;
    propertyId: string;
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    area: string;
    asset: string;
    issueType: string;
    images?: string[];
    voiceNotes?: string[];
  }): Promise<MaintenanceRequest> {
    log.info('=== MAINTENANCE REQUEST CREATION DEBUG ===');
    log.info('Request data:', {
      tenant_id: requestData.tenantId,
      property_id: requestData.propertyId,
      title: requestData.title,
      description: requestData.description,
      priority: requestData.priority,
      area: requestData.area,
      asset: requestData.asset,
      issue_type: requestData.issueType,
    });
    
    // Test JWT context by querying auth functions
    try {
      const jwtTest = await this.client.rpc('test_jwt_context');
      log.info('JWT context test result:', jwtTest);
    } catch (jwtError) {
      log.warn("JWT test failed (expected if function doesn't exist):", jwtError);
    }
    
    const { data, error } = await this.client
      .from('maintenance_requests')
      .insert({
        tenant_id: requestData.tenantId,
        property_id: requestData.propertyId,
        title: requestData.title,
        description: requestData.description,
        priority: requestData.priority,
        area: requestData.area,
        asset: requestData.asset,
        issue_type: requestData.issueType,
        images: requestData.images || null,
        voice_notes: requestData.voiceNotes || null,
        status: 'submitted',
      })
      .select()
      .single();

    if (error) {
      log.error('=== SUPABASE INSERT ERROR ===');
      log.error('Error details:', error);
      log.error('Error message:', error.message);
      log.error('Error code:', error.code);
      log.error('Error hint:', error.hint);
      throw new Error(`Failed to create maintenance request: ${error.message}`);
    }
    
    log.info('=== SUPABASE INSERT SUCCESS ===');
    log.info('Created maintenance request:', data);

    return data;
  }

  async updateMaintenanceRequest(
    requestId: string,
    updates: Partial<MaintenanceRequest>
  ): Promise<MaintenanceRequest> {
    console.log('[SupabaseClient] updateMaintenanceRequest called', { requestId, updates });

    const { data, error } = await this.client
      .from('maintenance_requests')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single();

    console.log('[SupabaseClient] updateMaintenanceRequest result', { data, error });

    if (error) {
      throw new Error(`Failed to update maintenance request: ${error.message}`);
    }

    return data;
  }

  // Message methods
  async getMessages(userId: string, otherUserId?: string): Promise<Message[]> {
    const profile = await this.getProfile(userId);
    if (!profile) {
      throw new Error('User profile not found');
    }

    let query = this.client
      .from('messages')
      .select(`
        *,
        sender:profiles!sender_id (
          name,
          email
        ),
        recipient:profiles!recipient_id (
          name,
          email
        )
      `)
      .order('created_at', { ascending: true });

    if (otherUserId) {
      // Get conversation between two users
      const otherProfile = await this.getProfile(otherUserId);
      if (!otherProfile) {
        throw new Error('Other user profile not found');
      }

      query = query.or(`and(sender_id.eq.${profile.id},recipient_id.eq.${otherProfile.id}),and(sender_id.eq.${otherProfile.id},recipient_id.eq.${profile.id})`);
    } else {
      // Get all messages for user
      query = query.or(`sender_id.eq.${profile.id},recipient_id.eq.${profile.id}`);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get messages: ${error.message}`);
    }

    return data || [];
  }

  async sendMessage(messageData: {
    senderId: string;
    recipientId: string;
    content: string;
    messageType?: 'text' | 'image' | 'file';
    attachmentUrl?: string;
    propertyId?: string;
  }): Promise<Message> {
    // Use the IDs directly - the foreign key constraints will validate they exist
    // This avoids RLS issues where a user can't read another user's profile
    const { data, error } = await this.client
      .from('messages')
      .insert({
        sender_id: messageData.senderId,
        recipient_id: messageData.recipientId,
        content: messageData.content,
        message_type: messageData.messageType || 'text',
        attachment_url: messageData.attachmentUrl || null,
        property_id: messageData.propertyId || null,
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to send message: ${error.message}`);
    }

    return data;
  }

  // Real-time subscriptions
  subscribeToMaintenanceRequests(userId: string, callback: (payload: RealtimePostgresChangesPayload<MaintenanceRequest>) => void) {
    return this.client
      .channel('maintenance_requests')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_requests'
        },
        callback
      )
      .subscribe();
  }

  subscribeToMessages(userId: string, callback: (payload: RealtimePostgresChangesPayload<Message>) => void) {
    return this.client
      .channel('messages')
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        callback
      )
      .subscribe();
  }
}

export const supabaseClient = new SupabaseClient();
