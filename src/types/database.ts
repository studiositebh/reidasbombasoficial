// Database Types for E-commerce
// These types mirror the Supabase schema structure

import type { Json } from "@/integrations/supabase/types";

export interface Product {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  base_price: number;
  promotional_price: number | null;
  promotion_expires_at: string | null;
  metadata: Json;
  image_url: string | null;
  category: string | null;
  category_id: string | null;
  is_active: boolean | null;
  weight: number | null;
  width: number | null;
  height: number | null;
  length: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  alt_text: string | null;
  sort_order: number;
  created_at: string | null;
}

export interface Variant {
  id: string;
  product_id: string;
  sku: string;
  stock_level: number;
  attrs: Json;
  price_modifier: number | null;
  price: number | null;
  ean_gtin: string | null;
  is_active: boolean | null;
  image_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProductWithVariants extends Product {
  variants: Variant[];
  totalStock: number;
}

export interface Attribute {
  id: string;
  name: string;
  slug: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface AttributeValue {
  id: string;
  attribute_id: string;
  value: string;
  meta_value: string | null;
  sort_order: number;
  created_at: string | null;
}

export interface AttributeWithValues extends Attribute {
  values: AttributeValue[];
}

export interface VariantAttributes {
  [key: string]: string | number;
}

export interface Order {
  id: string;
  user_id: string;
  status: OrderStatus;
  total_amount: number;
  payment_id: string | null;
  payment_method: string | null;
  shipping_address: Json | null;
  metadata: Json | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  variant_id: string;
  quantity: number;
  unit_price: number;
  created_at: string | null;
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'cancelled';

export interface CartItem {
  product: Product;
  variant: Variant;
  quantity: number;
}

export interface ShippingAddress {
  zipCode: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
}
