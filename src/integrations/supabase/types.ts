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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      blink_api_keys: {
        Row: {
          api_key_encrypted: string
          community_id: string
          created_at: string
          id: string
          is_active: boolean
          last_used_at: string | null
          updated_at: string
        }
        Insert: {
          api_key_encrypted: string
          community_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          updated_at?: string
        }
        Update: {
          api_key_encrypted?: string
          community_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blink_api_keys_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: true
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      blink_transactions: {
        Row: {
          blink_created_at: string
          blink_tx_id: string
          community_id: string
          counterparty_wallet_id: string | null
          created_at: string
          direction: string
          id: string
          is_internal: boolean
          memo: string | null
          settlement_amount: number
          settlement_currency: string
          status: string
          wallet_id: string
        }
        Insert: {
          blink_created_at: string
          blink_tx_id: string
          community_id: string
          counterparty_wallet_id?: string | null
          created_at?: string
          direction: string
          id?: string
          is_internal?: boolean
          memo?: string | null
          settlement_amount: number
          settlement_currency?: string
          status?: string
          wallet_id: string
        }
        Update: {
          blink_created_at?: string
          blink_tx_id?: string
          community_id?: string
          counterparty_wallet_id?: string | null
          created_at?: string
          direction?: string
          id?: string
          is_internal?: boolean
          memo?: string | null
          settlement_amount?: number
          settlement_currency?: string
          status?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "blink_transactions_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blink_transactions_counterparty_wallet_id_fkey"
            columns: ["counterparty_wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blink_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      circularity_scores: {
        Row: {
          calculated_at: string
          community_id: string
          earner_rate_score: number
          growth_score: number
          id: string
          merchant_density_score: number
          retention_score: number
          score: number
          velocity_score: number
        }
        Insert: {
          calculated_at?: string
          community_id: string
          earner_rate_score?: number
          growth_score?: number
          id?: string
          merchant_density_score?: number
          retention_score?: number
          score: number
          velocity_score?: number
        }
        Update: {
          calculated_at?: string
          community_id?: string
          earner_rate_score?: number
          growth_score?: number
          id?: string
          merchant_density_score?: number
          retention_score?: number
          score?: number
          velocity_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "circularity_scores_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      communities: {
        Row: {
          admin_id: string | null
          banner_url: string | null
          bbox_east: number | null
          bbox_north: number | null
          bbox_south: number | null
          bbox_west: number | null
          btcmap_area_id: string | null
          btcmap_last_synced: string | null
          btcmap_profile_url: string | null
          city: string
          contact_email: string | null
          country: string
          country_code: string
          created_at: string
          declared_population: number
          description: string | null
          economic_zone_description: string | null
          founding_year: number | null
          id: string
          logo_url: string | null
          member_count: number
          name: string
          region: string
          slug: string
          status: Database["public"]["Enums"]["community_status"]
          twitter_handle: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          admin_id?: string | null
          banner_url?: string | null
          bbox_east?: number | null
          bbox_north?: number | null
          bbox_south?: number | null
          bbox_west?: number | null
          btcmap_area_id?: string | null
          btcmap_last_synced?: string | null
          btcmap_profile_url?: string | null
          city: string
          contact_email?: string | null
          country: string
          country_code?: string
          created_at?: string
          declared_population?: number
          description?: string | null
          economic_zone_description?: string | null
          founding_year?: number | null
          id?: string
          logo_url?: string | null
          member_count?: number
          name: string
          region?: string
          slug: string
          status?: Database["public"]["Enums"]["community_status"]
          twitter_handle?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          admin_id?: string | null
          banner_url?: string | null
          bbox_east?: number | null
          bbox_north?: number | null
          bbox_south?: number | null
          bbox_west?: number | null
          btcmap_area_id?: string | null
          btcmap_last_synced?: string | null
          btcmap_profile_url?: string | null
          city?: string
          contact_email?: string | null
          country?: string
          country_code?: string
          created_at?: string
          declared_population?: number
          description?: string | null
          economic_zone_description?: string | null
          founding_year?: number | null
          id?: string
          logo_url?: string | null
          member_count?: number
          name?: string
          region?: string
          slug?: string
          status?: Database["public"]["Enums"]["community_status"]
          twitter_handle?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      community_admins: {
        Row: {
          added_at: string
          community_id: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          added_at?: string
          community_id: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          added_at?: string
          community_id?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_admins_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_profiles: {
        Row: {
          admin_user_id: string
          banner_url: string | null
          community_id: string
          contact_email: string | null
          created_at: string
          economic_zone_description: string | null
          founding_year: number | null
          id: string
          logo_url: string | null
          twitter_handle: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          admin_user_id: string
          banner_url?: string | null
          community_id: string
          contact_email?: string | null
          created_at?: string
          economic_zone_description?: string | null
          founding_year?: number | null
          id?: string
          logo_url?: string | null
          twitter_handle?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          admin_user_id?: string
          banner_url?: string | null
          community_id?: string
          contact_email?: string | null
          created_at?: string
          economic_zone_description?: string | null
          founding_year?: number | null
          id?: string
          logo_url?: string | null
          twitter_handle?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_profiles_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: true
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      earners: {
        Row: {
          community_id: string
          created_at: string
          description: string
          earning_method: string | null
          id: string
          payment_method: string | null
          status: Database["public"]["Enums"]["submission_status"]
          submitted_by: string | null
        }
        Insert: {
          community_id: string
          created_at?: string
          description: string
          earning_method?: string | null
          id?: string
          payment_method?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_by?: string | null
        }
        Update: {
          community_id?: string
          created_at?: string
          description?: string
          earning_method?: string | null
          id?: string
          payment_method?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "earners_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          address: string | null
          approved_at: string | null
          btcmap_id: string | null
          category: string
          community_id: string
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          name: string
          payment_methods: string[]
          source: string | null
          status: Database["public"]["Enums"]["submission_status"]
          submitted_by: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          approved_at?: string | null
          btcmap_id?: string | null
          category?: string
          community_id: string
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          payment_methods?: string[]
          source?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_by?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          approved_at?: string | null
          btcmap_id?: string | null
          category?: string
          community_id?: string
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          payment_methods?: string[]
          source?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_by?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "merchants_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          is_super_admin: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_super_admin?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_super_admin?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      proofs: {
        Row: {
          amount_sats: number | null
          community_id: string | null
          created_at: string | null
          description: string | null
          id: string
          is_circular: boolean | null
          media_url: string | null
          merchant_name: string | null
          proof_type: string
          status: string | null
          submitted_by: string | null
          title: string
        }
        Insert: {
          amount_sats?: number | null
          community_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_circular?: boolean | null
          media_url?: string | null
          merchant_name?: string | null
          proof_type: string
          status?: string | null
          submitted_by?: string | null
          title: string
        }
        Update: {
          amount_sats?: number | null
          community_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_circular?: boolean | null
          media_url?: string | null
          merchant_name?: string | null
          proof_type?: string
          status?: string | null
          submitted_by?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "proofs_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount_sats: number
          category: string
          community_id: string
          created_at: string
          id: string
          is_circular: boolean
          status: Database["public"]["Enums"]["submission_status"]
          submitted_by: string | null
          transaction_date: string
        }
        Insert: {
          amount_sats: number
          category?: string
          community_id: string
          created_at?: string
          id?: string
          is_circular?: boolean
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_by?: string | null
          transaction_date?: string
        }
        Update: {
          amount_sats?: number
          category?: string
          community_id?: string
          created_at?: string
          id?: string
          is_circular?: boolean
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_by?: string | null
          transaction_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      validation_votes: {
        Row: {
          id: string
          note: string | null
          submission_id: string
          submission_type: string
          validator_id: string
          vote: Database["public"]["Enums"]["vote_type"]
          voted_at: string
        }
        Insert: {
          id?: string
          note?: string | null
          submission_id: string
          submission_type: string
          validator_id: string
          vote: Database["public"]["Enums"]["vote_type"]
          voted_at?: string
        }
        Update: {
          id?: string
          note?: string | null
          submission_id?: string
          submission_type?: string
          validator_id?: string
          vote?: Database["public"]["Enums"]["vote_type"]
          voted_at?: string
        }
        Relationships: []
      }
      validators: {
        Row: {
          appointed_at: string
          community_id: string
          id: string
          user_id: string
        }
        Insert: {
          appointed_at?: string
          community_id: string
          id?: string
          user_id: string
        }
        Update: {
          appointed_at?: string
          community_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "validators_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance_sats: number
          blink_wallet_id: string
          community_id: string
          created_at: string
          id: string
          last_synced_at: string | null
          updated_at: string
          user_id: string
          wallet_currency: string
        }
        Insert: {
          balance_sats?: number
          blink_wallet_id: string
          community_id: string
          created_at?: string
          id?: string
          last_synced_at?: string | null
          updated_at?: string
          user_id: string
          wallet_currency?: string
        }
        Update: {
          balance_sats?: number
          blink_wallet_id?: string
          community_id?: string
          created_at?: string
          id?: string
          last_synced_at?: string | null
          updated_at?: string
          user_id?: string
          wallet_currency?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      community_status: "pending" | "active" | "suspended"
      submission_status: "pending" | "approved" | "rejected"
      vote_type: "approve" | "reject"
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
      app_role: ["admin", "moderator", "user"],
      community_status: ["pending", "active", "suspended"],
      submission_status: ["pending", "approved", "rejected"],
      vote_type: ["approve", "reject"],
    },
  },
} as const
