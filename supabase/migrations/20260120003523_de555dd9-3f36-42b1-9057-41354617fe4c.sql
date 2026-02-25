-- ================================================
-- ADMIN STRUCTURE EXPANSION
-- ================================================

-- 1. Categories Table (with hierarchical support)
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url TEXT,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories
CREATE POLICY "Categories are publicly readable" 
ON public.categories 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage categories" 
ON public.categories 
FOR ALL 
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Store Settings Table (Single Row Pattern)
CREATE TABLE public.store_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_name TEXT NOT NULL DEFAULT 'Minha Loja',
  cnpj TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  primary_color TEXT DEFAULT '#0055FF',
  secondary_color TEXT DEFAULT '#FFD700',
  facebook_url TEXT,
  instagram_url TEXT,
  youtube_url TEXT,
  linkedin_url TEXT,
  free_shipping_minimum NUMERIC(10,2) DEFAULT 500.00,
  origin_zip TEXT,
  origin_city TEXT,
  origin_state TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  -- Ensure single row
  CONSTRAINT single_row CHECK (id = '00000000-0000-0000-0000-000000000001'::uuid)
);

-- Enable RLS on store_settings
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for store_settings
CREATE POLICY "Store settings are publicly readable" 
ON public.store_settings 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage store settings" 
ON public.store_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_store_settings_updated_at
BEFORE UPDATE ON public.store_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings row
INSERT INTO public.store_settings (id, store_name, cnpj, email, phone, whatsapp, address_city, address_state, origin_zip, origin_city, origin_state)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Rei das Bombas',
  '12.345.678/0001-90',
  'contato@reidasbombas.com.br',
  '(31) 3333-4444',
  '(31) 99999-8888',
  'Belo Horizonte',
  'MG',
  '31160640',
  'Belo Horizonte',
  'MG'
);

-- 3. Update profiles table - add document field
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS document TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS document_type TEXT CHECK (document_type IN ('cpf', 'cnpj'));

-- 4. Add category_id foreign key to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- Create index for category lookups
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);