import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Database helper for Playwright E2E tests
 * Provides utilities for Supabase database operations and cleanup
 *
 * IMPORTANT: For auth user deletion, you need SUPABASE_SERVICE_ROLE_KEY
 * Get it from: Supabase Dashboard > Settings > API > service_role key
 */

export class DatabaseHelper {
  private supabase: SupabaseClient | null = null;
  private supabaseAdmin: SupabaseClient | null = null;
  private supabaseUrl: string | undefined;

  constructor() {
    this.initializeSupabase();
  }

  /**
   * Initialize Supabase clients (regular and admin)
   */
  private initializeSupabase(): void {
    this.supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!this.supabaseUrl || !supabaseKey) {
      console.warn('Supabase credentials not found in environment variables');
      return;
    }

    // Regular client for normal operations
    this.supabase = createClient(this.supabaseUrl, supabaseKey);

    // Admin client for auth operations (requires service role key)
    if (serviceRoleKey) {
      this.supabaseAdmin = createClient(this.supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
      console.log('✓ Admin Supabase client initialized for auth operations');
    } else {
      console.warn('SUPABASE_SERVICE_ROLE_KEY not set - auth user deletion will not be available');
      console.warn('Get it from: Supabase Dashboard > Settings > API > service_role key');
    }
  }

  /**
   * Check if Supabase is available
   */
  isAvailable(): boolean {
    return this.supabase !== null;
  }

  /**
   * Check if admin operations are available
   */
  isAdminAvailable(): boolean {
    return this.supabaseAdmin !== null;
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
   * Delete an auth user by email (requires service role key)
   * @param email - User email address
   */
  async deleteAuthUserByEmail(email: string): Promise<boolean> {
    if (!this.supabaseAdmin) {
      console.warn('Admin client not available - cannot delete auth user');
      return false;
    }

    try {
      // First, find the user by email
      const { data, error: listError } = await this.supabaseAdmin.auth.admin.listUsers();

      if (listError || !data) {
        console.error('Failed to list users:', listError);
        return false;
      }

      const userList = data.users as Array<{ id: string; email?: string }>;
      const user = userList.find(u => u.email === email);
      if (!user) {
        console.log(`User with email ${email} not found - may already be deleted`);
        return true; // Consider it a success if user doesn't exist
      }

      // Delete the user
      const { error: deleteError } = await this.supabaseAdmin.auth.admin.deleteUser(user.id);

      if (deleteError) {
        console.error(`Failed to delete user ${email}:`, deleteError);
        return false;
      }

      console.log(`✓ Deleted auth user: ${email}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete auth user ${email}:`, error);
      return false;
    }
  }

  /**
   * Delete auth users matching an email pattern (requires service role key)
   * @param pattern - Email pattern to match (e.g., 'test-user-', '@example.com')
   * @param preserveEmails - List of emails to preserve (not delete)
   */
  async deleteAuthUsersByPattern(
    pattern: string,
    preserveEmails: string[] = []
  ): Promise<{ deleted: number; errors: number }> {
    if (!this.supabaseAdmin) {
      console.warn('Admin client not available - cannot delete auth users');
      return { deleted: 0, errors: 0 };
    }

    const result = { deleted: 0, errors: 0 };

    try {
      // List all users
      const { data, error: listError } = await this.supabaseAdmin.auth.admin.listUsers();

      if (listError || !data) {
        console.error('Failed to list users:', listError);
        return result;
      }

      const userList = data.users as Array<{ id: string; email?: string }>;

      // Filter users matching the pattern
      const usersToDelete = userList.filter(
        user =>
          user.email &&
          user.email.includes(pattern) &&
          !preserveEmails.includes(user.email)
      );

      console.log(`Found ${usersToDelete.length} users matching pattern "${pattern}"`);

      // Delete each matching user
      for (const user of usersToDelete) {
        try {
          const { error: deleteError } = await this.supabaseAdmin.auth.admin.deleteUser(user.id);

          if (deleteError) {
            console.error(`Failed to delete user ${user.email}:`, deleteError);
            result.errors++;
          } else {
            console.log(`✓ Deleted: ${user.email}`);
            result.deleted++;
          }
        } catch (error) {
          console.error(`Error deleting user ${user.email}:`, error);
          result.errors++;
        }
      }

      return result;
    } catch (error) {
      console.error('Failed to delete users by pattern:', error);
      return result;
    }
  }

  /**
   * Reset test environment - comprehensive cleanup of database and auth users
   * This is the recommended method to call before running E2E tests
   * @param options - Cleanup options
   */
  async resetTestEnvironment(options: {
    deleteAuthUsers?: boolean;
    emailPattern?: string;
    preserveEmails?: string[];
  } = {}): Promise<{
    success: boolean;
    authUsersDeleted: number;
    authErrors: number;
    databaseCleaned: boolean;
  }> {
    const {
      deleteAuthUsers = true,
      emailPattern = 'test-user-',
      preserveEmails = ['e2e-test@myailandlord.com'], // Preserve the main E2E test user
    } = options;

    const result = {
      success: true,
      authUsersDeleted: 0,
      authErrors: 0,
      databaseCleaned: false,
    };

    console.log('\n🧹 Starting test environment reset...');

    // Step 1: Delete auth users if enabled and admin client is available
    if (deleteAuthUsers && this.supabaseAdmin) {
      console.log('\n📧 Cleaning up auth users...');
      const authResult = await this.deleteAuthUsersByPattern(emailPattern, preserveEmails);
      result.authUsersDeleted = authResult.deleted;
      result.authErrors = authResult.errors;

      if (authResult.errors > 0) {
        result.success = false;
      }
    } else if (deleteAuthUsers && !this.supabaseAdmin) {
      console.warn('⚠️ Skipping auth user cleanup - SUPABASE_SERVICE_ROLE_KEY not configured');
    }

    // Step 2: Clean up database tables
    if (this.supabase) {
      console.log('\n🗄️ Cleaning up database tables...');

      try {
        // Delete in order respecting foreign key constraints
        // Tables based on actual schema: maintenance_requests, tenants, property_invitations, invite_links, properties, profiles

        // 1. Delete maintenance_requests first (references tenants and properties)
        await this.supabase
          .from('maintenance_requests')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        // 2. Delete tenants (links tenants to properties)
        await this.supabase
          .from('tenants')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        // 3. Delete property_invitations
        await this.supabase
          .from('property_invitations')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        // 4. Delete invite_links
        await this.supabase
          .from('invite_links')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        // 5. Delete properties
        await this.supabase
          .from('properties')
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        // 6. Delete profiles (except preserved emails)
        const { error: profileError } = await this.supabase
          .from('profiles')
          .delete()
          .not('email', 'in', `(${preserveEmails.map(e => `"${e}"`).join(',')})`);

        if (profileError) {
          console.error('Error cleaning profiles:', profileError);
        }

        result.databaseCleaned = true;
        console.log('✓ Database tables cleaned');
      } catch (error) {
        console.error('Failed to clean database:', error);
        result.success = false;
        result.databaseCleaned = false;
      }
    }

    // Summary
    console.log('\n📊 Reset Summary:');
    console.log(`   Auth users deleted: ${result.authUsersDeleted}`);
    console.log(`   Auth errors: ${result.authErrors}`);
    console.log(`   Database cleaned: ${result.databaseCleaned}`);
    console.log(`   Overall success: ${result.success}`);
    console.log('');

    return result;
  }

  /**
   * Get all auth users (useful for debugging)
   */
  async listAuthUsers(): Promise<{ id: string; email: string; created_at: string }[]> {
    if (!this.supabaseAdmin) {
      console.warn('Admin client not available');
      return [];
    }

    try {
      const { data, error } = await this.supabaseAdmin.auth.admin.listUsers();

      if (error || !data) {
        console.error('Failed to list users:', error);
        return [];
      }

      const userList = data.users as Array<{ id: string; email?: string; created_at: string }>;

      return userList.map(user => ({
        id: user.id,
        email: user.email || 'no-email',
        created_at: user.created_at,
      }));
    } catch (error) {
      console.error('Failed to list users:', error);
      return [];
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
