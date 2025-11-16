import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Database helper for Playwright E2E tests
 * Provides utilities for Supabase database operations and cleanup
 */

export class DatabaseHelper {
  private supabase: SupabaseClient | null = null;

  constructor() {
    this.initializeSupabase();
  }

  /**
   * Initialize Supabase client
   */
  private initializeSupabase(): void {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase credentials not found in environment variables');
      return;
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Check if Supabase is available
   */
  isAvailable(): boolean {
    return this.supabase !== null;
  }

  /**
   * Clean up test data for a specific user
   * @param userId - Supabase auth user ID
   */
  async cleanupUserData(userId: string): Promise<boolean> {
    if (!this.supabase) {
      console.warn('Supabase not initialized');
      return false;
    }

    try {
      // Delete maintenance requests
      await this.supabase
        .from('maintenance_requests')
        .delete()
        .eq('tenant_id', userId);

      // Delete properties
      await this.supabase
        .from('properties')
        .delete()
        .eq('landlord_id', userId);

      // Delete property invites
      await this.supabase
        .from('property_invites')
        .delete()
        .eq('invited_by', userId);

      // Delete profile
      await this.supabase
        .from('profiles')
        .delete()
        .eq('id', userId);

      return true;
    } catch (error) {
      console.error('Failed to cleanup user data:', error);
      return false;
    }
  }

  /**
   * Create a test profile
   * @param userId - Supabase auth user ID
   * @param role - User role
   * @param name - User name
   */
  async createTestProfile(userId: string, role: 'tenant' | 'landlord', name: string, email: string): Promise<boolean> {
    if (!this.supabase) return false;

    try {
      const { error } = await this.supabase
        .from('profiles')
        .insert({
          id: userId,
          role,
          name,
          email,
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Failed to create test profile:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to create test profile:', error);
      return false;
    }
  }

  /**
   * Create a test property
   * @param landlordId - Landlord's Supabase user ID
   * @param propertyData - Property information
   */
  async createTestProperty(landlordId: string, propertyData: {
    address: string;
    city: string;
    state: string;
    zip: string;
    unit_count?: number;
  }): Promise<string | null> {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from('properties')
        .insert({
          landlord_id: landlordId,
          ...propertyData,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error || !data) {
        console.error('Failed to create test property:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Failed to create test property:', error);
      return null;
    }
  }

  /**
   * Create a test maintenance request
   * @param tenantId - Tenant's Supabase user ID
   * @param propertyId - Property ID
   * @param requestData - Maintenance request information
   */
  async createTestMaintenanceRequest(tenantId: string, propertyId: string, requestData: {
    issue_type: string;
    description: string;
    area?: string;
    priority?: string;
  }): Promise<string | null> {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from('maintenance_requests')
        .insert({
          tenant_id: tenantId,
          property_id: propertyId,
          status: 'new',
          ...requestData,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error || !data) {
        console.error('Failed to create test maintenance request:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Failed to create test maintenance request:', error);
      return null;
    }
  }

  /**
   * Get user profile
   * @param userId - Supabase user ID
   */
  async getUserProfile(userId: string): Promise<any | null> {
    if (!this.supabase) return null;

    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Failed to get user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  /**
   * Get maintenance requests for a user
   * @param userId - Supabase user ID
   * @param role - User role (tenant or landlord)
   */
  async getMaintenanceRequests(userId: string, role: 'tenant' | 'landlord'): Promise<any[]> {
    if (!this.supabase) return [];

    try {
      const query = this.supabase
        .from('maintenance_requests')
        .select('*');

      if (role === 'tenant') {
        query.eq('tenant_id', userId);
      } else {
        // For landlord, join with properties
        query.eq('properties.landlord_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to get maintenance requests:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get maintenance requests:', error);
      return [];
    }
  }

  /**
   * Subscribe to real-time changes for testing
   * @param table - Table name
   * @param callback - Callback function for changes
   */
  subscribeToChanges(table: string, callback: (payload: any) => void): (() => void) | null {
    if (!this.supabase) return null;

    try {
      const subscription = this.supabase
        .channel(`test-${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('Failed to subscribe to changes:', error);
      return null;
    }
  }

  /**
   * Clean up all test data (use with caution)
   */
  async cleanupAllTestData(): Promise<boolean> {
    if (!this.supabase) return false;

    try {
      // Delete test maintenance requests
      await this.supabase
        .from('maintenance_requests')
        .delete()
        .like('description', '%test%');

      // Delete test properties
      await this.supabase
        .from('properties')
        .delete()
        .like('address', '%test%');

      // Delete test profiles
      await this.supabase
        .from('profiles')
        .delete()
        .like('email', '%test%');

      return true;
    } catch (error) {
      console.error('Failed to cleanup all test data:', error);
      return false;
    }
  }

  /**
   * Verify RLS policies are working
   * @param userId - Supabase user ID
   */
  async verifyRLSPolicies(userId: string): Promise<{ working: boolean; errors: string[] }> {
    if (!this.supabase) {
      return { working: false, errors: ['Supabase not initialized'] };
    }

    const errors: string[] = [];

    try {
      // Test 1: Try to access another user's data (should fail)
      const { data: otherUserData } = await this.supabase
        .from('profiles')
        .select('*')
        .neq('id', userId)
        .limit(1);

      if (otherUserData && otherUserData.length > 0) {
        errors.push('RLS policy allows access to other users data');
      }

      // Test 2: Try to insert without proper authentication (should fail)
      const { error: insertError } = await this.supabase
        .from('maintenance_requests')
        .insert({
          tenant_id: userId,
          property_id: 'test-property-id',
          issue_type: 'test',
          description: 'RLS test',
        });

      // If no error, RLS might not be working properly
      if (!insertError) {
        errors.push('RLS policy allows unauthorized inserts');
      }

      return { working: errors.length === 0, errors };
    } catch (error) {
      return { working: false, errors: [String(error)] };
    }
  }
}

/**
 * Test data factory for database operations
 */
export class DatabaseTestData {
  /**
   * Generate test property data
   */
  static generatePropertyData(): {
    address: string;
    city: string;
    state: string;
    zip: string;
    unit_count: number;
  } {
    const random = Math.random().toString(36).substring(7);
    return {
      address: `${Math.floor(Math.random() * 9999)} Test St ${random}`,
      city: 'Test City',
      state: 'CA',
      zip: '90210',
      unit_count: 1,
    };
  }

  /**
   * Generate test maintenance request data
   */
  static generateMaintenanceRequestData(): {
    issue_type: string;
    description: string;
    area: string;
    priority: string;
  } {
    const issueTypes = ['plumbing', 'electrical', 'hvac', 'appliance', 'other'];
    const areas = ['kitchen', 'bathroom', 'bedroom', 'living room', 'exterior'];
    const priorities = ['low', 'medium', 'high', 'urgent'];

    return {
      issue_type: issueTypes[Math.floor(Math.random() * issueTypes.length)],
      description: `Test maintenance request ${Math.random().toString(36).substring(7)}`,
      area: areas[Math.floor(Math.random() * areas.length)],
      priority: priorities[Math.floor(Math.random() * priorities.length)],
    };
  }
}
