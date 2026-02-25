-- Add promotion expiration date to products table
ALTER TABLE public.products 
ADD COLUMN promotion_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for efficient querying of active promotions
CREATE INDEX idx_products_promotion_expires_at 
ON public.products (promotion_expires_at) 
WHERE promotional_price IS NOT NULL AND promotion_expires_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.products.promotion_expires_at IS 'Date and time when the promotional price expires. NULL means no expiration.';