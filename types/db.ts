/**
 * Supabase generated types for the POWA public schema.
 * REGENERATED — do not hand-edit. After any migration run:
 *   npx supabase gen types typescript --project-id sbapkmfsbschwxtwpdtq --schema public > types/db.ts
 * (or the Supabase MCP generate_typescript_types tool).
 */

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
      athlete_program_assignments: {
        Row: {
          assigned_at: string
          athlete_id: string
          id: string
          program_id: string
          tenant_id: string
          unassigned_at: string | null
        }
        Insert: {
          assigned_at?: string
          athlete_id: string
          id?: string
          program_id: string
          tenant_id: string
          unassigned_at?: string | null
        }
        Update: {
          assigned_at?: string
          athlete_id?: string
          id?: string
          program_id?: string
          tenant_id?: string
          unassigned_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_program_assignments_athlete_fk"
            columns: ["tenant_id", "athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "athlete_program_assignments_program_fk"
            columns: ["tenant_id", "program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "athlete_program_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      athletes: {
        Row: {
          created_at: string
          id: string
          injury_flag: boolean
          profile_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          injury_flag?: boolean
          profile_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          injury_flag?: boolean
          profile_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "athletes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athletes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_accounts: {
        Row: {
          athlete_id: string
          balance_cents: number
          currency: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          balance_cents?: number
          currency?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          balance_cents?: number
          currency?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_accounts_athlete_fk"
            columns: ["tenant_id", "athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "billing_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          athlete_id: string
          created_at: string
          id: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          session_id: string
          status: Database["public"]["Enums"]["booking_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          athlete_id: string
          created_at?: string
          id?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          session_id: string
          status?: Database["public"]["Enums"]["booking_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          athlete_id?: string
          created_at?: string
          id?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          session_id?: string
          status?: Database["public"]["Enums"]["booking_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_athlete_fk"
            columns: ["tenant_id", "athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "bookings_session_fk"
            columns: ["tenant_id", "session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      cap_notes: {
        Row: {
          athlete_id: string
          author_profile_id: string
          body: string
          created_at: string
          id: string
          note_week_start: string
          tenant_id: string
        }
        Insert: {
          athlete_id: string
          author_profile_id: string
          body: string
          created_at?: string
          id?: string
          note_week_start: string
          tenant_id: string
        }
        Update: {
          athlete_id?: string
          author_profile_id?: string
          body?: string
          created_at?: string
          id?: string
          note_week_start?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cap_notes_athlete_fk"
            columns: ["tenant_id", "athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "cap_notes_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cap_notes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_athlete_assignments: {
        Row: {
          athlete_id: string
          coach_id: string
          id: string
          tenant_id: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          athlete_id: string
          coach_id: string
          id?: string
          tenant_id: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          athlete_id?: string
          coach_id?: string
          id?: string
          tenant_id?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_athlete_assignments_athlete_fk"
            columns: ["tenant_id", "athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "coach_athlete_assignments_coach_fk"
            columns: ["tenant_id", "coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "coach_athlete_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      coaches: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaches_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coaches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_evaluations: {
        Row: {
          athlete_id: string
          details: Json | null
          evaluated_at: string
          evaluation_kind: Database["public"]["Enums"]["compliance_evaluation_kind"]
          id: string
          is_compliant: boolean
          period_end: string
          period_start: string
          tenant_id: string
        }
        Insert: {
          athlete_id: string
          details?: Json | null
          evaluated_at?: string
          evaluation_kind: Database["public"]["Enums"]["compliance_evaluation_kind"]
          id?: string
          is_compliant: boolean
          period_end: string
          period_start: string
          tenant_id: string
        }
        Update: {
          athlete_id?: string
          details?: Json | null
          evaluated_at?: string
          evaluation_kind?: Database["public"]["Enums"]["compliance_evaluation_kind"]
          id?: string
          is_compliant?: boolean
          period_end?: string
          period_start?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_evaluations_athlete_fk"
            columns: ["tenant_id", "athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "compliance_evaluations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      injury_flags: {
        Row: {
          athlete_id: string
          id: string
          is_active: boolean
          label: string
          recorded_at: string
          recorded_by_profile_id: string | null
          tenant_id: string
        }
        Insert: {
          athlete_id: string
          id?: string
          is_active?: boolean
          label: string
          recorded_at?: string
          recorded_by_profile_id?: string | null
          tenant_id: string
        }
        Update: {
          athlete_id?: string
          id?: string
          is_active?: boolean
          label?: string
          recorded_at?: string
          recorded_by_profile_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "injury_flags_athlete_fk"
            columns: ["tenant_id", "athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "injury_flags_recorded_by_profile_id_fkey"
            columns: ["recorded_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "injury_flags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          create_parent_login: boolean | null
          created_at: string
          current_limitations: string | null
          date_of_birth: string | null
          date_of_birth_raw: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relation: string | null
          first_name: string
          focus: string | null
          goals: string | null
          group_name: string | null
          guardian_email: string | null
          guardian_name: string | null
          guardian_phone: string | null
          guardian_relation: string | null
          id: string
          imported_at: string
          last_name: string | null
          membership_type: string | null
          past_injuries: string | null
          phone: string | null
          plan: string | null
          sex: string | null
          source_row: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          create_parent_login?: boolean | null
          created_at?: string
          current_limitations?: string | null
          date_of_birth?: string | null
          date_of_birth_raw?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          first_name: string
          focus?: string | null
          goals?: string | null
          group_name?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_relation?: string | null
          id?: string
          imported_at?: string
          last_name?: string | null
          membership_type?: string | null
          past_injuries?: string | null
          phone?: string | null
          plan?: string | null
          sex?: string | null
          source_row?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          create_parent_login?: boolean | null
          created_at?: string
          current_limitations?: string | null
          date_of_birth?: string | null
          date_of_birth_raw?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relation?: string | null
          first_name?: string
          focus?: string | null
          goals?: string | null
          group_name?: string | null
          guardian_email?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          guardian_relation?: string | null
          id?: string
          imported_at?: string
          last_name?: string | null
          membership_type?: string | null
          past_injuries?: string | null
          phone?: string | null
          plan?: string | null
          sex?: string | null
          source_row?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      membership_plans: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          membership_frequency: Database["public"]["Enums"]["membership_frequency"]
          name: string
          period_days: number | null
          price_cents: number | null
          sessions_allowed_per_period: number | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          membership_frequency: Database["public"]["Enums"]["membership_frequency"]
          name: string
          period_days?: number | null
          price_cents?: number | null
          sessions_allowed_per_period?: number | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          membership_frequency?: Database["public"]["Enums"]["membership_frequency"]
          name?: string
          period_days?: number | null
          price_cents?: number | null
          sessions_allowed_per_period?: number | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "membership_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          athlete_id: string
          created_at: string
          id: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          plan_id: string
          status: Database["public"]["Enums"]["membership_status"]
          tenant_id: string
          updated_at: string
          valid_from: string
          valid_to: string | null
        }
        Insert: {
          athlete_id: string
          created_at?: string
          id?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          plan_id: string
          status?: Database["public"]["Enums"]["membership_status"]
          tenant_id: string
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Update: {
          athlete_id?: string
          created_at?: string
          id?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          plan_id?: string
          status?: Database["public"]["Enums"]["membership_status"]
          tenant_id?: string
          updated_at?: string
          valid_from?: string
          valid_to?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memberships_athlete_fk"
            columns: ["tenant_id", "athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "memberships_plan_fk"
            columns: ["tenant_id", "plan_id"]
            isOneToOne: false
            referencedRelation: "membership_plans"
            referencedColumns: ["tenant_id", "id"]
          },
          {
            foreignKeyName: "memberships_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          created_at: string
          created_by_profile_id: string
          id: string
          tenant_id: string
          title: string | null
        }
        Insert: {
          created_at?: string
          created_by_profile_id: string
          id?: string
          tenant_id: string
          title?: string | null
        }
        Update: {
          created_at?: string
          created_by_profile_id?: string
          id?: string
          tenant_id?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_created_by_profile_id_fkey"
            columns: ["created_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_threads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          edited_at: string | null
          id: string
          sender_profile_id: string
          tenant_id: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          edited_at?: string | null
          id?: string
          sender_profile_id: string
          tenant_id: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          edited_at?: string | null
          id?: string
          sender_profile_id?: string
          tenant_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_sender_profile_id_fkey"
            columns: ["sender_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_thread_fk"
            columns: ["tenant_id", "thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
      plans: {
        Row: {
          features: Json
          id: string
          is_active: boolean
          limits: Json
          name: string
          price_cents: number | null
          sort_order: number
          stripe_price_id: string | null
        }
        Insert: {
          features?: Json
          id: string
          is_active?: boolean
          limits?: Json
          name: string
          price_cents?: number | null
          sort_order?: number
          stripe_price_id?: string | null
        }
        Update: {
          features?: Json
          id?: string
          is_active?: boolean
          limits?: Json
          name?: string
          price_cents?: number | null
          sort_order?: number
          stripe_price_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          capacity: number
          created_at: string
          ends_at: string
          id: string
          location: string | null
          primary_coach_id: string | null
          program_id: string | null
          starts_at: string
          status: Database["public"]["Enums"]["session_status"]
          tenant_id: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          created_at?: string
          ends_at: string
          id?: string
          location?: string | null
          primary_coach_id?: string | null
          program_id?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["session_status"]
          tenant_id: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          created_at?: string
          ends_at?: string
          id?: string
          location?: string | null
          primary_coach_id?: string | null
          program_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_primary_coach_id_fkey"
            columns: ["primary_coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_webhook_events: {
        Row: {
          id: string
          payload: Json | null
          processed_at: string
          type: string
        }
        Insert: {
          id: string
          payload?: Json | null
          processed_at?: string
          type: string
        }
        Update: {
          id?: string
          payload?: Json | null
          processed_at?: string
          type?: string
        }
        Relationships: []
      }
      tenant_branding: {
        Row: {
          display_name: string | null
          icon_url: string | null
          logo_url: string | null
          tenant_id: string
          theme: Json
          updated_at: string
        }
        Insert: {
          display_name?: string | null
          icon_url?: string | null
          logo_url?: string | null
          tenant_id: string
          theme?: Json
          updated_at?: string
        }
        Update: {
          display_name?: string | null
          icon_url?: string | null
          logo_url?: string | null
          tenant_id?: string
          theme?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_branding_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_domains: {
        Row: {
          created_at: string
          domain_type: Database["public"]["Enums"]["domain_type"]
          hostname: string
          id: string
          is_primary: boolean
          status: Database["public"]["Enums"]["domain_status"]
          tenant_id: string
          verification_token: string | null
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          domain_type: Database["public"]["Enums"]["domain_type"]
          hostname: string
          id?: string
          is_primary?: boolean
          status?: Database["public"]["Enums"]["domain_status"]
          tenant_id: string
          verification_token?: string | null
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          domain_type?: Database["public"]["Enums"]["domain_type"]
          hostname?: string
          id?: string
          is_primary?: boolean
          status?: Database["public"]["Enums"]["domain_status"]
          tenant_id?: string
          verification_token?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenant_domains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          revoked_at: string | null
          roles: Database["public"]["Enums"]["user_role"][]
          tenant_id: string
          token_hash: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          revoked_at?: string | null
          roles: Database["public"]["Enums"]["user_role"][]
          tenant_id: string
          token_hash: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          revoked_at?: string | null
          roles?: Database["public"]["Enums"]["user_role"][]
          tenant_id?: string
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_invitations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_members: {
        Row: {
          created_at: string
          roles: Database["public"]["Enums"]["user_role"][]
          status: Database["public"]["Enums"]["tenant_member_status"]
          tenant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          roles: Database["public"]["Enums"]["user_role"][]
          status?: Database["public"]["Enums"]["tenant_member_status"]
          tenant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          roles?: Database["public"]["Enums"]["user_role"][]
          status?: Database["public"]["Enums"]["tenant_member_status"]
          tenant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          current_period_end: string | null
          entitlement_overrides: Json
          plan_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_subscription_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          current_period_end?: string | null
          entitlement_overrides?: Json
          plan_id: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_subscription_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          current_period_end?: string | null
          entitlement_overrides?: Json
          plan_id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_subscription_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenant_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: true
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          status: Database["public"]["Enums"]["tenant_status"]
          stripe_customer_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          status?: Database["public"]["Enums"]["tenant_status"]
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          status?: Database["public"]["Enums"]["tenant_status"]
          stripe_customer_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      thread_participants: {
        Row: {
          id: string
          joined_at: string
          profile_id: string
          tenant_id: string
          thread_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          profile_id: string
          tenant_id: string
          thread_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          profile_id?: string
          tenant_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thread_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_participants_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "thread_participants_thread_fk"
            columns: ["tenant_id", "thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["tenant_id", "id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_tenant_invitation: { Args: { p_token: string }; Returns: string }
      booking_frequency_ok_for_confirm: {
        Args: {
          p_athlete_id: string
          p_booking_id: string
          p_session_id: string
        }
        Returns: boolean
      }
      create_message_thread_with_participants: {
        Args: {
          p_participant_profile_ids: string[]
          p_tenant_id: string
          p_title: string
        }
        Returns: string
      }
      get_my_membership: {
        Args: { p_tenant_id: string }
        Returns: {
          roles: Database["public"]["Enums"]["user_role"][]
          status: Database["public"]["Enums"]["tenant_member_status"]
          tenant_id: string
        }[]
      }
      get_tenant_public_branding: {
        Args: { p_hostname: string }
        Returns: {
          display_name: string
          entitlements: Json
          icon_url: string
          logo_url: string
          slug: string
          status: Database["public"]["Enums"]["tenant_status"]
          tenant_id: string
          theme: Json
        }[]
      }
      is_assigned_coach_for_athlete: {
        Args: { p_athlete_id: string }
        Returns: boolean
      }
      is_thread_participant: {
        Args: { p_profile_id: string; p_thread_id: string }
        Returns: boolean
      }
      member_tenant_ids: { Args: never; Returns: string[] }
      profile_is_minor: { Args: { p_profile_id: string }; Returns: boolean }
      profile_owns_athlete: { Args: { p_athlete_id: string }; Returns: boolean }
      role_tenant_ids: {
        Args: { p_roles: Database["public"]["Enums"]["user_role"][] }
        Returns: string[]
      }
      staff_tenant_ids: { Args: never; Returns: string[] }
      tenant_entitlements: { Args: { p_tenant_id: string }; Returns: Json }
      validate_thread_rule_of_two: {
        Args: { p_thread_id: string }
        Returns: undefined
      }
    }
    Enums: {
      booking_status:
        | "pending"
        | "confirmed"
        | "cancelled"
        | "waitlisted"
        | "no_show"
      compliance_evaluation_kind: "booking_four_week" | "cap_weekly"
      domain_status: "pending" | "verified" | "failed"
      domain_type: "subdomain" | "custom"
      membership_frequency:
        | "unlimited"
        | "per_week"
        | "per_two_weeks"
        | "per_month"
        | "package"
      membership_status: "active" | "paused" | "cancelled" | "expired"
      payment_status:
        | "unpaid"
        | "pending"
        | "authorized"
        | "paid"
        | "failed"
        | "refunded"
        | "waived"
      session_status: "scheduled" | "cancelled" | "completed"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "incomplete"
        | "paused"
      tenant_member_status: "active" | "suspended"
      tenant_status: "active" | "pilot" | "suspended" | "archived"
      user_role: "athlete" | "parent" | "coach" | "admin" | "owner"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      booking_status: [
        "pending",
        "confirmed",
        "cancelled",
        "waitlisted",
        "no_show",
      ],
      compliance_evaluation_kind: ["booking_four_week", "cap_weekly"],
      domain_status: ["pending", "verified", "failed"],
      domain_type: ["subdomain", "custom"],
      membership_frequency: [
        "unlimited",
        "per_week",
        "per_two_weeks",
        "per_month",
        "package",
      ],
      membership_status: ["active", "paused", "cancelled", "expired"],
      payment_status: [
        "unpaid",
        "pending",
        "authorized",
        "paid",
        "failed",
        "refunded",
        "waived",
      ],
      session_status: ["scheduled", "cancelled", "completed"],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "canceled",
        "incomplete",
        "paused",
      ],
      tenant_member_status: ["active", "suspended"],
      tenant_status: ["active", "pilot", "suspended", "archived"],
      user_role: ["athlete", "parent", "coach", "admin", "owner"],
    },
  },
} as const
