import { supabase } from './config';
import { Database } from './types';
import { SupabaseClient as SupabaseClientType } from '@supabase/supabase-js';

type Profile = Database['public']['Tables']['profiles']['Row'];
type MaintenanceRequest = Database['public']['Tables']['maintenance_requests']['Row'];
type Property = Database['public']['Tables']['properties']['Row'];
type Message = Database['public']['Tables']['messages']['Row'];
type Announcement = Database['public']['Tables']['announcements']['Row'];

export class SupabaseClient {
  private client: SupabaseClientType<Database>;

  constructor(client?: SupabaseClientType<Database>) {
    this.client = client || supabase;
  }

  // Method to update the client with an authenticated instance
  setAuthenticatedClient(authenticatedClient: SupabaseClientType<Database>) {
    this.client = authenticatedClient;
  }

  // Profile methods
  async getProfile(clerkUserId: string): Promise<Profile | null> {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('clerk_user_id', clerkUserId)
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
    clerkUserId: string;
    email: string;
    name?: string;
    avatarUrl?: string;
    role?: 'tenant' | 'landlord';
  }): Promise<Profile> {
    const { data, error } = await this.client
      .from('profiles')
      .insert({
        clerk_user_id: profileData.clerkUserId, // Explicitly set clerk_user_id
        email: profileData.email,
        name: profileData.name || null,
        avatar_url: profileData.avatarUrl || null,
        role: profileData.role || null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create profile: ${error.message}`);
    }

    return data;
  }

  async updateProfile(clerkUserId: string, updates: {
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
      .eq('clerk_user_id', clerkUserId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update profile: ${error.message}`);
    }

    return data;
  }

  // Property methods
  async getUserProperties(clerkUserId: string): Promise<Property[]> {
    // First get the user's profile to determine their role
    const profile = await this.getProfile(clerkUserId);
    if (!profile) {
      throw new Error('User profile not found');
    }

    if (profile.role === 'landlord') {
      // Get properties owned by landlord
      const { data, error } = await this.client
        .from('properties')
        .select('*')
        .eq('landlord_id', profile.id)
        .order('created_at', { ascending: false });

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
        .eq('tenant_property_links.is_active', true);

      if (error) {
        throw new Error(`Failed to get tenant properties: ${error.message}`);
      }

      return data || [];
    }

    return [];
  }

  // Maintenance request methods
  async getMaintenanceRequests(clerkUserId: string): Promise<MaintenanceRequest[]> {
    const profile = await this.getProfile(clerkUserId);
    if (!profile) {
      throw new Error('User profile not found');
    }

    let query = supabase
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
      const properties = await this.getUserProperties(clerkUserId);
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
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create maintenance request: ${error.message}`);
    }

    return data;
  }

  async updateMaintenanceRequest(
    requestId: string,
    updates: Partial<MaintenanceRequest>
  ): Promise<MaintenanceRequest> {
    const { data, error } = await this.client
      .from('maintenance_requests')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update maintenance request: ${error.message}`);
    }

    return data;
  }

  // Message methods
  async getMessages(clerkUserId: string, otherUserId?: string): Promise<Message[]> {
    const profile = await this.getProfile(clerkUserId);
    if (!profile) {
      throw new Error('User profile not found');
    }

    let query = supabase
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
    senderClerkId: string;
    recipientClerkId: string;
    content: string;
    messageType?: 'text' | 'image' | 'file';
    attachmentUrl?: string;
    propertyId?: string;
  }): Promise<Message> {
    const senderProfile = await this.getProfile(messageData.senderClerkId);
    const recipientProfile = await this.getProfile(messageData.recipientClerkId);

    if (!senderProfile || !recipientProfile) {
      throw new Error('Sender or recipient profile not found');
    }

    const { data, error } = await this.client
      .from('messages')
      .insert({
        sender_id: senderProfile.id,
        recipient_id: recipientProfile.id,
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
  subscribeToMaintenanceRequests(clerkUserId: string, callback: (payload: any) => void) {
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

  subscribeToMessages(clerkUserId: string, callback: (payload: any) => void) {
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