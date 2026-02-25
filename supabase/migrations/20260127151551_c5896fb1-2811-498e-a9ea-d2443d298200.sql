-- Add technical_specs JSONB column to products table
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS technical_specs JSONB DEFAULT '{}'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.products.technical_specs IS 'Free-form technical specifications as key-value pairs, independent of variant attributes';