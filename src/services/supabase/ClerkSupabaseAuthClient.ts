import { useAuth } from '@clerk/clerk-expo';

/**
 * Clerk-Supabase authenticated client that always sends proper JWT tokens
 * Fixes 401 errors by ensuring every request has Authorization header
 */
export class ClerkSupabaseAuthClient {
  private supabaseUrl: string;
  private supabaseAnonKey: string;

  constructor() {
    this.supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
    this.supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;
    
    if (!this.supabaseUrl || !this.supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }
  }

  private async getAuthHeaders(getToken: () => Promise<string | null>) {
    const token = await getToken();
    
    return {
      'apikey': this.supabaseAnonKey,
      'Authorization': token ? `Bearer ${token}` : `Bearer ${this.supabaseAnonKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  }

  async getProfileByClerkId(getToken: () => Promise<string | null>, clerkUserId: string) {
    const headers = await this.getAuthHeaders(getToken);
    const params = new URLSearchParams({
      select: '*',
      clerk_user_id: `eq.${clerkUserId}`,
      limit: '1'
    });

    const response = await fetch(`${this.supabaseUrl}/rest/v1/profiles_api?${params.toString()}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to get profile:', { status: response.status, error });
      throw new Error(`Failed to get profile: ${response.status} ${error}`);
    }

    const data = await response.json();
    return data.length > 0 ? data[0] : null;
  }

  async createProfile(
    getToken: () => Promise<string | null>,
    profileData: {
      clerk_user_id: string;
      email: string;
      name?: string;
      avatar_url?: string;
      role?: string;
    }
  ) {
    const headers = await this.getAuthHeaders(getToken);

    const response = await fetch(`${this.supabaseUrl}/rest/v1/profiles_api`, {
      method: 'POST',
      headers,
      body: JSON.stringify(profileData)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to create profile:', { status: response.status, error });
      throw new Error(`Failed to create profile: ${response.status} ${error}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data[0] : data;
  }

  async insertProperty(
    getToken: () => Promise<string | null>,
    propertyData: {
      name: string;
      address_jsonb: any;
      property_type: string;
      unit?: string;
      bedrooms?: number;
      bathrooms?: number;
    }
  ) {
    const headers = await this.getAuthHeaders(getToken);

    // Don't send user_id - let DB default handle it via auth.uid()
    const response = await fetch(`${this.supabaseUrl}/rest/v1/properties`, {
      method: 'POST',
      headers,
      body: JSON.stringify(propertyData)
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to insert property:', { status: response.status, error });
      throw new Error(`Failed to insert property: ${response.status} ${error}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data[0] : data;
  }

  async getUserProperties(getToken: () => Promise<string | null>) {
    const headers = await this.getAuthHeaders(getToken);
    const params = new URLSearchParams({
      select: '*',
      order: 'created_at.desc'
    });

    const response = await fetch(`${this.supabaseUrl}/rest/v1/properties?${params.toString()}`, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Failed to get properties:', { status: response.status, error });
      throw new Error(`Failed to get properties: ${response.status} ${error}`);
    }

    return await response.json();
  }
}

// Hook to use the authenticated client
export function useClerkSupabaseAuth() {
  const { getToken, isSignedIn, user, isLoaded } = useAuth();
  const client = new ClerkSupabaseAuthClient();

  return {
    client,
    getToken,
    isSignedIn,
    user,
    isReady: isLoaded && isSignedIn && !!user
  };
}