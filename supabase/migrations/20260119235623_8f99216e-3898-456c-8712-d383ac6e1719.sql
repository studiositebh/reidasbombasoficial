-- Add promotional price to products
ALTER TABLE public.products
ADD COLUMN promotional_price NUMERIC(10,2) DEFAULT NULL;

-- Create product images gallery table
CREATE TABLE public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;

-- Public can read product images
CREATE POLICY "Product images are publicly readable" 
ON public.product_images FOR SELECT USING (true);

-- Admins can manage product images
CREATE POLICY "Admins can manage product images" 
ON public.product_images FOR ALL 
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));