export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          clerk_user_id: string;
          email: string;
          name: string | null;
          avatar_url: string | null;
          role: 'tenant' | 'landlord' | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          clerk_user_id: string;
          email: string;
          name?: string | null;
          avatar_url?: string | null;
          role?: 'tenant' | 'landlord' | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          clerk_user_id?: string;
          email?: string;
          name?: string | null;
          avatar_url?: string | null;
          role?: 'tenant' | 'landlord' | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      properties: {
        Row: {
          id: string;
          landlord_id: string;
          name: string;
          address: string;
          description: string | null;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          landlord_id: string;
          name: string;
          address: string;
          description?: string | null;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          landlord_id?: string;
          name?: string;
          address?: string;
          description?: string | null;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      tenant_property_links: {
        Row: {
          id: string;
          tenant_id: string;
          property_id: string;
          unit_number: string | null;
          lease_start_date: string | null;
          lease_end_date: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          property_id: string;
          unit_number?: string | null;
          lease_start_date?: string | null;
          lease_end_date?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          property_id?: string;
          unit_number?: string | null;
          lease_start_date?: string | null;
          lease_end_date?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      maintenance_requests: {
        Row: {
          id: string;
          tenant_id: string;
          property_id: string;
          title: string;
          description: string;
          priority: 'low' | 'medium' | 'high' | 'urgent';
          status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          area: string;
          asset: string;
          issue_type: string;
          images: string[] | null;
          voice_notes: string[] | null;
          estimated_cost: number | null;
          actual_cost: number | null;
          assigned_vendor_email: string | null;
          vendor_notes: string | null;
          completion_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          property_id: string;
          title: string;
          description: string;
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          area: string;
          asset: string;
          issue_type: string;
          images?: string[] | null;
          voice_notes?: string[] | null;
          estimated_cost?: number | null;
          actual_cost?: number | null;
          assigned_vendor_email?: string | null;
          vendor_notes?: string | null;
          completion_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          property_id?: string;
          title?: string;
          description?: string;
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
          area?: string;
          asset?: string;
          issue_type?: string;
          images?: string[] | null;
          voice_notes?: string[] | null;
          estimated_cost?: number | null;
          actual_cost?: number | null;
          assigned_vendor_email?: string | null;
          vendor_notes?: string | null;
          completion_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          sender_id: string;
          recipient_id: string;
          property_id: string | null;
          content: string;
          message_type: 'text' | 'image' | 'file';
          attachment_url: string | null;
          is_read: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          recipient_id: string;
          property_id?: string | null;
          content: string;
          message_type?: 'text' | 'image' | 'file';
          attachment_url?: string | null;
          is_read?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          sender_id?: string;
          recipient_id?: string;
          property_id?: string | null;
          content?: string;
          message_type?: 'text' | 'image' | 'file';
          attachment_url?: string | null;
          is_read?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      announcements: {
        Row: {
          id: string;
          landlord_id: string;
          property_id: string | null;
          title: string;
          content: string;
          priority: 'low' | 'medium' | 'high';
          is_published: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          landlord_id: string;
          property_id?: string | null;
          title: string;
          content: string;
          priority?: 'low' | 'medium' | 'high';
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          landlord_id?: string;
          property_id?: string | null;
          title?: string;
          content?: string;
          priority?: 'low' | 'medium' | 'high';
          is_published?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: 'tenant' | 'landlord';
      request_priority: 'low' | 'medium' | 'high' | 'urgent';
      request_status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
      message_type: 'text' | 'image' | 'file';
      announcement_priority: 'low' | 'medium' | 'high';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};