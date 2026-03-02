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
      addresses: {
        Row: {
          cep: string | null
          city: string | null
          complement: string | null
          created_at: string | null
          id: string | null
          is_default: boolean | null
          label: string | null
          name: string | null
          neighborhood: string | null
          number: string | null
          phone: string | null
          state: string | null
          street: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cep?: string | null
          city?: string | null
          complement?: string | null
          created_at?: string | null
          id?: string | null
          is_default?: boolean | null
          label?: string | null
          name?: string | null
          neighborhood?: string | null
          number?: string | null
          phone?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cep?: string | null
          city?: string | null
          complement?: string | null
          created_at?: string | null
          id?: string | null
          is_default?: boolean | null
          label?: string | null
          name?: string | null
          neighborhood?: string | null
          number?: string | null
          phone?: string | null
          state?: string | null
          street?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      attribute_values: {
        Row: {
          attribute_id: string | null
          created_at: string | null
          id: string | null
          meta_value: string | null
          sort_order: number | null
          value: string | null
        }
        Insert: {
          attribute_id?: string | null
          created_at?: string | null
          id?: string | null
          meta_value?: string | null
          sort_order?: number | null
          value?: string | null
        }
        Update: {
          attribute_id?: string | null
          created_at?: string | null
          id?: string | null
          meta_value?: string | null
          sort_order?: number | null
          value?: string | null
        }
        Relationships: []
      }
      attributes: {
        Row: {
          created_at: string | null
          id: string | null
          name: string | null
          slug: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          name?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          name?: string | null
          slug?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string | null
          created_at: string | null
          details: string | null
          id: string | null
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          details?: string | null
          id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          details?: string | null
          id?: string | null
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string | null
          id: string | null
          product_id: string | null
          quantity: number | null
          updated_at: string | null
          user_id: string | null
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          product_id?: string | null
          quantity?: number | null
          updated_at?: string | null
          user_id?: string | null
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          product_id?: string | null
          quantity?: number | null
          updated_at?: string | null
          user_id?: string | null
          variant_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string | null
          image_url: string | null
          is_active: boolean | null
          name: string | null
          parent_id: string | null
          slug: string | null
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          name?: string | null
          parent_id?: string | null
          slug?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          name?: string | null
          parent_id?: string | null
          slug?: string | null
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      coupon_uses: {
        Row: {
          coupon_id: string | null
          created_at: string | null
          discount_applied: number | null
          id: string | null
          order_id: string | null
        }
        Insert: {
          coupon_id?: string | null
          created_at?: string | null
          discount_applied?: number | null
          id?: string | null
          order_id?: string | null
        }
        Update: {
          coupon_id?: string | null
          created_at?: string | null
          discount_applied?: number | null
          id?: string | null
          order_id?: string | null
        }
        Relationships: []
      }
      coupons: {
        Row: {
          code: string | null
          created_at: string | null
          current_uses: number | null
          description: string | null
          discount_type: string | null
          discount_value: number | null
          id: string | null
          is_active: boolean | null
          max_discount: number | null
          max_uses: number | null
          min_order_value: number | null
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string | null
          is_active?: boolean | null
          max_discount?: number | null
          max_uses?: number | null
          min_order_value?: number | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type?: string | null
          discount_value?: number | null
          id?: string | null
          is_active?: boolean | null
          max_discount?: number | null
          max_uses?: number | null
          min_order_value?: number | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          cart_items: string | null
          cart_total: number | null
          converted_at: string | null
          created_at: string | null
          document: string | null
          email: string | null
          id: string | null
          name: string | null
          notes: string | null
          order_id: string | null
          phone: string | null
          recovery_email_sent_at: string | null
          source: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          cart_items?: string | null
          cart_total?: number | null
          converted_at?: string | null
          created_at?: string | null
          document?: string | null
          email?: string | null
          id?: string | null
          name?: string | null
          notes?: string | null
          order_id?: string | null
          phone?: string | null
          recovery_email_sent_at?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          cart_items?: string | null
          cart_total?: number | null
          converted_at?: string | null
          created_at?: string | null
          document?: string | null
          email?: string | null
          id?: string | null
          name?: string | null
          notes?: string | null
          order_id?: string | null
          phone?: string | null
          recovery_email_sent_at?: string | null
          source?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string | null
          order_id: string | null
          quantity: number | null
          unit_price: number | null
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          order_id?: string | null
          quantity?: number | null
          unit_price?: number | null
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          order_id?: string | null
          quantity?: number | null
          unit_price?: number | null
          variant_id?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          created_at: string | null
          id: string | null
          internal_notes: string | null
          metadata: string | null
          payment_id: string | null
          payment_method: string | null
          shipping_address: string | null
          status: string | null
          supplier_order_id: string | null
          total_amount: number | null
          tracking_token: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          internal_notes?: string | null
          metadata?: string | null
          payment_id?: string | null
          payment_method?: string | null
          shipping_address?: string | null
          status?: string | null
          supplier_order_id?: string | null
          total_amount?: number | null
          tracking_token?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          internal_notes?: string | null
          metadata?: string | null
          payment_id?: string | null
          payment_method?: string | null
          shipping_address?: string | null
          status?: string | null
          supplier_order_id?: string | null
          total_amount?: number | null
          tracking_token?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string | null
          id: string | null
          image_url: string | null
          product_id: string | null
          sort_order: number | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          id?: string | null
          image_url?: string | null
          product_id?: string | null
          sort_order?: number | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          id?: string | null
          image_url?: string | null
          product_id?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      product_reviews: {
        Row: {
          content: string | null
          created_at: string | null
          id: string | null
          is_approved: boolean | null
          is_verified_purchase: boolean | null
          product_id: string | null
          rating: number | null
          reviewer_name: string | null
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string | null
          is_approved?: boolean | null
          is_verified_purchase?: boolean | null
          product_id?: string | null
          rating?: number | null
          reviewer_name?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string | null
          is_approved?: boolean | null
          is_verified_purchase?: boolean | null
          product_id?: string | null
          rating?: number | null
          reviewer_name?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          base_price: number | null
          category: string | null
          category_id: string | null
          created_at: string | null
          description: string | null
          height: number | null
          id: string | null
          image_url: string | null
          is_active: boolean | null
          length: number | null
          metadata: string | null
          promotion_expires_at: string | null
          promotional_price: number | null
          slug: string | null
          technical_specs: string | null
          title: string | null
          updated_at: string | null
          weight: number | null
          width: number | null
        }
        Insert: {
          base_price?: number | null
          category?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          height?: number | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          length?: number | null
          metadata?: string | null
          promotion_expires_at?: string | null
          promotional_price?: number | null
          slug?: string | null
          technical_specs?: string | null
          title?: string | null
          updated_at?: string | null
          weight?: number | null
          width?: number | null
        }
        Update: {
          base_price?: number | null
          category?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          height?: number | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          length?: number | null
          metadata?: string | null
          promotion_expires_at?: string | null
          promotional_price?: number | null
          slug?: string | null
          technical_specs?: string | null
          title?: string | null
          updated_at?: string | null
          weight?: number | null
          width?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          document: string | null
          document_type: string | null
          full_name: string | null
          id: string | null
          phone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          document?: string | null
          document_type?: string | null
          full_name?: string | null
          id?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          document?: string | null
          document_type?: string | null
          full_name?: string | null
          id?: string | null
          phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      saved_cards: {
        Row: {
          card_brand: string | null
          card_holder_name: string | null
          card_id: string | null
          created_at: string | null
          customer_id: string | null
          expiration_month: number | null
          expiration_year: number | null
          first_six_digits: string | null
          id: string | null
          is_default: boolean | null
          last_four_digits: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          card_brand?: string | null
          card_holder_name?: string | null
          card_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          expiration_month?: number | null
          expiration_year?: number | null
          first_six_digits?: string | null
          id?: string | null
          is_default?: boolean | null
          last_four_digits?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          card_brand?: string | null
          card_holder_name?: string | null
          card_id?: string | null
          created_at?: string | null
          customer_id?: string | null
          expiration_month?: number | null
          expiration_year?: number | null
          first_six_digits?: string | null
          id?: string | null
          is_default?: boolean | null
          last_four_digits?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      scheduled_deletions: {
        Row: {
          cancelled_at: string | null
          created_at: string | null
          id: string | null
          reason: string | null
          scheduled_for: string | null
          user_id: string | null
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string | null
          id?: string | null
          reason?: string | null
          scheduled_for?: string | null
          user_id?: string | null
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string | null
          id?: string | null
          reason?: string | null
          scheduled_for?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          cnpj: string | null
          created_at: string | null
          email: string | null
          facebook_url: string | null
          favicon_url: string | null
          free_shipping_minimum: number | null
          hub_api_key: string | null
          hub_auto_update_prices: boolean | null
          hub_last_sync_at: string | null
          hub_url: string | null
          id: string | null
          instagram_url: string | null
          interest_free_installments: number | null
          linkedin_url: string | null
          logo_url: string | null
          max_installments: number | null
          monthly_interest_rate: number | null
          mp_environment: string | null
          mp_production_access_token: string | null
          mp_production_public_key: string | null
          mp_sandbox_access_token: string | null
          mp_sandbox_public_key: string | null
          origin_city: string | null
          origin_state: string | null
          origin_zip: string | null
          phone: string | null
          primary_color: string | null
          secondary_color: string | null
          store_name: string | null
          updated_at: string | null
          whatsapp: string | null
          youtube_url: string | null
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          facebook_url?: string | null
          favicon_url?: string | null
          free_shipping_minimum?: number | null
          hub_api_key?: string | null
          hub_auto_update_prices?: boolean | null
          hub_last_sync_at?: string | null
          hub_url?: string | null
          id?: string | null
          instagram_url?: string | null
          interest_free_installments?: number | null
          linkedin_url?: string | null
          logo_url?: string | null
          max_installments?: number | null
          monthly_interest_rate?: number | null
          mp_environment?: string | null
          mp_production_access_token?: string | null
          mp_production_public_key?: string | null
          mp_sandbox_access_token?: string | null
          mp_sandbox_public_key?: string | null
          origin_city?: string | null
          origin_state?: string | null
          origin_zip?: string | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          store_name?: string | null
          updated_at?: string | null
          whatsapp?: string | null
          youtube_url?: string | null
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          cnpj?: string | null
          created_at?: string | null
          email?: string | null
          facebook_url?: string | null
          favicon_url?: string | null
          free_shipping_minimum?: number | null
          hub_api_key?: string | null
          hub_auto_update_prices?: boolean | null
          hub_last_sync_at?: string | null
          hub_url?: string | null
          id?: string | null
          instagram_url?: string | null
          interest_free_installments?: number | null
          linkedin_url?: string | null
          logo_url?: string | null
          max_installments?: number | null
          monthly_interest_rate?: number | null
          mp_environment?: string | null
          mp_production_access_token?: string | null
          mp_production_public_key?: string | null
          mp_sandbox_access_token?: string | null
          mp_sandbox_public_key?: string | null
          origin_city?: string | null
          origin_state?: string | null
          origin_zip?: string | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          store_name?: string | null
          updated_at?: string | null
          whatsapp?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      store_settings_public: {
        Row: {
          cnpj: string | null
          email: string | null
          facebook_url: string | null
          favicon_url: string | null
          free_shipping_minimum: number | null
          id: string | null
          instagram_url: string | null
          interest_free_installments: number | null
          linkedin_url: string | null
          logo_url: string | null
          max_installments: number | null
          monthly_interest_rate: number | null
          mp_environment: string | null
          mp_production_public_key: string | null
          mp_sandbox_public_key: string | null
          origin_city: string | null
          origin_state: string | null
          origin_zip: string | null
          phone: string | null
          primary_color: string | null
          secondary_color: string | null
          store_name: string | null
          whatsapp: string | null
          youtube_url: string | null
        }
        Insert: {
          cnpj?: string | null
          email?: string | null
          facebook_url?: string | null
          favicon_url?: string | null
          free_shipping_minimum?: number | null
          id?: string | null
          instagram_url?: string | null
          interest_free_installments?: number | null
          linkedin_url?: string | null
          logo_url?: string | null
          max_installments?: number | null
          monthly_interest_rate?: number | null
          mp_environment?: string | null
          mp_production_public_key?: string | null
          mp_sandbox_public_key?: string | null
          origin_city?: string | null
          origin_state?: string | null
          origin_zip?: string | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          store_name?: string | null
          whatsapp?: string | null
          youtube_url?: string | null
        }
        Update: {
          cnpj?: string | null
          email?: string | null
          facebook_url?: string | null
          favicon_url?: string | null
          free_shipping_minimum?: number | null
          id?: string | null
          instagram_url?: string | null
          interest_free_installments?: number | null
          linkedin_url?: string | null
          logo_url?: string | null
          max_installments?: number | null
          monthly_interest_rate?: number | null
          mp_environment?: string | null
          mp_production_public_key?: string | null
          mp_sandbox_public_key?: string | null
          origin_city?: string | null
          origin_state?: string | null
          origin_zip?: string | null
          phone?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          store_name?: string | null
          whatsapp?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      sync_progress: {
        Row: {
          attribute_values_harvested: number | null
          attributes_synced: number | null
          categories_synced: number | null
          completed_at: string | null
          created_at: string | null
          current_step: string | null
          errors: Json | null
          id: string | null
          message: string | null
          products_created: number | null
          products_updated: number | null
          started_at: string | null
          status: string | null
          step_progress: number | null
          step_total: number | null
          sync_id: string | null
          updated_at: string | null
        }
        Insert: {
          attribute_values_harvested?: number | null
          attributes_synced?: number | null
          categories_synced?: number | null
          completed_at?: string | null
          created_at?: string | null
          current_step?: string | null
          errors?: Json | null
          id?: string | null
          message?: string | null
          products_created?: number | null
          products_updated?: number | null
          started_at?: string | null
          status?: string | null
          step_progress?: number | null
          step_total?: number | null
          sync_id?: string | null
          updated_at?: string | null
        }
        Update: {
          attribute_values_harvested?: number | null
          attributes_synced?: number | null
          categories_synced?: number | null
          completed_at?: string | null
          created_at?: string | null
          current_step?: string | null
          errors?: Json | null
          id?: string | null
          message?: string | null
          products_created?: number | null
          products_updated?: number | null
          started_at?: string | null
          status?: string | null
          step_progress?: number | null
          step_total?: number | null
          sync_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      variants: {
        Row: {
          attrs: string | null
          created_at: string | null
          ean_gtin: string | null
          id: string | null
          image_url: string | null
          is_active: boolean | null
          price: number | null
          price_modifier: number | null
          product_id: string | null
          sku: string | null
          stock_level: number | null
          updated_at: string | null
        }
        Insert: {
          attrs?: string | null
          created_at?: string | null
          ean_gtin?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          price?: number | null
          price_modifier?: number | null
          product_id?: string | null
          sku?: string | null
          stock_level?: number | null
          updated_at?: string | null
        }
        Update: {
          attrs?: string | null
          created_at?: string | null
          ean_gtin?: string | null
          id?: string | null
          image_url?: string | null
          is_active?: boolean | null
          price?: number | null
          price_modifier?: number | null
          product_id?: string | null
          sku?: string | null
          stock_level?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
