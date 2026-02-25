-- Create attributes table for reusable product attributes
CREATE TABLE public.attributes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create attribute_values table for predefined values
CREATE TABLE public.attribute_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attribute_id UUID NOT NULL REFERENCES public.attributes(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  meta_value TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(attribute_id, value)
);

-- Add image_url column to variants table
ALTER TABLE public.variants ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Enable RLS on new tables
ALTER TABLE public.attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attribute_values ENABLE ROW LEVEL SECURITY;

-- RLS policies for attributes (publicly readable, admins can manage)
CREATE POLICY "Attributes are publicly readable" 
ON public.attributes FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage attributes" 
ON public.attributes FOR ALL 
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS policies for attribute_values
CREATE POLICY "Attribute values are publicly readable" 
ON public.attribute_values FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage attribute values" 
ON public.attribute_values FOR ALL 
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create storage bucket for products
INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true);

-- Storage policies for products bucket
CREATE POLICY "Product images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'products');

CREATE POLICY "Admins can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'products' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update product images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'products' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'products' AND has_role(auth.uid(), 'admin'));

-- Create indexes for better performance
CREATE INDEX idx_attribute_values_attribute_id ON public.attribute_values(attribute_id);
CREATE INDEX idx_variants_image_url ON public.variants(image_url) WHERE image_url IS NOT NULL;