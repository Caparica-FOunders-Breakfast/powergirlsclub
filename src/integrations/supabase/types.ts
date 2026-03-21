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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      challenge_rewards: {
        Row: {
          challenge_id: string
          chosen_by: string | null
          completed_at: string | null
          created_at: string
          id: string
          photo_url: string | null
          reward_type: string
          reward_value: string | null
          unlocked: boolean
          updated_at: string
          user_id: string
          week_number: number
        }
        Insert: {
          challenge_id: string
          chosen_by?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          photo_url?: string | null
          reward_type: string
          reward_value?: string | null
          unlocked?: boolean
          updated_at?: string
          user_id: string
          week_number: number
        }
        Update: {
          challenge_id?: string
          chosen_by?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          photo_url?: string | null
          reward_type?: string
          reward_value?: string | null
          unlocked?: boolean
          updated_at?: string
          user_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "challenge_rewards_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          created_at: string
          created_by: string
          end_date: string
          id: string
          invite_code: string | null
          name: string
          start_date: string
        }
        Insert: {
          created_at?: string
          created_by: string
          end_date: string
          id?: string
          invite_code?: string | null
          name?: string
          start_date: string
        }
        Update: {
          created_at?: string
          created_by?: string
          end_date?: string
          id?: string
          invite_code?: string | null
          name?: string
          start_date?: string
        }
        Relationships: []
      }
      exercise_logs: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          day_index: number
          exercise_index: number
          exercise_name: string
          id: string
          updated_at: string
          user_id: string
          week_start: string
          weight_used: number | null
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          day_index: number
          exercise_index: number
          exercise_name: string
          id?: string
          updated_at?: string
          user_id: string
          week_start: string
          weight_used?: number | null
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          day_index?: number
          exercise_index?: number
          exercise_name?: string
          id?: string
          updated_at?: string
          user_id?: string
          week_start?: string
          weight_used?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_color: string
          body_weight: number | null
          challenge_end: string | null
          challenge_id: string | null
          challenge_start: string | null
          created_at: string
          display_name: string
          id: string
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_color?: string
          body_weight?: number | null
          challenge_end?: string | null
          challenge_id?: string | null
          challenge_start?: string | null
          created_at?: string
          display_name: string
          id?: string
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_color?: string
          body_weight?: number | null
          challenge_end?: string | null
          challenge_id?: string | null
          challenge_start?: string | null
          created_at?: string
          display_name?: string
          id?: string
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          chosen_by: string
          created_at: string
          id: string
          reward_details: Json | null
          reward_type: string
          reward_value: string
          team_id: string | null
          week_number: number
          week_start: string
        }
        Insert: {
          chosen_by: string
          created_at?: string
          id?: string
          reward_details?: Json | null
          reward_type: string
          reward_value: string
          team_id?: string | null
          week_number: number
          week_start: string
        }
        Update: {
          chosen_by?: string
          created_at?: string
          id?: string
          reward_details?: Json | null
          reward_type?: string
          reward_value?: string
          team_id?: string | null
          week_number?: number
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "rewards_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          team_code: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          team_code?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          team_code?: string | null
        }
        Relationships: []
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
      user_workout_plans: {
        Row: {
          created_at: string
          day_index: number
          emoji: string | null
          exercises: Json
          id: string
          is_recovery: boolean
          is_rest: boolean
          label: string | null
          rest_note: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_index: number
          emoji?: string | null
          exercises?: Json
          id?: string
          is_recovery?: boolean
          is_rest?: boolean
          label?: string | null
          rest_note?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_index?: number
          emoji?: string | null
          exercises?: Json
          id?: string
          is_recovery?: boolean
          is_rest?: boolean
          label?: string | null
          rest_note?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_scores: {
        Row: {
          created_at: string
          id: string
          is_winner: boolean
          points: number
          streak: number
          team_id: string | null
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_winner?: boolean
          points?: number
          streak?: number
          team_id?: string | null
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          is_winner?: boolean
          points?: number
          streak?: number
          team_id?: string | null
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_scores_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_entries: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          user_id: string
          weights: Json | null
          workout_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          user_id: string
          weights?: Json | null
          workout_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          user_id?: string
          weights?: Json | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_entries_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workouts: {
        Row: {
          created_at: string
          created_by: string
          day_of_week: number
          exercises: Json
          id: string
          title: string
          week_start: string
        }
        Insert: {
          created_at?: string
          created_by: string
          day_of_week: number
          exercises?: Json
          id?: string
          title: string
          week_start: string
        }
        Update: {
          created_at?: string
          created_by?: string
          day_of_week?: number
          exercises?: Json
          id?: string
          title?: string
          week_start?: string
        }
        Relationships: []
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
      app_role: "admin" | "member"
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
      app_role: ["admin", "member"],
    },
  },
} as const
