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
      amis_employee_metrics: {
        Row: {
          current_amount: number | null
          employee_name: string
          net_sales: number | null
          no_of_orders: number | null
          org_unit_name: string | null
          period_month: string
          qty_account_in_charge: number | null
          qty_account_interactive: number | null
          qty_account_sold: number | null
          qty_account_sold_this_period: number | null
          receive_amount: number | null
          return_sales: number | null
          sales: number | null
          synced_at: string
          target_amount: number | null
        }
        Insert: {
          current_amount?: number | null
          employee_name: string
          net_sales?: number | null
          no_of_orders?: number | null
          org_unit_name?: string | null
          period_month: string
          qty_account_in_charge?: number | null
          qty_account_interactive?: number | null
          qty_account_sold?: number | null
          qty_account_sold_this_period?: number | null
          receive_amount?: number | null
          return_sales?: number | null
          sales?: number | null
          synced_at?: string
          target_amount?: number | null
        }
        Update: {
          current_amount?: number | null
          employee_name?: string
          net_sales?: number | null
          no_of_orders?: number | null
          org_unit_name?: string | null
          period_month?: string
          qty_account_in_charge?: number | null
          qty_account_interactive?: number | null
          qty_account_sold?: number | null
          qty_account_sold_this_period?: number | null
          receive_amount?: number | null
          return_sales?: number | null
          sales?: number | null
          synced_at?: string
          target_amount?: number | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: number
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      care_logs: {
        Row: {
          channel: string
          created_at: string
          customer_id: string
          direction: string | null
          id: string
          occurred_at: string
          outcome: string | null
          sales_id: string | null
          source_id: string
          source_system: string
          source_updated_at: string | null
          summary: string | null
          synced_at: string
          updated_at: string
        }
        Insert: {
          channel: string
          created_at?: string
          customer_id: string
          direction?: string | null
          id?: string
          occurred_at: string
          outcome?: string | null
          sales_id?: string | null
          source_id: string
          source_system?: string
          source_updated_at?: string | null
          summary?: string | null
          synced_at?: string
          updated_at?: string
        }
        Update: {
          channel?: string
          created_at?: string
          customer_id?: string
          direction?: string | null
          id?: string
          occurred_at?: string
          outcome?: string | null
          sales_id?: string | null
          source_id?: string
          source_system?: string
          source_updated_at?: string | null
          summary?: string | null
          synced_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_logs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "care_logs_sales_id_fkey"
            columns: ["sales_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      checkins: {
        Row: {
          checked_in_at: string
          created_at: string
          customer_id: string | null
          id: string
          image_url: string | null
          latitude: number | null
          longitude: number | null
          note: string | null
          sales_id: string
          source_id: string
          source_system: string
          source_updated_at: string | null
          synced_at: string
          updated_at: string
        }
        Insert: {
          checked_in_at: string
          created_at?: string
          customer_id?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          note?: string | null
          sales_id: string
          source_id: string
          source_system?: string
          source_updated_at?: string | null
          synced_at?: string
          updated_at?: string
        }
        Update: {
          checked_in_at?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          image_url?: string | null
          latitude?: number | null
          longitude?: number | null
          note?: string | null
          sales_id?: string
          source_id?: string
          source_system?: string
          source_updated_at?: string | null
          synced_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkins_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checkins_sales_id_fkey"
            columns: ["sales_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_care_evidence: {
        Row: {
          bytes: number
          cloudinary_asset_id: string
          cloudinary_public_id: string
          created_at: string
          delivery_type: string
          format: string
          height: number | null
          id: string
          resource_type: string
          secure_url: string
          submission_id: string
          width: number | null
        }
        Insert: {
          bytes: number
          cloudinary_asset_id: string
          cloudinary_public_id: string
          created_at?: string
          delivery_type?: string
          format: string
          height?: number | null
          id?: string
          resource_type?: string
          secure_url: string
          submission_id: string
          width?: number | null
        }
        Update: {
          bytes?: number
          cloudinary_asset_id?: string
          cloudinary_public_id?: string
          created_at?: string
          delivery_type?: string
          format?: string
          height?: number | null
          id?: string
          resource_type?: string
          secure_url?: string
          submission_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_care_evidence_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "customer_care_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_care_submissions: {
        Row: {
          care_date: string
          created_at: string
          customer_code: string
          customer_name: string
          id: string
          misa_customer_id: number
          misa_employee_id: number
          note: string | null
          period_month: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          status: Database["public"]["Enums"]["customer_care_status"]
          submitted_by: string
          updated_at: string
        }
        Insert: {
          care_date: string
          created_at?: string
          customer_code: string
          customer_name: string
          id?: string
          misa_customer_id: number
          misa_employee_id: number
          note?: string | null
          period_month: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          status?: Database["public"]["Enums"]["customer_care_status"]
          submitted_by: string
          updated_at?: string
        }
        Update: {
          care_date?: string
          created_at?: string
          customer_code?: string
          customer_name?: string
          id?: string
          misa_customer_id?: number
          misa_employee_id?: number
          note?: string | null
          period_month?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          status?: Database["public"]["Enums"]["customer_care_status"]
          submitted_by?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_care_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_care_submissions_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_care_submissions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          assigned_sales_id: string | null
          created_at: string
          customer_code: string | null
          customer_name: string
          dealer_tier: Database["public"]["Enums"]["dealer_tier"]
          id: string
          is_active: boolean
          normalized_phone: string | null
          phone: string | null
          province: string | null
          region: string | null
          salework_account: string | null
          source_id: string
          source_system: string
          source_updated_at: string | null
          synced_at: string
          updated_at: string
          zalo_account: string | null
        }
        Insert: {
          assigned_sales_id?: string | null
          created_at?: string
          customer_code?: string | null
          customer_name: string
          dealer_tier?: Database["public"]["Enums"]["dealer_tier"]
          id?: string
          is_active?: boolean
          normalized_phone?: string | null
          phone?: string | null
          province?: string | null
          region?: string | null
          salework_account?: string | null
          source_id: string
          source_system?: string
          source_updated_at?: string | null
          synced_at?: string
          updated_at?: string
          zalo_account?: string | null
        }
        Update: {
          assigned_sales_id?: string | null
          created_at?: string
          customer_code?: string | null
          customer_name?: string
          dealer_tier?: Database["public"]["Enums"]["dealer_tier"]
          id?: string
          is_active?: boolean
          normalized_phone?: string | null
          phone?: string | null
          province?: string | null
          region?: string | null
          salework_account?: string | null
          source_id?: string
          source_system?: string
          source_updated_at?: string | null
          synced_at?: string
          updated_at?: string
          zalo_account?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_assigned_sales_id_fkey"
            columns: ["assigned_sales_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      debts: {
        Row: {
          created_at: string
          customer_id: string
          document_code: string | null
          document_date: string | null
          due_date: string | null
          id: string
          original_amount: number
          outstanding_amount: number
          source_id: string
          source_system: string
          source_updated_at: string | null
          status: string
          synced_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          document_code?: string | null
          document_date?: string | null
          due_date?: string | null
          id?: string
          original_amount?: number
          outstanding_amount?: number
          source_id: string
          source_system?: string
          source_updated_at?: string | null
          status?: string
          synced_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          document_code?: string | null
          document_date?: string | null
          due_date?: string | null
          id?: string
          original_amount?: number
          outstanding_amount?: number
          source_id?: string
          source_system?: string
          source_updated_at?: string | null
          status?: string
          synced_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "debts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      hatde_branch_snapshots: {
        Row: {
          branch_code: string
          id: string
          revenue: number
          snapshot_id: string
          transactions: number
          vs_last_week: number
          vs_yesterday: number
        }
        Insert: {
          branch_code: string
          id?: string
          revenue: number
          snapshot_id: string
          transactions: number
          vs_last_week: number
          vs_yesterday: number
        }
        Update: {
          branch_code?: string
          id?: string
          revenue?: number
          snapshot_id?: string
          transactions?: number
          vs_last_week?: number
          vs_yesterday?: number
        }
        Relationships: [
          {
            foreignKeyName: "hatde_branch_snapshots_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "hatde_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      hatde_snapshots: {
        Row: {
          created_at: string
          id: string
          report_date: string
          report_time: string
          total_revenue: number
          total_transactions: number
        }
        Insert: {
          created_at?: string
          id?: string
          report_date: string
          report_time: string
          total_revenue: number
          total_transactions: number
        }
        Update: {
          created_at?: string
          id?: string
          report_date?: string
          report_time?: string
          total_revenue?: number
          total_transactions?: number
        }
        Relationships: []
      }
      inventory: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity_available: number | null
          quantity_on_hand: number
          quantity_reserved: number
          source_system: string
          source_updated_at: string | null
          synced_at: string
          updated_at: string
          warehouse_code: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity_available?: number | null
          quantity_on_hand?: number
          quantity_reserved?: number
          source_system?: string
          source_updated_at?: string | null
          synced_at?: string
          updated_at?: string
          warehouse_code: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity_available?: number | null
          quantity_on_hand?: number
          quantity_reserved?: number
          source_system?: string
          source_updated_at?: string | null
          synced_at?: string
          updated_at?: string
          warehouse_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_ad_top_ups: {
        Row: {
          amount: number
          marketplace_code: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount?: number
          marketplace_code: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          marketplace_code?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_ad_top_ups_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      misa_customer_monthly_plans: {
        Row: {
          committed_sales: number | null
          misa_customer_id: number
          misa_employee_id: number
          monthly_frequency: number
          period_month: string
          sales_id: string
          updated_at: string
        }
        Insert: {
          committed_sales?: number | null
          misa_customer_id: number
          misa_employee_id: number
          monthly_frequency: number
          period_month: string
          sales_id: string
          updated_at?: string
        }
        Update: {
          committed_sales?: number | null
          misa_customer_id?: number
          misa_employee_id?: number
          monthly_frequency?: number
          period_month?: string
          sales_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "misa_customer_monthly_plans_sales_id_fkey"
            columns: ["sales_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      misa_report119_customers: {
        Row: {
          billing_province: string
          customer_code: string
          customer_name: string
          days_without_purchase: number | null
          debt: number | null
          last_visit_date: string | null
          misa_customer_id: number
          misa_employee_id: number
          order_sales: number | null
          owner_name: string
          period_month: string
          phone: string | null
          recent_purchase_date: string | null
          synced_at: string
        }
        Insert: {
          billing_province?: string
          customer_code?: string
          customer_name?: string
          days_without_purchase?: number | null
          debt?: number | null
          last_visit_date?: string | null
          misa_customer_id: number
          misa_employee_id: number
          order_sales?: number | null
          owner_name?: string
          period_month: string
          phone?: string | null
          recent_purchase_date?: string | null
          synced_at?: string
        }
        Update: {
          billing_province?: string
          customer_code?: string
          customer_name?: string
          days_without_purchase?: number | null
          debt?: number | null
          last_visit_date?: string | null
          misa_customer_id?: number
          misa_employee_id?: number
          order_sales?: number | null
          owner_name?: string
          period_month?: string
          phone?: string | null
          recent_purchase_date?: string | null
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "misa_report119_customers_period_month_misa_employee_id_fkey"
            columns: ["period_month", "misa_employee_id"]
            isOneToOne: false
            referencedRelation: "misa_report119_employees"
            referencedColumns: ["period_month", "misa_employee_id"]
          },
        ]
      }
      misa_report119_employees: {
        Row: {
          customer_count: number
          employee_name: string
          misa_employee_id: number
          period_month: string
          synced_at: string
        }
        Insert: {
          customer_count: number
          employee_name: string
          misa_employee_id: number
          period_month: string
          synced_at?: string
        }
        Update: {
          customer_count?: number
          employee_name?: string
          misa_employee_id?: number
          period_month?: string
          synced_at?: string
        }
        Relationships: []
      }
      misa_report44_customer_monthly_sales: {
        Row: {
          customer_code: string
          customer_name: string
          order_sales: number
          period_month: string
          synced_at: string
        }
        Insert: {
          customer_code: string
          customer_name?: string
          order_sales: number
          period_month: string
          synced_at?: string
        }
        Update: {
          customer_code?: string
          customer_name?: string
          order_sales?: number
          period_month?: string
          synced_at?: string
        }
        Relationships: []
      }
      monthly_participant_salaries: {
        Row: {
          amount: number | null
          participant_key: string
          period_month: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount?: number | null
          participant_key: string
          period_month: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number | null
          participant_key?: string
          period_month?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_participant_salaries_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_participant_travel_expenses: {
        Row: {
          amount: number | null
          participant_key: string
          period_month: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount?: number | null
          participant_key: string
          period_month: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number | null
          participant_key?: string
          period_month?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_participant_travel_expenses_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_sync_jobs: {
        Row: {
          completed_at: string | null
          error_message: string | null
          id: string
          period_month: string
          requested_at: string
          requested_by: string
          started_at: string | null
          status: string
          synced_rows: number | null
        }
        Insert: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          period_month: string
          requested_at?: string
          requested_by: string
          started_at?: string | null
          status?: string
          synced_rows?: number | null
        }
        Update: {
          completed_at?: string | null
          error_message?: string | null
          id?: string
          period_month?: string
          requested_at?: string
          requested_by?: string
          started_at?: string | null
          status?: string
          synced_rows?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "monthly_sync_jobs_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      order_lines: {
        Row: {
          created_at: string
          discount_amount: number
          id: string
          line_total: number
          order_id: string
          product_id: string | null
          quantity: number
          source_line_id: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          discount_amount?: number
          id?: string
          line_total?: number
          order_id: string
          product_id?: string | null
          quantity: number
          source_line_id: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          discount_amount?: number
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string | null
          quantity?: number
          source_line_id?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_lines_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_lines_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          assigned_sales_id: string | null
          created_at: string
          currency_code: string
          customer_id: string | null
          discount_amount: number
          id: string
          order_code: string
          order_date: string
          source_id: string
          source_system: string
          source_updated_at: string | null
          status: string
          subtotal: number
          synced_at: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          assigned_sales_id?: string | null
          created_at?: string
          currency_code?: string
          customer_id?: string | null
          discount_amount?: number
          id?: string
          order_code: string
          order_date: string
          source_id: string
          source_system?: string
          source_updated_at?: string | null
          status: string
          subtotal?: number
          synced_at?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          assigned_sales_id?: string | null
          created_at?: string
          currency_code?: string
          customer_id?: string | null
          discount_amount?: number
          id?: string
          order_code?: string
          order_date?: string
          source_id?: string
          source_system?: string
          source_updated_at?: string | null
          status?: string
          subtotal?: number
          synced_at?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_assigned_sales_id_fkey"
            columns: ["assigned_sales_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      pancake_daily_reports: {
        Row: {
          ads_gmv: number
          ads_order_count: number
          cancelled_count: number
          cancelled_revenue: number
          currency_code: string
          employee_name: string
          late_count: number
          market_code: string
          order_count: number
          report_date: string
          returned_count: number
          revenue: number
          shop_id: number
          synced_at: string
        }
        Insert: {
          ads_gmv: number
          ads_order_count: number
          cancelled_count: number
          cancelled_revenue?: number
          currency_code?: string
          employee_name?: string
          late_count: number
          market_code?: string
          order_count: number
          report_date: string
          returned_count: number
          revenue: number
          shop_id: number
          synced_at?: string
        }
        Update: {
          ads_gmv?: number
          ads_order_count?: number
          cancelled_count?: number
          cancelled_revenue?: number
          currency_code?: string
          employee_name?: string
          late_count?: number
          market_code?: string
          order_count?: number
          report_date?: string
          returned_count?: number
          revenue?: number
          shop_id?: number
          synced_at?: string
        }
        Relationships: []
      }
      pancake_daily_source_reports: {
        Row: {
          order_count: number
          report_date: string
          revenue: number
          shop_id: number
          source_name: string
          synced_at: string
        }
        Insert: {
          order_count: number
          report_date: string
          revenue: number
          shop_id: number
          source_name: string
          synced_at?: string
        }
        Update: {
          order_count?: number
          report_date?: string
          revenue?: number
          shop_id?: number
          source_name?: string
          synced_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pancake_daily_source_reports_report_date_shop_id_fkey"
            columns: ["report_date", "shop_id"]
            isOneToOne: false
            referencedRelation: "pancake_daily_reports"
            referencedColumns: ["report_date", "shop_id"]
          },
        ]
      }
      pancake_marketplace_financial_reports: {
        Row: {
          ads_top_up: number
          affiliate_commission: number
          capital: number
          cod: number
          currency_code: string
          delivered_count: number
          diff_shipping_fee: number
          gross_sales: number
          marketing_fee: number
          marketplace_code: string
          marketplace_fee: number
          marketplace_tax: number
          marketplace_voucher: number
          payment_fee: number
          platform_commission: number
          platform_receivable: number
          platform_shipping_fee: number
          prepaid: number
          report_date: string
          seller_transaction_fee: number
          service_fee: number
          sfp_service_fee: number
          shop_discount: number
          shop_id: number
          synced_at: string
        }
        Insert: {
          ads_top_up: number
          affiliate_commission: number
          capital: number
          cod: number
          currency_code: string
          delivered_count: number
          diff_shipping_fee: number
          gross_sales: number
          marketing_fee: number
          marketplace_code: string
          marketplace_fee: number
          marketplace_tax: number
          marketplace_voucher: number
          payment_fee: number
          platform_commission: number
          platform_receivable: number
          platform_shipping_fee: number
          prepaid: number
          report_date: string
          seller_transaction_fee: number
          service_fee: number
          sfp_service_fee: number
          shop_discount: number
          shop_id: number
          synced_at?: string
        }
        Update: {
          ads_top_up?: number
          affiliate_commission?: number
          capital?: number
          cod?: number
          currency_code?: string
          delivered_count?: number
          diff_shipping_fee?: number
          gross_sales?: number
          marketing_fee?: number
          marketplace_code?: string
          marketplace_fee?: number
          marketplace_tax?: number
          marketplace_voucher?: number
          payment_fee?: number
          platform_commission?: number
          platform_receivable?: number
          platform_shipping_fee?: number
          prepaid?: number
          report_date?: string
          seller_transaction_fee?: number
          service_fee?: number
          sfp_service_fee?: number
          shop_discount?: number
          shop_id?: number
          synced_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          color: string
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          product_code: string
          product_name: string
          size: string
          source_id: string
          source_system: string
          source_updated_at: string | null
          synced_at: string
          unit: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          product_code: string
          product_name: string
          size?: string
          source_id: string
          source_system?: string
          source_updated_at?: string | null
          synced_at?: string
          unit?: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          product_code?: string
          product_name?: string
          size?: string
          source_id?: string
          source_system?: string
          source_updated_at?: string | null
          synced_at?: string
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          amis_employee_name: string | null
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
          amis_employee_name?: string | null
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
          amis_employee_name?: string | null
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
      sales_monthly_salaries: {
        Row: {
          amount: number | null
          period_month: string
          sales_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount?: number | null
          period_month: string
          sales_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number | null
          period_month?: string
          sales_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_monthly_salaries_sales_id_fkey"
            columns: ["sales_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_monthly_salaries_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_monthly_targets: {
        Row: {
          period_month: string
          sales_id: string
          target_revenue: number | null
          target_sales_amount: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          period_month: string
          sales_id: string
          target_revenue?: number | null
          target_sales_amount?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          period_month?: string
          sales_id?: string
          target_revenue?: number | null
          target_sales_amount?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_monthly_targets_sales_id_fkey"
            columns: ["sales_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_monthly_targets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_monthly_travel_expenses: {
        Row: {
          amount: number | null
          period_month: string
          sales_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount?: number | null
          period_month: string
          sales_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number | null
          period_month?: string
          sales_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_monthly_travel_expenses_sales_id_fkey"
            columns: ["sales_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_monthly_travel_expenses_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shopee_ad_balance_snapshots: {
        Row: {
          available_cash_balance: number
          captured_at: string
          currency_code: string
          id: number
          synced_at: string
        }
        Insert: {
          available_cash_balance: number
          captured_at: string
          currency_code?: string
          id?: never
          synced_at?: string
        }
        Update: {
          available_cash_balance?: number
          captured_at?: string
          currency_code?: string
          id?: never
          synced_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          due_at: string | null
          id: string
          order_id: string | null
          priority: number
          source_id: string | null
          source_system: string
          status: Database["public"]["Enums"]["operational_task_status"]
          task_type: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          order_id?: string | null
          priority?: number
          source_id?: string | null
          source_system?: string
          status?: Database["public"]["Enums"]["operational_task_status"]
          task_type: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          order_id?: string | null
          priority?: number
          source_id?: string | null
          source_system?: string
          status?: Database["public"]["Enums"]["operational_task_status"]
          task_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      tiktok_ad_balance_snapshots: {
        Row: {
          available_cash_balance: number
          captured_at: string
          currency_code: string
          id: number
          payment_portfolio_id: string
          synced_at: string
        }
        Insert: {
          available_cash_balance: number
          captured_at: string
          currency_code?: string
          id?: never
          payment_portfolio_id: string
          synced_at?: string
        }
        Update: {
          available_cash_balance?: number
          captured_at?: string
          currency_code?: string
          id?: never
          payment_portfolio_id?: string
          synced_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      amis_reconciliation: {
        Row: {
          amis_current: number | null
          amis_customer_visits: number | null
          amis_only: boolean | null
          amis_orders: number | null
          amis_receivable: number | null
          amis_revenue: number | null
          amis_target: number | null
          bikeforce_only: boolean | null
          completed_days: number | null
          customer_visits_diff: number | null
          employee_code: string | null
          full_name: string | null
          orders_diff: number | null
          period_month: string | null
          reported_customer_visits: number | null
          reported_revenue: number | null
          reported_sales_quantity: number | null
          revenue_diff: number | null
          sales_id: string | null
          synced_at: string | null
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
      customer_duplicate_candidates: {
        Row: {
          customer_codes: string[] | null
          customer_count: number | null
          customer_ids: string[] | null
          customer_names: string[] | null
          normalized_phone: string | null
        }
        Relationships: []
      }
      customer_effective_care_dates: {
        Row: {
          customer_code: string | null
          customer_name: string | null
          effective_last_care_date: string | null
          last_visit_date: string | null
          latest_approved_care_date: string | null
          misa_customer_id: number | null
          misa_employee_id: number | null
          period_month: string | null
        }
        Relationships: [
          {
            foreignKeyName: "misa_report119_customers_period_month_misa_employee_id_fkey"
            columns: ["period_month", "misa_employee_id"]
            isOneToOne: false
            referencedRelation: "misa_report119_employees"
            referencedColumns: ["period_month", "misa_employee_id"]
          },
        ]
      }
    }
    Functions: {
      admin_monthly_revenue_target_trend: {
        Args: { p_year: number }
        Returns: {
          actual_revenue: number
          period_month: string
          target_revenue: number
        }[]
      }
      admin_monthly_sales_target_trend: {
        Args: { p_year: number }
        Returns: {
          actual_sales_amount: number
          period_month: string
          target_sales_amount: number
        }[]
      }
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
      get_admin_inventory_warehouses: {
        Args: never
        Returns: {
          in_stock_count: number
          latest_synced_at: string | null
          product_count: number
          quantity_on_hand: number
          warehouse_code: string
        }[]
      }
      get_admin_order_summary: {
        Args: { p_from: string; p_to: string }
        Returns: {
          customer_count: number
          latest_synced_at: string | null
          order_count: number
          outstanding_amount: number
          total_amount: number
        }[]
      }
      get_latest_pancake_report_image: { Args: never; Returns: Json }
      get_marketplace_ad_finance_summary: {
        Args: never
        Returns: {
          ads_top_up: number
          available_balance: number
          balance_captured_at: string
          marketplace_code: string
        }[]
      }
      get_pancake_month_sources: {
        Args: { p_from: string; p_to: string }
        Returns: {
          order_count: number
          revenue: number
          source_name: string
        }[]
      }
      get_pancake_month_summary: {
        Args: { p_from: string; p_to: string }
        Returns: {
          ads_gmv: number
          ads_order_count: number
          cancelled_count: number
          day_count: number
          late_count: number
          latest_synced_at: string
          order_count: number
          returned_count: number
          revenue: number
        }[]
      }
      insert_shopee_ad_balance_snapshot: {
        Args: {
          p_available_cash_balance: number
          p_captured_at: string
          p_currency_code: string
        }
        Returns: number
      }
      insert_tiktok_ad_balance_snapshot: {
        Args: {
          p_available_cash_balance: number
          p_captured_at: string
          p_currency_code: string
          p_payment_portfolio_id: string
        }
        Returns: number
      }
      is_active_sales: { Args: never; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      normalize_vn_phone: { Args: { p_phone: string }; Returns: string }
      replace_misa_report119_snapshot: {
        Args: { p_customers: Json; p_employees: Json; p_period_month: string }
        Returns: number
      }
      replace_misa_report44_customer_sales: {
        Args: { p_from_month: string; p_rows: Json; p_to_month: string }
        Returns: number
      }
      save_monthly_salary_entries: {
        Args: { p_entries: Json; p_period_month: string }
        Returns: number
      }
      save_monthly_travel_expense_entries: {
        Args: { p_entries: Json; p_period_month: string }
        Returns: number
      }
      set_marketplace_ad_top_up: {
        Args: { p_amount: number; p_marketplace_code: string }
        Returns: undefined
      }
      sync_operational_customers_from_report119: {
        Args: { p_period_month?: string }
        Returns: {
          inserted_or_updated: number
          period_month: string
        }[]
      }
      sync_salework_zalo_customers: {
        Args: { p_contacts: Json }
        Returns: number
      }
      sync_misa_crm_customer_directory: {
        Args: { p_customers: Json }
        Returns: number
      }
      upsert_hatde_snapshot: {
        Args: {
          p_branches: Json
          p_report_date: string
          p_report_time: string
          p_total_revenue: number
          p_total_transactions: number
        }
        Returns: Json
      }
      upsert_misa_inventory: {
        Args: { p_items: Json; p_stock_code: string }
        Returns: number
      }
      upsert_misa_sale_orders: {
        Args: { p_orders: Json }
        Returns: {
          debt_count: number
          line_count: number
          order_count: number
          product_count: number
        }[]
      }
      upsert_pancake_daily_report: {
        Args: {
          p_ads_gmv: number
          p_ads_order_count: number
          p_cancelled_count: number
          p_cancelled_revenue?: number
          p_late_count: number
          p_order_count: number
          p_report_date: string
          p_returned_count: number
          p_revenue: number
          p_shop_id: number
          p_sources: Json
        }
        Returns: number
      }
      upsert_pancake_marketplace_financials: {
        Args: {
          p_currency_code: string
          p_marketplaces: Json
          p_report_date: string
          p_shop_id: number
        }
        Returns: number
      }
      vn_today: { Args: never; Returns: string }
    }
    Enums: {
      customer_care_status: "PENDING" | "APPROVED" | "REJECTED" | "REVOKED"
      dealer_tier: "STANDARD" | "PARTNER" | "STRATEGIC" | "SPECIALIST"
      operational_task_status: "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED"
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
  public: {
    Enums: {
      customer_care_status: ["PENDING", "APPROVED", "REJECTED", "REVOKED"],
      dealer_tier: ["STANDARD", "PARTNER", "STRATEGIC", "SPECIALIST"],
      operational_task_status: ["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"],
      report_status: ["MORNING_SUBMITTED", "COMPLETED"],
      user_role: ["ADMIN", "SALES"],
    },
  },
} as const

