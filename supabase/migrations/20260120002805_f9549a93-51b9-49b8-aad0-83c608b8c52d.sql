-- Add unique constraint on SKU column in variants table
ALTER TABLE public.variants
ADD CONSTRAINT variants_sku_unique UNIQUE (sku);