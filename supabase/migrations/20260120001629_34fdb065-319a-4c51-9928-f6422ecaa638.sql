-- Add new columns to variants table for complete variant management
ALTER TABLE public.variants
ADD COLUMN ean_gtin TEXT DEFAULT NULL,
ADD COLUMN price NUMERIC(10,2) DEFAULT NULL;