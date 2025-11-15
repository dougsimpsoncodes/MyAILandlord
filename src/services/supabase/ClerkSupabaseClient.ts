import { SupabaseClient as SupabaseClientType, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { Database } from './types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Property = Database['public']['Tables']['properties']['Row'];
type MaintenanceRequest = Database['public']['Tables']['maintenance_requests']['Row'];

/**
 * Supabase client wrapper for Clerk-authenticated operations
 * Uses the native Clerk integration (no JWT templates)
 */
export class ClerkSupabaseClient {
  constructor(
    private client: SupabaseClientType<Database>,
    private clerkUserId: string | null
  ) {}

  // Profile methods
  async getProfile(): Promise<Profile | null> {
    if (!this.clerkUserId) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('clerk_user_id', this.clerkUserId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No profile found
        return null;
      }
      console.error('Failed to get profile:', error);
      throw error;
    }
    
    return data;
  }

  async createProfile(profileData: {
    email: string;
    name?: string;
    avatarUrl?: string;
    role?: 'tenant' | 'landlord';
  }): Promise<Profile> {
    if (!this.clerkUserId) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await this.client
      .from('profiles')
      .insert({
        clerk_user_id: this.clerkUserId,
        email: profileData.email,
        name: profileData.name || null,
        avatar_url: profileData.avatarUrl || null,
        role: profileData.role || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create profile:', error);
      throw error;
    }

    return data;
  }

  async updateProfile(updates: {
    name?: string;
    role?: 'tenant' | 'landlord';
    avatarUrl?: string;
  }): Promise<Profile> {
    if (!this.clerkUserId) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await this.client
      .from('profiles')
      .update({
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.role !== undefined && { role: updates.role }),
        ...(updates.avatarUrl !== undefined && { avatar_url: updates.avatarUrl }),
        updated_at: new Date().toISOString(),
      })
      .eq('clerk_user_id', this.clerkUserId)
      .select()
      .single();

    if (error) {
      console.error('Failed to update profile:', error);
      throw error;
    }

    return data;
  }

  // Property methods
  async createProperty(propertyData: {
    name: string;
    address?: string;
    description?: string;
    type?: 'house' | 'apartment' | 'condo' | 'townhouse' | 'other';
    bedrooms?: number;
    bathrooms?: number;
    squareFeet?: number;
    rentAmount?: number;
  }): Promise<Property> {
    if (!this.clerkUserId) {
      throw new Error('User not authenticated');
    }

    // Get profile first to get the UUID
    const profile = await this.getProfile();
    if (!profile) {
      throw new Error('Profile not found. Please create a profile first.');
    }

    const { data, error } = await this.client
      .from('properties')
      .insert({
        landlord_id: profile.id,
        landlord_clerk_id: this.clerkUserId,
        name: propertyData.name,
        address: propertyData.address || null,
        description: propertyData.description || null,
        type: propertyData.type || null,
        bedrooms: propertyData.bedrooms || null,
        bathrooms: propertyData.bathrooms || null,
        square_feet: propertyData.squareFeet || null,
        rent_amount: propertyData.rentAmount || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create property:', error);
      throw error;
    }

    return data;
  }

  async getProperties(): Promise<Property[]> {
    if (!this.clerkUserId) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await this.client
      .from('properties')
      .select('*')
      .eq('landlord_clerk_id', this.clerkUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get properties:', error);
      throw error;
    }

    return data || [];
  }

  async updateProperty(
    propertyId: string,
    updates: Partial<Property>
  ): Promise<Property> {
    if (!this.clerkUserId) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await this.client
      .from('properties')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', propertyId)
      .eq('landlord_clerk_id', this.clerkUserId) // Ensure user owns the property
      .select()
      .single();

    if (error) {
      console.error('Failed to update property:', error);
      throw error;
    }

    return data;
  }

  async deleteProperty(propertyId: string): Promise<void> {
    if (!this.clerkUserId) {
      throw new Error('User not authenticated');
    }

    const { error } = await this.client
      .from('properties')
      .delete()
      .eq('id', propertyId)
      .eq('landlord_clerk_id', this.clerkUserId); // Ensure user owns the property

    if (error) {
      console.error('Failed to delete property:', error);
      throw error;
    }
  }

  // Maintenance Request methods
  async createMaintenanceRequest(requestData: {
    propertyId: string;
    title: string;
    description?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    area?: string;
    asset?: string;
    issueType?: string;
    images?: string[];
    voiceNotes?: string[];
  }): Promise<MaintenanceRequest> {
    if (!this.clerkUserId) {
      throw new Error('User not authenticated');
    }

    const profile = await this.getProfile();
    if (!profile) {
      throw new Error('Profile not found');
    }

    const { data, error } = await this.client
      .from('maintenance_requests')
      .insert({
        tenant_id: profile.id,
        tenant_clerk_id: this.clerkUserId,
        property_id: requestData.propertyId,
        title: requestData.title,
        description: requestData.description || null,
        priority: requestData.priority || 'medium',
        area: requestData.area || null,
        asset: requestData.asset || null,
        issue_type: requestData.issueType || null,
        images: requestData.images || null,
        voice_notes: requestData.voiceNotes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create maintenance request:', error);
      throw error;
    }

    return data;
  }

  async getMaintenanceRequests(): Promise<MaintenanceRequest[]> {
    if (!this.clerkUserId) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await this.client
      .from('maintenance_requests')
      .select(`
        *,
        properties (
          name,
          address
        )
      `)
      .eq('tenant_clerk_id', this.clerkUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get maintenance requests:', error);
      throw error;
    }

    return data || [];
  }

  // Real-time subscriptions
  subscribeToMaintenanceRequests(
    callback: (payload: RealtimePostgresChangesPayload<MaintenanceRequest>) => void
  ) {
    if (!this.clerkUserId) {
      throw new Error('User not authenticated');
    }

    return this.client
      .channel(`maintenance_requests:${this.clerkUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'maintenance_requests',
          filter: `tenant_clerk_id=eq.${this.clerkUserId}`,
        },
        callback
      )
      .subscribe();
  }
}