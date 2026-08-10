export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      daily_reports: {
        Row: {
          actual_customer_visits: number | null
          actual_revenue: number | null
          actual_route: string | null
          actual_sales_amount: number | null
          actual_sales_quantity: number | null
          actual_visit_points: number | null
          created_at: string
          evening_note: string | null
          evening_submitted_at: string | null
          id: string
          morning_submitted_at: string
          planned_route: string
          report_date: string
          sales_id: string
          status: Database["public"]["Enums"]["report_status"]
          target_customer_visits: number
          target_revenue: number
          target_sales_amount: number | null
          target_sales_quantity: number | null
          target_visit_points: number
          updated_at: string
          visit_purpose: string | null
        }
        Insert: {
          actual_customer_visits?: number | null
          actual_revenue?: number | null
          actual_route?: string | null
          actual_sales_amount?: number | null
          actual_sales_quantity?: number | null
          actual_visit_points?: number | null
          created_at?: string
          evening_note?: string | null
          evening_submitted_at?: string | null
          id?: string
          morning_submitted_at?: string
          planned_route: string
          report_date: string
          sales_id: string
          status?: Database["public"]["Enums"]["report_status"]
          target_customer_visits: number
          target_revenue: number
          target_sales_amount?: number | null
          target_sales_quantity?: number | null
          target_visit_points: number
          updated_at?: string
          visit_purpose?: string | null
        }
        Update: {
          actual_customer_visits?: number | null
          actual_revenue?: number | null
          actual_route?: string | null
          actual_sales_amount?: number | null
          actual_sales_quantity?: number | null
          actual_visit_points?: number | null
          created_at?: string
          evening_note?: string | null
          evening_submitted_at?: string | null
          id?: string
          morning_submitted_at?: string
          planned_route?: string
          report_date?: string
          sales_id?: string
          status?: Database["public"]["Enums"]["report_status"]
          target_customer_visits?: number
          target_revenue?: number
          target_sales_amount?: number | null
          target_sales_quantity?: number | null
          target_visit_points?: number
          updated_at?: string
          visit_purpose?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_reports_sales_id_fkey"
            columns: ["sales_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          employee_code: string | null
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          employee_code?: string | null
          full_name: string
          id: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          employee_code?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_daily_trend: {
        Args: { p_from: string; p_to: string }
        Returns: {
          actual_customer_visits: number
          actual_revenue: number
          actual_sales_amount: number
          actual_visit_points: number
          report_count: number
          report_date: string
          target_customer_visits: number
          target_revenue: number
          target_sales_amount: number
          target_visit_points: number
        }[]
      }
      admin_missing_report_alerts: {
        Args: { p_date: string }
        Returns: {
          alert_kind: string
          employee_code: string
          full_name: string
          id: string
        }[]
      }
      admin_monthly_summary: {
        Args: { p_from: string; p_to: string }
        Returns: {
          actual_customer_visits: number
          actual_revenue: number
          actual_sales_amount: number
          actual_visit_points: number
          report_count: number
          sales_count: number
          target_customer_visits: number
          target_revenue: number
          target_sales_amount: number
          target_visit_points: number
        }[]
      }
      admin_sales_performance: {
        Args: { p_from: string; p_to: string }
        Returns: {
          actual_customer_visits: number
          actual_revenue: number
          actual_sales_amount: number
          actual_visit_points: number
          employee_code: string
          full_name: string
          is_active: boolean
          kpi_achieved_days: number
          report_count: number
          sales_id: string
          target_customer_visits: number
          target_revenue: number
          target_sales_amount: number
          target_visit_points: number
        }[]
      }
      admin_today_overview: {
        Args: { p_date: string }
        Returns: {
          active_sales_count: number
          actual_customer_visits: number
          actual_revenue: number
          actual_sales_amount: number
          actual_visit_points: number
          completed_count: number
          morning_submitted_count: number
          no_report_count: number
          target_customer_visits: number
          target_revenue: number
          target_sales_amount: number
          target_visit_points: number
        }[]
      }
      is_active_sales: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      vn_today: { Args: never; Returns: string }
    }
    Enums: {
      report_status: "MORNING_SUBMITTED" | "COMPLETED"
      user_role: "ADMIN" | "SALES"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      report_status: ["MORNING_SUBMITTED", "COMPLETED"],
      user_role: ["ADMIN", "SALES"],
    },
  },
} as const

