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
          api_key: string
          community_id: string
          created_at: string
          id: string
          is_active: boolean
          last_used_at: string | null
          updated_at: string
        }
        Insert: {
          api_key: string
          community_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          updated_at?: string
        }
        Update: {
          api_key?: string
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
          counterparty_ln_hash: string | null
          counterparty_wallet_id: string | null
          created_at: string
          direction: string
          flow_type: string | null
          id: string
          is_internal: boolean
          memo: string | null
          payment_hash_sha256: string | null
          settlement_amount: number
          settlement_currency: string
          status: string
          wallet_id: string
        }
        Insert: {
          blink_created_at: string
          blink_tx_id: string
          community_id: string
          counterparty_ln_hash?: string | null
          counterparty_wallet_id?: string | null
          created_at?: string
          direction: string
          flow_type?: string | null
          id?: string
          is_internal?: boolean
          memo?: string | null
          payment_hash_sha256?: string | null
          settlement_amount: number
          settlement_currency?: string
          status?: string
          wallet_id: string
        }
        Update: {
          blink_created_at?: string
          blink_tx_id?: string
          community_id?: string
          counterparty_ln_hash?: string | null
          counterparty_wallet_id?: string | null
          created_at?: string
          direction?: string
          flow_type?: string | null
          id?: string
          is_internal?: boolean
          memo?: string | null
          payment_hash_sha256?: string | null
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
            foreignKeyName: "blink_transactions_counterparty_wallet_id_fkey"
            columns: ["counterparty_wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blink_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blink_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets_public"
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
          active_days_this_month: number
          activity_rate: number
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
          fbce_tier: number | null
          fbce_tier_verified: boolean | null
          founding_year: number | null
          id: string
          logo_url: string | null
          member_count: number
          metrics_updated_at: string | null
          monthly_transactions: number
          name: string
          region: string
          setup_checklist: Json
          slug: string
          status: Database["public"]["Enums"]["community_status"]
          twitter_handle: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          active_days_this_month?: number
          activity_rate?: number
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
          fbce_tier?: number | null
          fbce_tier_verified?: boolean | null
          founding_year?: number | null
          id?: string
          logo_url?: string | null
          member_count?: number
          metrics_updated_at?: string | null
          monthly_transactions?: number
          name: string
          region?: string
          setup_checklist?: Json
          slug: string
          status?: Database["public"]["Enums"]["community_status"]
          twitter_handle?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          active_days_this_month?: number
          activity_rate?: number
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
          fbce_tier?: number | null
          fbce_tier_verified?: boolean | null
          founding_year?: number | null
          id?: string
          logo_url?: string | null
          member_count?: number
          metrics_updated_at?: string | null
          monthly_transactions?: number
          name?: string
          region?: string
          setup_checklist?: Json
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
      data_access_requests: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
          organization: string | null
          tier: string | null
          use_case: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          organization?: string | null
          tier?: string | null
          use_case?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          organization?: string | null
          tier?: string | null
          use_case?: string | null
        }
        Relationships: []
      }
      earner_secrets: {
        Row: {
          created_at: string
          earner_id: string
          pending_blink_api_key_encrypted: string | null
          pending_ln_address_hash: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          earner_id: string
          pending_blink_api_key_encrypted?: string | null
          pending_ln_address_hash?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          earner_id?: string
          pending_blink_api_key_encrypted?: string | null
          pending_ln_address_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "earner_secrets_earner_id_fkey"
            columns: ["earner_id"]
            isOneToOne: true
            referencedRelation: "earners"
            referencedColumns: ["id"]
          },
        ]
      }
      earner_wallets: {
        Row: {
          claimed_at: string | null
          community_id: string
          created_at: string
          earner_id: string
          id: string
          wallet_id: string | null
        }
        Insert: {
          claimed_at?: string | null
          community_id: string
          created_at?: string
          earner_id: string
          id?: string
          wallet_id?: string | null
        }
        Update: {
          claimed_at?: string | null
          community_id?: string
          created_at?: string
          earner_id?: string
          id?: string
          wallet_id?: string | null
        }
        Relationships: []
      }
      earners: {
        Row: {
          community_id: string
          created_at: string
          description: string
          earner_code: string | null
          earning_frequency: string | null
          earning_method: string | null
          has_wallet_pending: boolean
          id: string
          payment_method: string | null
          status: Database["public"]["Enums"]["submission_status"]
          submitted_by: string | null
        }
        Insert: {
          community_id: string
          created_at?: string
          description: string
          earner_code?: string | null
          earning_frequency?: string | null
          earning_method?: string | null
          has_wallet_pending?: boolean
          id?: string
          payment_method?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_by?: string | null
        }
        Update: {
          community_id?: string
          created_at?: string
          description?: string
          earner_code?: string | null
          earning_frequency?: string | null
          earning_method?: string | null
          has_wallet_pending?: boolean
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
      economy_alerts: {
        Row: {
          action_url: string | null
          alert_key: string
          alert_type: string
          community_id: string
          created_at: string
          id: string
          is_read: boolean
          message: string
        }
        Insert: {
          action_url?: string | null
          alert_key: string
          alert_type: string
          community_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
        }
        Update: {
          action_url?: string | null
          alert_key?: string
          alert_type?: string
          community_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "economy_alerts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      economy_wallet_metrics: {
        Row: {
          active_earner_wallets: number
          active_merchant_wallets: number
          calculated_at: string
          circular_transaction_count: number
          circular_volume_sats: number
          community_id: string
          id: string
          offramp_volume_sats: number
          period_end: string
          period_start: string
          real_circularity_rate: number
          total_inflow_sats: number
          total_outflow_sats: number
          total_transaction_count: number
        }
        Insert: {
          active_earner_wallets?: number
          active_merchant_wallets?: number
          calculated_at?: string
          circular_transaction_count?: number
          circular_volume_sats?: number
          community_id: string
          id?: string
          offramp_volume_sats?: number
          period_end: string
          period_start: string
          real_circularity_rate?: number
          total_inflow_sats?: number
          total_outflow_sats?: number
          total_transaction_count?: number
        }
        Update: {
          active_earner_wallets?: number
          active_merchant_wallets?: number
          calculated_at?: string
          circular_transaction_count?: number
          circular_volume_sats?: number
          community_id?: string
          id?: string
          offramp_volume_sats?: number
          period_end?: string
          period_start?: string
          real_circularity_rate?: number
          total_inflow_sats?: number
          total_outflow_sats?: number
          total_transaction_count?: number
        }
        Relationships: []
      }
      merchant_invoices: {
        Row: {
          amount_sats: number
          blink_tx_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          memo: string | null
          merchant_id: string
          paid_at: string | null
          payment_hash: string | null
          payment_request: string
          status: string
        }
        Insert: {
          amount_sats: number
          blink_tx_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          memo?: string | null
          merchant_id: string
          paid_at?: string | null
          payment_hash?: string | null
          payment_request: string
          status?: string
        }
        Update: {
          amount_sats?: number
          blink_tx_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          memo?: string | null
          merchant_id?: string
          paid_at?: string | null
          payment_hash?: string | null
          payment_request?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_invoices_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchant_metrics"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "merchant_invoices_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_secrets: {
        Row: {
          claim_token_hash: string | null
          created_at: string
          merchant_id: string
          pending_blink_api_key_encrypted: string | null
          pending_ln_address_hash: string | null
          updated_at: string
        }
        Insert: {
          claim_token_hash?: string | null
          created_at?: string
          merchant_id: string
          pending_blink_api_key_encrypted?: string | null
          pending_ln_address_hash?: string | null
          updated_at?: string
        }
        Update: {
          claim_token_hash?: string | null
          created_at?: string
          merchant_id?: string
          pending_blink_api_key_encrypted?: string | null
          pending_ln_address_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "merchant_secrets_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "merchant_metrics"
            referencedColumns: ["merchant_id"]
          },
          {
            foreignKeyName: "merchant_secrets_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          address: string | null
          approved_at: string | null
          btcmap_id: string | null
          btcmap_node_id: string | null
          category: string
          claimed_at: string | null
          community_id: string
          created_at: string
          has_wallet_pending: boolean
          id: string
          lat: number | null
          lng: number | null
          merchant_code: string | null
          name: string
          payment_methods: string[]
          public_merchant_id: string | null
          source: string | null
          status: Database["public"]["Enums"]["submission_status"]
          submitted_by: string | null
          wallet_id: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          approved_at?: string | null
          btcmap_id?: string | null
          btcmap_node_id?: string | null
          category?: string
          claimed_at?: string | null
          community_id: string
          created_at?: string
          has_wallet_pending?: boolean
          id?: string
          lat?: number | null
          lng?: number | null
          merchant_code?: string | null
          name: string
          payment_methods?: string[]
          public_merchant_id?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_by?: string | null
          wallet_id?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          approved_at?: string | null
          btcmap_id?: string | null
          btcmap_node_id?: string | null
          category?: string
          claimed_at?: string | null
          community_id?: string
          created_at?: string
          has_wallet_pending?: boolean
          id?: string
          lat?: number | null
          lng?: number | null
          merchant_code?: string | null
          name?: string
          payment_methods?: string[]
          public_merchant_id?: string | null
          source?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_by?: string | null
          wallet_id?: string | null
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
          {
            foreignKeyName: "merchants_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "merchants_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets_public"
            referencedColumns: ["id"]
          },
        ]
      }
      nostr_challenges: {
        Row: {
          challenge: string
          created_at: string
          expires_at: string
          id: string
          pubkey_hash: string
        }
        Insert: {
          challenge: string
          created_at?: string
          expires_at: string
          id?: string
          pubkey_hash: string
        }
        Update: {
          challenge?: string
          created_at?: string
          expires_at?: string
          id?: string
          pubkey_hash?: string
        }
        Relationships: []
      }
      nostr_identities: {
        Row: {
          created_at: string
          id: string
          last_seen_at: string
          pubkey_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen_at?: string
          pubkey_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_seen_at?: string
          pubkey_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          about: string | null
          avatar_url: string | null
          bio: string | null
          bitcoin_wallet: string | null
          created_at: string
          display_name: string | null
          email: string | null
          github: string | null
          id: string
          is_super_admin: boolean
          lightning_address: string | null
          location: string | null
          npub: string | null
          onboarding_completed_at: string | null
          portfolio_url: string | null
          skills: string[] | null
          telegram: string | null
          updated_at: string
          user_id: string
          user_type: Database["public"]["Enums"]["user_type"] | null
          username: string | null
          website: string | null
          x_handle: string | null
        }
        Insert: {
          about?: string | null
          avatar_url?: string | null
          bio?: string | null
          bitcoin_wallet?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          github?: string | null
          id?: string
          is_super_admin?: boolean
          lightning_address?: string | null
          location?: string | null
          npub?: string | null
          onboarding_completed_at?: string | null
          portfolio_url?: string | null
          skills?: string[] | null
          telegram?: string | null
          updated_at?: string
          user_id: string
          user_type?: Database["public"]["Enums"]["user_type"] | null
          username?: string | null
          website?: string | null
          x_handle?: string | null
        }
        Update: {
          about?: string | null
          avatar_url?: string | null
          bio?: string | null
          bitcoin_wallet?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          github?: string | null
          id?: string
          is_super_admin?: boolean
          lightning_address?: string | null
          location?: string | null
          npub?: string | null
          onboarding_completed_at?: string | null
          portfolio_url?: string | null
          skills?: string[] | null
          telegram?: string | null
          updated_at?: string
          user_id?: string
          user_type?: Database["public"]["Enums"]["user_type"] | null
          username?: string | null
          website?: string | null
          x_handle?: string | null
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
          blink_api_key_encrypted: string | null
          blink_wallet_id: string
          community_id: string
          created_at: string
          id: string
          last_synced_at: string | null
          ln_address_hash: string | null
          owner_id: string | null
          owner_type: string | null
          updated_at: string
          user_id: string
          wallet_currency: string
          wallet_status: string
        }
        Insert: {
          balance_sats?: number
          blink_api_key_encrypted?: string | null
          blink_wallet_id: string
          community_id: string
          created_at?: string
          id?: string
          last_synced_at?: string | null
          ln_address_hash?: string | null
          owner_id?: string | null
          owner_type?: string | null
          updated_at?: string
          user_id: string
          wallet_currency?: string
          wallet_status?: string
        }
        Update: {
          balance_sats?: number
          blink_api_key_encrypted?: string | null
          blink_wallet_id?: string
          community_id?: string
          created_at?: string
          id?: string
          last_synced_at?: string | null
          ln_address_hash?: string | null
          owner_id?: string | null
          owner_type?: string | null
          updated_at?: string
          user_id?: string
          wallet_currency?: string
          wallet_status?: string
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
      merchant_metrics: {
        Row: {
          category: string | null
          circularity_score: number | null
          community_id: string | null
          inflow_sats: number | null
          internal_sats: number | null
          last_tx_at: string | null
          merchant_id: string | null
          name: string | null
          outflow_sats: number | null
          public_merchant_id: string | null
          tx_count: number | null
          wallet_linked: boolean | null
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
      public_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      wallets_public: {
        Row: {
          community_id: string | null
          created_at: string | null
          id: string | null
          owner_type: string | null
          wallet_status: string | null
        }
        Insert: {
          community_id?: string | null
          created_at?: string | null
          id?: string | null
          owner_type?: string | null
          wallet_status?: string | null
        }
        Update: {
          community_id?: string | null
          created_at?: string | null
          id?: string | null
          owner_type?: string | null
          wallet_status?: string | null
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
    Functions: {
      generate_merchant_public_id: { Args: never; Returns: string }
      get_is_super_admin: { Args: { _user_id: string }; Returns: boolean }
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
      user_type: "freelancer" | "client" | "both"
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
      user_type: ["freelancer", "client", "both"],
      vote_type: ["approve", "reject"],
    },
  },
} as const
