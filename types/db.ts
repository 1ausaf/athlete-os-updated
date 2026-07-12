/**
 * Database types for the AOS public schema (aligned with
 * `supabase/migrations/20260512120000_aos_mvp_schema.sql`).
 *
 * After changing the schema, regenerate from your project with:
 *   npx supabase gen types typescript --project-id <ref> --schema public > types/db.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      athlete_program_assignments: {
        Row: {
          id: string;
          athlete_id: string;
          program_id: string;
          assigned_at: string;
          unassigned_at: string | null;
        };
        Insert: {
          id?: string;
          athlete_id: string;
          program_id: string;
          assigned_at?: string;
          unassigned_at?: string | null;
        };
        Update: {
          id?: string;
          athlete_id?: string;
          program_id?: string;
          assigned_at?: string;
          unassigned_at?: string | null;
        };
        Relationships: [];
      };
      athletes: {
        Row: {
          id: string;
          profile_id: string;
          injury_flag: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          injury_flag?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          injury_flag?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      billing_accounts: {
        Row: {
          athlete_id: string;
          balance_cents: number;
          currency: string;
          updated_at: string;
        };
        Insert: {
          athlete_id: string;
          balance_cents?: number;
          currency?: string;
          updated_at?: string;
        };
        Update: {
          athlete_id?: string;
          balance_cents?: number;
          currency?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          session_id: string;
          athlete_id: string;
          status: Database["public"]["Enums"]["booking_status"];
          payment_status: Database["public"]["Enums"]["payment_status"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          athlete_id: string;
          status?: Database["public"]["Enums"]["booking_status"];
          payment_status?: Database["public"]["Enums"]["payment_status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          athlete_id?: string;
          status?: Database["public"]["Enums"]["booking_status"];
          payment_status?: Database["public"]["Enums"]["payment_status"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      cap_notes: {
        Row: {
          id: string;
          athlete_id: string;
          author_profile_id: string;
          body: string;
          note_week_start: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          athlete_id: string;
          author_profile_id: string;
          body: string;
          note_week_start: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          athlete_id?: string;
          author_profile_id?: string;
          body?: string;
          note_week_start?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      coach_athlete_assignments: {
        Row: {
          id: string;
          coach_id: string;
          athlete_id: string;
          valid_from: string;
          valid_to: string | null;
        };
        Insert: {
          id?: string;
          coach_id: string;
          athlete_id: string;
          valid_from?: string;
          valid_to?: string | null;
        };
        Update: {
          id?: string;
          coach_id?: string;
          athlete_id?: string;
          valid_from?: string;
          valid_to?: string | null;
        };
        Relationships: [];
      };
      coaches: {
        Row: {
          id: string;
          profile_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      compliance_evaluations: {
        Row: {
          id: string;
          athlete_id: string;
          evaluation_kind: Database["public"]["Enums"]["compliance_evaluation_kind"];
          period_start: string;
          period_end: string;
          is_compliant: boolean;
          details: Json | null;
          evaluated_at: string;
        };
        Insert: {
          id?: string;
          athlete_id: string;
          evaluation_kind: Database["public"]["Enums"]["compliance_evaluation_kind"];
          period_start: string;
          period_end: string;
          is_compliant: boolean;
          details?: Json | null;
          evaluated_at?: string;
        };
        Update: {
          id?: string;
          athlete_id?: string;
          evaluation_kind?: Database["public"]["Enums"]["compliance_evaluation_kind"];
          period_start?: string;
          period_end?: string;
          is_compliant?: boolean;
          details?: Json | null;
          evaluated_at?: string;
        };
        Relationships: [];
      };
      injury_flags: {
        Row: {
          id: string;
          athlete_id: string;
          label: string;
          is_active: boolean;
          recorded_at: string;
          recorded_by_profile_id: string | null;
        };
        Insert: {
          id?: string;
          athlete_id: string;
          label: string;
          is_active?: boolean;
          recorded_at?: string;
          recorded_by_profile_id?: string | null;
        };
        Update: {
          id?: string;
          athlete_id?: string;
          label?: string;
          is_active?: boolean;
          recorded_at?: string;
          recorded_by_profile_id?: string | null;
        };
        Relationships: [];
      };
      membership_plans: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          membership_frequency: Database["public"]["Enums"]["membership_frequency"];
          sessions_allowed_per_period: number | null;
          period_days: number | null;
          price_cents: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          membership_frequency: Database["public"]["Enums"]["membership_frequency"];
          sessions_allowed_per_period?: number | null;
          period_days?: number | null;
          price_cents?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          membership_frequency?: Database["public"]["Enums"]["membership_frequency"];
          sessions_allowed_per_period?: number | null;
          period_days?: number | null;
          price_cents?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      memberships: {
        Row: {
          id: string;
          athlete_id: string;
          plan_id: string;
          status: Database["public"]["Enums"]["membership_status"];
          valid_from: string;
          valid_to: string | null;
          payment_status: Database["public"]["Enums"]["payment_status"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          athlete_id: string;
          plan_id: string;
          status?: Database["public"]["Enums"]["membership_status"];
          valid_from?: string;
          valid_to?: string | null;
          payment_status?: Database["public"]["Enums"]["payment_status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          athlete_id?: string;
          plan_id?: string;
          status?: Database["public"]["Enums"]["membership_status"];
          valid_from?: string;
          valid_to?: string | null;
          payment_status?: Database["public"]["Enums"]["payment_status"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      message_threads: {
        Row: {
          id: string;
          title: string | null;
          created_by_profile_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title?: string | null;
          created_by_profile_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string | null;
          created_by_profile_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          thread_id: string;
          sender_profile_id: string;
          body: string;
          created_at: string;
          edited_at: string | null;
        };
        Insert: {
          id?: string;
          thread_id: string;
          sender_profile_id: string;
          body: string;
          created_at?: string;
          edited_at?: string | null;
        };
        Update: {
          id?: string;
          thread_id?: string;
          sender_profile_id?: string;
          body?: string;
          created_at?: string;
          edited_at?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          phone: string | null;
          date_of_birth: string | null;
          timezone: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          date_of_birth?: string | null;
          timezone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          email?: string | null;
          phone?: string | null;
          date_of_birth?: string | null;
          timezone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      programs: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          program_id: string | null;
          primary_coach_id: string | null;
          location: string | null;
          starts_at: string;
          ends_at: string;
          capacity: number;
          status: Database["public"]["Enums"]["session_status"];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          program_id?: string | null;
          primary_coach_id?: string | null;
          location?: string | null;
          starts_at: string;
          ends_at: string;
          capacity?: number;
          status?: Database["public"]["Enums"]["session_status"];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          program_id?: string | null;
          primary_coach_id?: string | null;
          location?: string | null;
          starts_at?: string;
          ends_at?: string;
          capacity?: number;
          status?: Database["public"]["Enums"]["session_status"];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      thread_participants: {
        Row: {
          id: string;
          thread_id: string;
          profile_id: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          profile_id: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          thread_id?: string;
          profile_id?: string;
          joined_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          profile_id: string;
          role: Database["public"]["Enums"]["user_role"];
        };
        Insert: {
          profile_id: string;
          role: Database["public"]["Enums"]["user_role"];
        };
        Update: {
          profile_id?: string;
          role?: Database["public"]["Enums"]["user_role"];
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_message_thread_with_participants: {
        Args: {
          p_title: string | null;
          p_participant_profile_ids: string[];
        };
        Returns: string;
      };
      booking_frequency_ok_for_confirm: {
        Args: {
          p_athlete_id: string;
          p_session_id: string;
          p_booking_id: string;
        };
        Returns: boolean;
      };
      has_global_staff_access: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_assigned_coach_for_athlete: {
        Args: { p_athlete_id: string };
        Returns: boolean;
      };
      is_thread_participant: {
        Args: { p_thread_id: string; p_profile_id: string };
        Returns: boolean;
      };
      jwt_profile_id: {
        Args: Record<PropertyKey, never>;
        Returns: string | null;
      };
      profile_is_minor: {
        Args: { p_profile_id: string };
        Returns: boolean;
      };
      profile_owns_athlete: {
        Args: { p_athlete_id: string };
        Returns: boolean;
      };
      set_updated_at: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
      trg_bookings_membership_and_payment: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
      trg_messages_sender_must_be_participant: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
      trg_thread_participants_rule_of_two: {
        Args: Record<PropertyKey, never>;
        Returns: unknown;
      };
      validate_thread_rule_of_two: {
        Args: { p_thread_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      booking_status: "pending" | "confirmed" | "cancelled" | "waitlisted" | "no_show";
      compliance_evaluation_kind: "booking_four_week" | "cap_weekly";
      membership_frequency: "unlimited" | "per_week" | "per_two_weeks" | "per_month" | "package";
      membership_status: "active" | "paused" | "cancelled" | "expired";
      payment_status: "unpaid" | "pending" | "authorized" | "paid" | "failed" | "refunded" | "waived";
      session_status: "scheduled" | "cancelled" | "completed";
      user_role: "athlete" | "coach" | "admin" | "owner";
    };
    CompositeTypes: Record<string, never>;
  };
};
