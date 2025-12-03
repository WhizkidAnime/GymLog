export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      template_exercises: {
        Row: {
          id: string
          name: string
          position: number
          reps: string
          rest_seconds: number
          sets: number
          template_id: string
        }
        Insert: {
          id?: string
          name: string
          position?: number
          reps: string
          rest_seconds: number
          sets: number
          template_id: string
        }
        Update: {
          id?: string
          name?: string
          position?: number
          reps?: string
          rest_seconds?: number
          sets?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_exercises_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_exercises: {
        Row: {
          id: string
          name: string
          position: number
          reps: string
          rest_seconds: number
          sets: number
          workout_id: string
        }
        Insert: {
          id?: string
          name: string
          position?: number
          reps: string
          rest_seconds: number
          sets: number
          workout_id: string
        }
        Update: {
          id?: string
          name?: string
          position?: number
          reps?: string
          rest_seconds?: number
          sets?: number
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sets: {
        Row: {
          id: string
          is_done: boolean
          reps: string | null
          set_index: number
          updated_at: string
          weight: number | null
          workout_exercise_id: string
        }
        Insert: {
          id?: string
          is_done?: boolean
          reps?: string | null
          set_index: number
          updated_at?: string
          weight?: number | null
          workout_exercise_id: string
        }
        Update: {
          id?: string
          is_done?: boolean
          reps?: string | null
          set_index?: number
          updated_at?: string
          weight?: number | null
          workout_exercise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_workout_exercise_id_fkey"
            columns: ["workout_exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_templates: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
          icon: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
          icon?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
          icon?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workout_templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      template_share_codes: {
        Row: {
          created_at: string
          id: string
          template: Json
        }
        Insert: {
          created_at?: string
          id?: string
          template: Json
        }
        Update: {
          created_at?: string
          id?: string
          template?: Json
        }
        Relationships: []
      }
      workouts: {
        Row: {
          created_at: string
          id: string
          name: string
          template_id: string | null
          user_id: string
          workout_date: string
          is_cardio: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          template_id?: string | null
          user_id: string
          workout_date: string
          is_cardio?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          template_id?: string | null
          user_id?: string
          workout_date?: string
          is_cardio?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "workouts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      exercise_progress_view: {
        Row: {
          workout_date: string
          workout_name: string
          workout_id: string
          exercise_id: string
          max_weight: number | null
          reps_at_max_weight: string | null
        }
      }
    }
    Functions: {
      delete_user_account: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never


// Custom types for convenience
export type WorkoutTemplate = Database['public']['Tables']['workout_templates']['Row'];
export type TemplateExercise = Database['public']['Tables']['template_exercises']['Row'] & { id: string };
export type TemplateExerciseInsert = Database['public']['Tables']['template_exercises']['Insert'];
export type Workout = Database['public']['Tables']['workouts']['Row'];
export type WorkoutExercise = Database['public']['Tables']['workout_exercises']['Row'];
export type WorkoutExerciseUpdate = Database['public']['Tables']['workout_exercises']['Update'];
export type WorkoutSet = Database['public']['Tables']['workout_sets']['Row'];
export type WorkoutExerciseWithSets = WorkoutExercise & {
  workout_sets: WorkoutSet[];
};
export type WorkoutExercisePositionUpdate = Pick<WorkoutExercise, 'id' | 'position'>;
