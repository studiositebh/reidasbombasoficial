-- Add dimension columns to products table for shipping calculation
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS weight numeric DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS width numeric DEFAULT 20,
ADD COLUMN IF NOT EXISTS height numeric DEFAULT 15,
ADD COLUMN IF NOT EXISTS length numeric DEFAULT 10;

-- Add comments for documentation
COMMENT ON COLUMN public.products.weight IS 'Product weight in kg';
COMMENT ON COLUMN public.products.width IS 'Product width in cm';
COMMENT ON COLUMN public.products.height IS 'Product height in cm';
COMMENT ON COLUMN public.products.length IS 'Product length in cm';