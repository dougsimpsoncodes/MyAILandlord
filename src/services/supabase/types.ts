export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_published: boolean | null
          landlord_id: string
          priority: Database["public"]["Enums"]["announcement_priority"] | null
          property_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          landlord_id: string
          priority?: Database["public"]["Enums"]["announcement_priority"] | null
          property_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          landlord_id?: string
          priority?: Database["public"]["Enums"]["announcement_priority"] | null
          property_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_requests: {
        Row: {
          actual_cost: number | null
          area: string
          asset: string
          assigned_vendor_email: string | null
          completion_notes: string | null
          created_at: string | null
          description: string
          estimated_cost: number | null
          id: string
          images: string[] | null
          issue_type: string
          priority: Database["public"]["Enums"]["request_priority"] | null
          property_id: string
          status: Database["public"]["Enums"]["request_status"] | null
          tenant_id: string
          title: string
          updated_at: string | null
          vendor_notes: string | null
          voice_notes: string[] | null
        }
        Insert: {
          actual_cost?: number | null
          area: string
          asset: string
          assigned_vendor_email?: string | null
          completion_notes?: string | null
          created_at?: string | null
          description: string
          estimated_cost?: number | null
          id?: string
          images?: string[] | null
          issue_type: string
          priority?: Database["public"]["Enums"]["request_priority"] | null
          property_id: string
          status?: Database["public"]["Enums"]["request_status"] | null
          tenant_id: string
          title: string
          updated_at?: string | null
          vendor_notes?: string | null
          voice_notes?: string[] | null
        }
        Update: {
          actual_cost?: number | null
          area?: string
          asset?: string
          assigned_vendor_email?: string | null
          completion_notes?: string | null
          created_at?: string | null
          description?: string
          estimated_cost?: number | null
          id?: string
          images?: string[] | null
          issue_type?: string
          priority?: Database["public"]["Enums"]["request_priority"] | null
          property_id?: string
          status?: Database["public"]["Enums"]["request_status"] | null
          tenant_id?: string
          title?: string
          updated_at?: string | null
          vendor_notes?: string | null
          voice_notes?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_url: string | null
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          message_type: Database["public"]["Enums"]["message_type"] | null
          property_id: string | null
          recipient_id: string
          sender_id: string
          updated_at: string | null
        }
        Insert: {
          attachment_url?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_type?: Database["public"]["Enums"]["message_type"] | null
          property_id?: string | null
          recipient_id: string
          sender_id: string
          updated_at?: string | null
        }
        Update: {
          attachment_url?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message_type?: Database["public"]["Enums"]["message_type"] | null
          property_id?: string | null
          recipient_id?: string
          sender_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          name: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id?: string
          name?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string | null
          address_jsonb: Json | null
          allow_tenant_signup: boolean | null
          bathrooms: number | null
          bedrooms: number | null
          code_expires_at: string | null
          created_at: string | null
          description: string | null
          emergency_contact: string | null
          emergency_phone: string | null
          id: string
          image_url: string | null
          landlord_id: string | null
          name: string
          onboarding_message: string | null
          property_code: string | null
          property_type: string | null
          unit: string | null
          updated_at: string | null
          user_id: string
          wifi_network: string | null
          wifi_password: string | null
        }
        Insert: {
          address?: string | null
          address_jsonb?: Json | null
          allow_tenant_signup?: boolean | null
          bathrooms?: number | null
          bedrooms?: number | null
          code_expires_at?: string | null
          created_at?: string | null
          description?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          id?: string
          image_url?: string | null
          landlord_id?: string | null
          name: string
          onboarding_message?: string | null
          property_code?: string | null
          property_type?: string | null
          unit?: string | null
          updated_at?: string | null
          user_id?: string
          wifi_network?: string | null
          wifi_password?: string | null
        }
        Update: {
          address?: string | null
          address_jsonb?: Json | null
          allow_tenant_signup?: boolean | null
          bathrooms?: number | null
          bedrooms?: number | null
          code_expires_at?: string | null
          created_at?: string | null
          description?: string | null
          emergency_contact?: string | null
          emergency_phone?: string | null
          id?: string
          image_url?: string | null
          landlord_id?: string | null
          name?: string
          onboarding_message?: string | null
          property_code?: string | null
          property_type?: string | null
          unit?: string | null
          updated_at?: string | null
          user_id?: string
          wifi_network?: string | null
          wifi_password?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "properties_landlord_id_fkey"
            columns: ["landlord_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      property_areas: {
        Row: {
          area_type: string
          condition: string | null
          created_at: string | null
          icon_name: string | null
          id: string
          inventory_complete: boolean | null
          is_default: boolean | null
          name: string
          photos: string[] | null
          property_id: string
          updated_at: string | null
        }
        Insert: {
          area_type: string
          condition?: string | null
          created_at?: string | null
          icon_name?: string | null
          id?: string
          inventory_complete?: boolean | null
          is_default?: boolean | null
          name: string
          photos?: string[] | null
          property_id: string
          updated_at?: string | null
        }
        Update: {
          area_type?: string
          condition?: string | null
          created_at?: string | null
          icon_name?: string | null
          id?: string
          inventory_complete?: boolean | null
          is_default?: boolean | null
          name?: string
          photos?: string[] | null
          property_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_areas_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      property_assets: {
        Row: {
          area_id: string
          asset_type: string
          brand: string | null
          category: string
          condition: string | null
          created_at: string | null
          current_value: number | null
          id: string
          installation_date: string | null
          is_active: boolean | null
          manual_url: string | null
          model: string | null
          name: string
          notes: string | null
          photos: string[] | null
          property_id: string
          purchase_price: number | null
          serial_number: string | null
          subcategory: string | null
          updated_at: string | null
          warranty_end_date: string | null
          warranty_provider: string | null
          warranty_start_date: string | null
        }
        Insert: {
          area_id: string
          asset_type: string
          brand?: string | null
          category: string
          condition?: string | null
          created_at?: string | null
          current_value?: number | null
          id?: string
          installation_date?: string | null
          is_active?: boolean | null
          manual_url?: string | null
          model?: string | null
          name: string
          notes?: string | null
          photos?: string[] | null
          property_id: string
          purchase_price?: number | null
          serial_number?: string | null
          subcategory?: string | null
          updated_at?: string | null
          warranty_end_date?: string | null
          warranty_provider?: string | null
          warranty_start_date?: string | null
        }
        Update: {
          area_id?: string
          asset_type?: string
          brand?: string | null
          category?: string
          condition?: string | null
          created_at?: string | null
          current_value?: number | null
          id?: string
          installation_date?: string | null
          is_active?: boolean | null
          manual_url?: string | null
          model?: string | null
          name?: string
          notes?: string | null
          photos?: string[] | null
          property_id?: string
          purchase_price?: number | null
          serial_number?: string | null
          subcategory?: string | null
          updated_at?: string | null
          warranty_end_date?: string | null
          warranty_provider?: string | null
          warranty_start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_assets_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "property_areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_assets_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_property_links: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          id: string
          invitation_status: string | null
          invited_at: string | null
          invited_by: string | null
          is_active: boolean | null
          lease_end_date: string | null
          lease_start_date: string | null
          property_id: string
          tenant_id: string
          unit_number: string | null
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          invitation_status?: string | null
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          lease_end_date?: string | null
          lease_start_date?: string | null
          property_id: string
          tenant_id: string
          unit_number?: string | null
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          invitation_status?: string | null
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean | null
          lease_end_date?: string | null
          lease_start_date?: string | null
          property_id?: string
          tenant_id?: string
          unit_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_property_links_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_property_links_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_property_links_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      address_text_from_jsonb: {
        Args: { j: Json; unit?: string }
        Returns: string
      }
      auth_uid_compat: { Args: never; Returns: string }
      clerk_id_to_uuid: { Args: { clerk_id: string }; Returns: string }
      generate_property_code: { Args: never; Returns: string }
      get_auth_jwt_sub: { Args: never; Returns: string }
      get_current_user_profile: { Args: never; Returns: Json }
      link_tenant_to_property: {
        Args: {
          input_code: string
          tenant_clerk_id: string
          unit_number?: string
        }
        Returns: {
          error_message: string
          link_id: string
          success: boolean
        }[]
      }
      set_app_user_id: { Args: { user_id: string }; Returns: undefined }
      set_current_user_id: { Args: { user_id: string }; Returns: undefined }
      validate_property_code: {
        Args: { input_code: string; tenant_clerk_id: string }
        Returns: {
          error_message: string
          is_multi_unit: boolean
          property_address: string
          property_id: string
          property_name: string
          success: boolean
          wifi_network: string
          wifi_password: string
        }[]
      }
    }
    Enums: {
      announcement_priority: "low" | "medium" | "high"
      message_type: "text" | "image" | "file"
      request_priority: "low" | "medium" | "high" | "urgent"
      request_status: "pending" | "in_progress" | "completed" | "cancelled"
      user_role: "landlord" | "tenant"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      announcement_priority: ["low", "medium", "high"],
      message_type: ["text", "image", "file"],
      request_priority: ["low", "medium", "high", "urgent"],
      request_status: ["pending", "in_progress", "completed", "cancelled"],
      user_role: ["landlord", "tenant"],
    },
  },
} as const
