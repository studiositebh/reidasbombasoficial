-- ==========================================
-- REI DAS BOMBAS - E-COMMERCE SCHEMA
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- PRODUCTS TABLE
-- ==========================================
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  base_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  category TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for slug lookups
CREATE INDEX idx_products_slug ON public.products(slug);

-- Index for category filtering
CREATE INDEX idx_products_category ON public.products(category);

-- GIN index for JSONB metadata searches
CREATE INDEX idx_products_metadata ON public.products USING GIN(metadata);

-- ==========================================
-- VARIANTS TABLE (Modelo Híbrido)
-- ==========================================
CREATE TABLE public.variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku TEXT UNIQUE NOT NULL,
  stock_level INTEGER NOT NULL DEFAULT 0 CHECK (stock_level >= 0),
  price_modifier NUMERIC(10,2) DEFAULT 0,
  attrs JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for product_id lookups
CREATE INDEX idx_variants_product_id ON public.variants(product_id);

-- GIN index for JSONB attrs searches (CRÍTICO para performance)
CREATE INDEX idx_variants_attrs ON public.variants USING GIN(attrs);

-- Index for SKU lookups
CREATE INDEX idx_variants_sku ON public.variants(sku);

-- ==========================================
-- ORDERS TABLE
-- ==========================================
CREATE TYPE public.order_status AS ENUM ('pending', 'paid', 'shipped', 'cancelled');

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  status public.order_status DEFAULT 'pending',
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping_address JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user_id lookups
CREATE INDEX idx_orders_user_id ON public.orders(user_id);

-- Index for status filtering
CREATE INDEX idx_orders_status ON public.orders(status);

-- ==========================================
-- ORDER ITEMS TABLE
-- ==========================================
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  variant_id UUID NOT NULL REFERENCES public.variants(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for order_id lookups
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);

-- ==========================================
-- RPC FUNCTION: DECREMENT STOCK (Atômico)
-- ==========================================
-- Esta função garante transação atômica para evitar Race Conditions
CREATE OR REPLACE FUNCTION public.decrement_stock(
  p_variant_id UUID,
  p_quantity INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_stock INTEGER;
  v_new_stock INTEGER;
  v_variant RECORD;
BEGIN
  -- Lock the row for update (previne race conditions)
  SELECT stock_level, sku INTO v_variant
  FROM public.variants
  WHERE id = p_variant_id
  FOR UPDATE;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'VARIANT_NOT_FOUND',
      'message', 'Variante não encontrada'
    );
  END IF;
  
  v_current_stock := v_variant.stock_level;
  
  -- Check if we have enough stock
  IF v_current_stock < p_quantity THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INSUFFICIENT_STOCK',
      'message', 'Estoque insuficiente',
      'available', v_current_stock,
      'requested', p_quantity
    );
  END IF;
  
  -- Decrement the stock
  v_new_stock := v_current_stock - p_quantity;
  
  UPDATE public.variants
  SET stock_level = v_new_stock,
      updated_at = NOW()
  WHERE id = p_variant_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'sku', v_variant.sku,
    'previous_stock', v_current_stock,
    'new_stock', v_new_stock,
    'decremented', p_quantity
  );
END;
$$;

-- ==========================================
-- UPDATED_AT TRIGGER FUNCTION
-- ==========================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply trigger to all tables
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_variants_updated_at
  BEFORE UPDATE ON public.variants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

-- Products: Public read, no public write
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are publicly readable"
  ON public.products FOR SELECT
  USING (is_active = true);

-- Variants: Public read, no public write
ALTER TABLE public.variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Variants are publicly readable"
  ON public.variants FOR SELECT
  USING (is_active = true);

-- Orders: Only owner can read their orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Order Items: Access through order ownership
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their order items"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create order items for their orders"
  ON public.order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );