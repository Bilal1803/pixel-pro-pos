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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      buybacks: {
        Row: {
          battery_health: string | null
          client_id: string | null
          color: string | null
          company_id: string
          created_at: string
          device_id: string | null
          employee_id: string | null
          id: string
          imei: string | null
          memory: string | null
          model: string
          notes: string | null
          purchase_price: number
          store_id: string | null
        }
        Insert: {
          battery_health?: string | null
          client_id?: string | null
          color?: string | null
          company_id: string
          created_at?: string
          device_id?: string | null
          employee_id?: string | null
          id?: string
          imei?: string | null
          memory?: string | null
          model: string
          notes?: string | null
          purchase_price: number
          store_id?: string | null
        }
        Update: {
          battery_health?: string | null
          client_id?: string | null
          color?: string | null
          company_id?: string
          created_at?: string
          device_id?: string | null
          employee_id?: string | null
          id?: string
          imei?: string | null
          memory?: string | null
          model?: string
          notes?: string | null
          purchase_price?: number
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buybacks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buybacks_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buybacks_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buybacks_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_operations: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          employee_id: string | null
          id: string
          reason: string | null
          shift_id: string | null
          store_id: string | null
          type: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          employee_id?: string | null
          id?: string
          reason?: string | null
          shift_id?: string | null
          store_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          employee_id?: string | null
          id?: string
          reason?: string | null
          shift_id?: string | null
          store_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_operations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_operations_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_operations_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          company_id: string
          created_at: string
          discount: number | null
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          total_spent: number | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          discount?: number | null
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          total_spent?: number | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          discount?: number | null
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          total_spent?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      devices: {
        Row: {
          battery_health: string | null
          brand: string | null
          color: string | null
          company_id: string
          created_at: string
          id: string
          imei: string
          memory: string | null
          model: string
          notes: string | null
          purchase_price: number | null
          sale_price: number | null
          status: Database["public"]["Enums"]["device_status"]
          store_id: string | null
          updated_at: string
        }
        Insert: {
          battery_health?: string | null
          brand?: string | null
          color?: string | null
          company_id: string
          created_at?: string
          id?: string
          imei: string
          memory?: string | null
          model: string
          notes?: string | null
          purchase_price?: number | null
          sale_price?: number | null
          status?: Database["public"]["Enums"]["device_status"]
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          battery_health?: string | null
          brand?: string | null
          color?: string | null
          company_id?: string
          created_at?: string
          id?: string
          imei?: string
          memory?: string | null
          model?: string
          notes?: string | null
          purchase_price?: number | null
          sale_price?: number | null
          status?: Database["public"]["Enums"]["device_status"]
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "devices_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devices_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          company_id: string
          created_at: string
          date: string
          description: string | null
          id: string
          store_id: string | null
        }
        Insert: {
          amount: number
          category: string
          company_id: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          store_id?: string | null
        }
        Update: {
          amount?: number
          category?: string
          company_id?: string
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          avito_url: string | null
          company_id: string
          created_at: string
          device_count: number | null
          group_name: string
          id: string
          last_refreshed: string | null
        }
        Insert: {
          avito_url?: string | null
          company_id: string
          created_at?: string
          device_count?: number | null
          group_name: string
          id?: string
          last_refreshed?: string | null
        }
        Update: {
          avito_url?: string | null
          company_id?: string
          created_at?: string
          device_count?: number | null
          group_name?: string
          id?: string
          last_refreshed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      price_monitoring: {
        Row: {
          avg_price: number | null
          company_id: string
          id: string
          model: string
          our_price: number | null
          prices: number[] | null
          updated_at: string
        }
        Insert: {
          avg_price?: number | null
          company_id: string
          id?: string
          model: string
          our_price?: number | null
          prices?: number[] | null
          updated_at?: string
        }
        Update: {
          avg_price?: number | null
          company_id?: string
          id?: string
          model?: string
          our_price?: number | null
          prices?: number[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_monitoring_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          company_id: string
          cost_price: number | null
          created_at: string
          id: string
          name: string
          sale_price: number | null
          stock: number | null
          store_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          company_id: string
          cost_price?: number | null
          created_at?: string
          id?: string
          name: string
          sale_price?: number | null
          stock?: number | null
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          company_id?: string
          cost_price?: number | null
          created_at?: string
          id?: string
          name?: string
          sale_price?: number | null
          stock?: number | null
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone: string | null
          store_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          phone?: string | null
          store_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone?: string | null
          store_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      repairs: {
        Row: {
          client_id: string | null
          company_id: string
          created_at: string
          device_description: string
          employee_id: string | null
          id: string
          issue: string
          notes: string | null
          price: number | null
          status: Database["public"]["Enums"]["repair_status"]
          store_id: string | null
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          company_id: string
          created_at?: string
          device_description: string
          employee_id?: string | null
          id?: string
          issue: string
          notes?: string | null
          price?: number | null
          status?: Database["public"]["Enums"]["repair_status"]
          store_id?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          company_id?: string
          created_at?: string
          device_description?: string
          employee_id?: string | null
          id?: string
          issue?: string
          notes?: string | null
          price?: number | null
          status?: Database["public"]["Enums"]["repair_status"]
          store_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "repairs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repairs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "repairs_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          cost_price: number | null
          device_id: string | null
          id: string
          item_type: Database["public"]["Enums"]["sale_item_type"]
          name: string
          price: number
          product_id: string | null
          quantity: number | null
          sale_id: string
        }
        Insert: {
          cost_price?: number | null
          device_id?: string | null
          id?: string
          item_type: Database["public"]["Enums"]["sale_item_type"]
          name: string
          price: number
          product_id?: string | null
          quantity?: number | null
          sale_id: string
        }
        Update: {
          cost_price?: number | null
          device_id?: string | null
          id?: string
          item_type?: Database["public"]["Enums"]["sale_item_type"]
          name?: string
          price?: number
          product_id?: string | null
          quantity?: number | null
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          client_id: string | null
          company_id: string
          created_at: string
          discount: number | null
          employee_id: string | null
          id: string
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          store_id: string | null
          total: number
        }
        Insert: {
          client_id?: string | null
          company_id: string
          created_at?: string
          discount?: number | null
          employee_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          store_id?: string | null
          total?: number
        }
        Update: {
          client_id?: string | null
          company_id?: string
          created_at?: string
          discount?: number | null
          employee_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          store_id?: string | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          cash_end: number | null
          cash_start: number | null
          company_id: string
          created_at: string
          employee_id: string
          end_time: string | null
          id: string
          start_time: string
          status: string
          store_id: string | null
        }
        Insert: {
          cash_end?: number | null
          cash_start?: number | null
          company_id: string
          created_at?: string
          employee_id: string
          end_time?: string | null
          id?: string
          start_time?: string
          status?: string
          store_id?: string | null
        }
        Update: {
          cash_end?: number | null
          cash_start?: number | null
          company_id?: string
          created_at?: string
          employee_id?: string
          end_time?: string | null
          id?: string
          start_time?: string
          status?: string
          store_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          company_id: string
          created_at: string
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_id: string
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_company_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "manager" | "employee"
      device_status:
        | "testing"
        | "available"
        | "reserved"
        | "sold"
        | "defective"
        | "rental"
      payment_method: "cash" | "card" | "transfer" | "installments" | "mixed"
      repair_status:
        | "accepted"
        | "in_progress"
        | "waiting_parts"
        | "ready"
        | "done"
      sale_item_type: "device" | "accessory" | "service" | "repair"
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
      app_role: ["owner", "manager", "employee"],
      device_status: [
        "testing",
        "available",
        "reserved",
        "sold",
        "defective",
        "rental",
      ],
      payment_method: ["cash", "card", "transfer", "installments", "mixed"],
      repair_status: [
        "accepted",
        "in_progress",
        "waiting_parts",
        "ready",
        "done",
      ],
      sale_item_type: ["device", "accessory", "service", "repair"],
    },
  },
} as const
