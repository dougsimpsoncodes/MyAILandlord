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
      device_tokens: {
        Row: {
          created_at: string | null
          device_type: string
          id: string
          is_active: boolean | null
          push_token: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_type: string
          id?: string
          is_active?: boolean | null
          push_token: string
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string | null
          device_type?: string
          id?: string
          is_active?: boolean | null
          push_token?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "device_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          delivery_method: string
          expires_at: string
          id: string
          intended_email: string | null
          last_validation_attempt: string | null
          property_id: string
          token_hash: string
          token_salt: string
          validation_attempts: number
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by: string
          deleted_at?: string | null
          delivery_method: string
          expires_at?: string
          id?: string
          intended_email?: string | null
          last_validation_attempt?: string | null
          property_id: string
          token_hash: string
          token_salt: string
          validation_attempts?: number
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          delivery_method?: string
          expires_at?: string
          id?: string
          intended_email?: string | null
          last_validation_attempt?: string | null
          property_id?: string
          token_hash?: string
          token_salt?: string
          validation_attempts?: number
        }
        Relationships: [
          {
            foreignKeyName: "invites_property_id_fkey"
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
          onboarding_completed: boolean | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          id?: string
          name?: string | null
          onboarding_completed?: boolean | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          onboarding_completed?: boolean | null
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
          invite_code_created_at: string | null
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
          invite_code_created_at?: string | null
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
          invite_code_created_at?: string | null
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
      rate_limits: {
        Row: {
          created_at: string
          id: string
          last_refill: string
          limiter_key: string
          max_tokens: number
          refill_rate: number
          tokens: number
          updated_at: string
          window_seconds: number
        }
        Insert: {
          created_at?: string
          id?: string
          last_refill?: string
          limiter_key: string
          max_tokens?: number
          refill_rate?: number
          tokens?: number
          updated_at?: string
          window_seconds?: number
        }
        Update: {
          created_at?: string
          id?: string
          last_refill?: string
          limiter_key?: string
          max_tokens?: number
          refill_rate?: number
          tokens?: number
          updated_at?: string
          window_seconds?: number
        }
        Relationships: []
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
          landlord_id: string | null
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
          landlord_id?: string | null
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
          landlord_id?: string | null
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
            foreignKeyName: "tenant_property_links_landlord_id_fkey"
            columns: ["landlord_id"]
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
      accept_invite: {
        Args: { p_token: string }
        Returns: {
          out_error: string
          out_property_id: string
          out_property_name: string
          out_status: string
          success: boolean
        }[]
      }
      address_text_from_jsonb: {
        Args: { j: Json; unit?: string }
        Returns: string
      }
      auth_uid_compat: { Args: never; Returns: string }
      check_rate_limit: {
        Args: {
          p_limiter_key: string
          p_max_tokens?: number
          p_refill_rate?: number
          p_window_seconds?: number
        }
        Returns: Json
      }
      cleanup_old_invites: { Args: never; Returns: number }
      cleanup_rate_limits: { Args: never; Returns: Json }
      create_invite: {
        Args: {
          p_delivery_method: string
          p_intended_email?: string
          p_property_id: string
        }
        Returns: {
          expires_at: string
          invite_id: string
          token: string
        }[]
      }
      create_test_user_if_not_exists: {
        Args: {
          p_email: string
          p_name: string
          p_password: string
          p_role: string
        }
        Returns: string
      }
      generate_property_code: { Args: never; Returns: string }
      get_auth_jwt_sub: { Args: never; Returns: string }
      get_current_user_profile: { Args: never; Returns: Json }
      get_onboarding_status: {
        Args: never
        Returns: {
          has_properties: boolean
          has_property_links: boolean
          onboarding_completed: boolean
          role: string
          user_id: string
        }[]
      }
      link_tenant_to_property: {
        Args: { input_code: string; tenant_id: string; unit_number?: string }
        Returns: {
          error_message: string
          link_id: string
          success: boolean
        }[]
      }
      set_app_user_id:
        | { Args: { p_user_id: string }; Returns: undefined }
        | { Args: { user_id: string }; Returns: undefined }
      set_current_user_id: { Args: { user_id: string }; Returns: undefined }
      signup_and_accept_invite: {
        Args: { p_name?: string; p_token: string }
        Returns: {
          error_message: string
          profile_id: string
          property_id: string
          property_name: string
          status: string
          success: boolean
        }[]
      }
      signup_and_onboard_landlord: {
        Args: {
          p_address_jsonb: Json
          p_areas?: string[]
          p_bathrooms?: number
          p_bedrooms?: number
          p_property_name: string
          p_property_type?: string
        }
        Returns: {
          error_message: string
          profile_id: string
          property_id: string
          success: boolean
        }[]
      }
      validate_invite: {
        Args: { p_token: string }
        Returns: {
          expires_at: string
          invite_id: string
          landlord_name: string
          property_address: string
          property_id: string
          property_name: string
          property_unit: string
          valid: boolean
        }[]
      }
      validate_property_code: {
        Args: { input_code: string; tenant_id: string }
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
      request_status:
        | "submitted"
        | "pending"
        | "in_progress"
        | "completed"
        | "cancelled"
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
      request_status: [
        "submitted",
        "pending",
        "in_progress",
        "completed",
        "cancelled",
      ],
      user_role: ["landlord", "tenant"],
    },
  },
} as const
