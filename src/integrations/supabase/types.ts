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
          cep: string
          city: string
          complement: string | null
          created_at: string
          id: string
          is_default: boolean
          label: string
          name: string
          neighborhood: string
          number: string
          phone: string | null
          state: string
          street: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cep: string
          city: string
          complement?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          name: string
          neighborhood: string
          number: string
          phone?: string | null
          state: string
          street: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cep?: string
          city?: string
          complement?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          label?: string
          name?: string
          neighborhood?: string
          number?: string
          phone?: string | null
          state?: string
          street?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      attribute_values: {
        Row: {
          attribute_id: string
          created_at: string | null
          id: string
          meta_value: string | null
          sort_order: number | null
          value: string
        }
        Insert: {
          attribute_id: string
          created_at?: string | null
          id?: string
          meta_value?: string | null
          sort_order?: number | null
          value: string
        }
        Update: {
          attribute_id?: string
          created_at?: string | null
          id?: string
          meta_value?: string | null
          sort_order?: number | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "attribute_values_attribute_id_fkey"
            columns: ["attribute_id"]
            isOneToOne: false
            referencedRelation: "attributes"
            referencedColumns: ["id"]
          },
        ]
      }
      attributes: {
        Row: {
          created_at: string | null
          id: string
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cart_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          updated_at: string
          user_id: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          user_id: string
          variant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          user_id?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          parent_id: string | null
          slug: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_uses: {
        Row: {
          coupon_id: string
          created_at: string
          discount_applied: number
          id: string
          order_id: string
        }
        Insert: {
          coupon_id: string
          created_at?: string
          discount_applied: number
          id?: string
          order_id: string
        }
        Update: {
          coupon_id?: string
          created_at?: string
          discount_applied?: number
          id?: string
          order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_uses_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_uses_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          current_uses: number
          description: string | null
          discount_type: string
          discount_value: number
          id: string
          is_active: boolean
          max_discount: number | null
          max_uses: number | null
          min_order_value: number | null
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          code: string
          created_at?: string
          current_uses?: number
          description?: string | null
          discount_type: string
          discount_value: number
          id?: string
          is_active?: boolean
          max_discount?: number | null
          max_uses?: number | null
          min_order_value?: number | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          current_uses?: number
          description?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          is_active?: boolean
          max_discount?: number | null
          max_uses?: number | null
          min_order_value?: number | null
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          cart_items: Json | null
          cart_total: number | null
          converted_at: string | null
          created_at: string
          document: string | null
          email: string
          id: string
          name: string
          notes: string | null
          order_id: string | null
          phone: string | null
          recovery_email_sent_at: string | null
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          cart_items?: Json | null
          cart_total?: number | null
          converted_at?: string | null
          created_at?: string
          document?: string | null
          email: string
          id?: string
          name: string
          notes?: string | null
          order_id?: string | null
          phone?: string | null
          recovery_email_sent_at?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          cart_items?: Json | null
          cart_total?: number | null
          converted_at?: string | null
          created_at?: string
          document?: string | null
          email?: string
          id?: string
          name?: string
          notes?: string | null
          order_id?: string | null
          phone?: string | null
          recovery_email_sent_at?: string | null
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          quantity: number
          unit_price: number
          variant_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          quantity: number
          unit_price: number
          variant_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          quantity?: number
          unit_price?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "variants"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string | null
          id: string
          internal_notes: string | null
          metadata: Json | null
          payment_id: string | null
          payment_method: string | null
          shipping_address: Json | null
          status: Database["public"]["Enums"]["order_status"] | null
          supplier_order_id: string | null
          total_amount: number
          tracking_token: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          internal_notes?: string | null
          metadata?: Json | null
          payment_id?: string | null
          payment_method?: string | null
          shipping_address?: Json | null
          status?: Database["public"]["Enums"]["order_status"] | null
          supplier_order_id?: string | null
          total_amount?: number
          tracking_token?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          internal_notes?: string | null
          metadata?: Json | null
          payment_id?: string | null
          payment_method?: string | null
          shipping_address?: Json | null
          status?: Database["public"]["Enums"]["order_status"] | null
          supplier_order_id?: string | null
          total_amount?: number
          tracking_token?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      product_images: {
        Row: {
          alt_text: string | null
          created_at: string | null
          id: string
          image_url: string
          product_id: string
          sort_order: number | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          id?: string
          image_url: string
          product_id: string
          sort_order?: number | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          id?: string
          image_url?: string
          product_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_reviews: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          is_approved: boolean | null
          is_verified_purchase: boolean | null
          product_id: string
          rating: number
          reviewer_name: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          is_verified_purchase?: boolean | null
          product_id: string
          rating: number
          reviewer_name?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          is_approved?: boolean | null
          is_verified_purchase?: boolean | null
          product_id?: string
          rating?: number
          reviewer_name?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_price: number
          category: string | null
          category_id: string | null
          created_at: string | null
          description: string | null
          height: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          length: number | null
          metadata: Json | null
          promotion_expires_at: string | null
          promotional_price: number | null
          slug: string
          technical_specs: Json | null
          title: string
          updated_at: string | null
          weight: number | null
          width: number | null
        }
        Insert: {
          base_price?: number
          category?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          height?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          length?: number | null
          metadata?: Json | null
          promotion_expires_at?: string | null
          promotional_price?: number | null
          slug: string
          technical_specs?: Json | null
          title: string
          updated_at?: string | null
          weight?: number | null
          width?: number | null
        }
        Update: {
          base_price?: number
          category?: string | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          height?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          length?: number | null
          metadata?: Json | null
          promotion_expires_at?: string | null
          promotional_price?: number | null
          slug?: string
          technical_specs?: Json | null
          title?: string
          updated_at?: string | null
          weight?: number | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          document: string | null
          document_type: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          document?: string | null
          document_type?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          document?: string | null
          document_type?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      saved_cards: {
        Row: {
          card_brand: string
          card_holder_name: string
          card_id: string
          created_at: string
          customer_id: string | null
          expiration_month: number
          expiration_year: number
          first_six_digits: string
          id: string
          is_default: boolean
          last_four_digits: string
          updated_at: string
          user_id: string
        }
        Insert: {
          card_brand: string
          card_holder_name: string
          card_id: string
          created_at?: string
          customer_id?: string | null
          expiration_month: number
          expiration_year: number
          first_six_digits: string
          id?: string
          is_default?: boolean
          last_four_digits: string
          updated_at?: string
          user_id: string
        }
        Update: {
          card_brand?: string
          card_holder_name?: string
          card_id?: string
          created_at?: string
          customer_id?: string | null
          expiration_month?: number
          expiration_year?: number
          first_six_digits?: string
          id?: string
          is_default?: boolean
          last_four_digits?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      scheduled_deletions: {
        Row: {
          cancelled_at: string | null
          created_at: string
          id: string
          reason: string | null
          scheduled_for: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          scheduled_for: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          scheduled_for?: string
          user_id?: string
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
          id: string
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
          store_name: string
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
          id?: string
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
          store_name?: string
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
          id?: string
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
          store_name?: string
          updated_at?: string | null
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
          errors: string[] | null
          id: string
          message: string | null
          products_created: number | null
          products_updated: number | null
          started_at: string | null
          status: string
          step_progress: number | null
          step_total: number | null
          sync_id: string
          updated_at: string | null
        }
        Insert: {
          attribute_values_harvested?: number | null
          attributes_synced?: number | null
          categories_synced?: number | null
          completed_at?: string | null
          created_at?: string | null
          current_step?: string | null
          errors?: string[] | null
          id?: string
          message?: string | null
          products_created?: number | null
          products_updated?: number | null
          started_at?: string | null
          status?: string
          step_progress?: number | null
          step_total?: number | null
          sync_id: string
          updated_at?: string | null
        }
        Update: {
          attribute_values_harvested?: number | null
          attributes_synced?: number | null
          categories_synced?: number | null
          completed_at?: string | null
          created_at?: string | null
          current_step?: string | null
          errors?: string[] | null
          id?: string
          message?: string | null
          products_created?: number | null
          products_updated?: number | null
          started_at?: string | null
          status?: string
          step_progress?: number | null
          step_total?: number | null
          sync_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      variants: {
        Row: {
          attrs: Json
          created_at: string | null
          ean_gtin: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          price: number | null
          price_modifier: number | null
          product_id: string
          sku: string
          stock_level: number
          updated_at: string | null
        }
        Insert: {
          attrs?: Json
          created_at?: string | null
          ean_gtin?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          price?: number | null
          price_modifier?: number | null
          product_id: string
          sku: string
          stock_level?: number
          updated_at?: string | null
        }
        Update: {
          attrs?: Json
          created_at?: string | null
          ean_gtin?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          price?: number | null
          price_modifier?: number | null
          product_id?: string
          sku?: string
          stock_level?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
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
    }
    Functions: {
      decrement_stock: {
        Args: { p_quantity: number; p_variant_id: string }
        Returns: Json
      }
      get_daily_revenue: {
        Args: { end_date: string; start_date: string; status_filter?: string }
        Returns: {
          date: string
          order_count: number
          revenue: number
        }[]
      }
      get_low_stock_alert: {
        Args: { threshold?: number }
        Returns: {
          is_active: boolean
          product_id: string
          product_title: string
          stock_level: number
          variant_attrs: Json
          variant_sku: string
        }[]
      }
      get_product_rating: {
        Args: { p_product_id: string }
        Returns: {
          average_rating: number
          rating_distribution: Json
          review_count: number
        }[]
      }
      get_revenue_summary: {
        Args: { end_date: string; start_date: string; status_filter?: string }
        Returns: {
          avg_ticket: number
          total_orders: number
          total_revenue: number
        }[]
      }
      get_sales_by_category: {
        Args: { end_date?: string; start_date?: string }
        Returns: {
          category: string
          order_count: number
          percentage: number
          total_revenue: number
        }[]
      }
      get_top_products: {
        Args: { end_date?: string; limit_count?: number; start_date?: string }
        Returns: {
          current_stock: number
          product_id: string
          product_title: string
          quantity_sold: number
          total_revenue: number
          variant_sku: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_coupon_uses: {
        Args: { p_coupon_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "moderator"
        | "user"
        | "manager"
        | "collaborator"
        | "editor"
      order_status: "pending" | "paid" | "shipped" | "cancelled"
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
      app_role: [
        "admin",
        "moderator",
        "user",
        "manager",
        "collaborator",
        "editor",
      ],
      order_status: ["pending", "paid", "shipped", "cancelled"],
    },
  },
} as const
