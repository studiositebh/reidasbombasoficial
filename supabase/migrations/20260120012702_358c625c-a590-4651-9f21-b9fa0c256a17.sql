-- Add tracking_token column to orders table
ALTER TABLE public.orders
ADD COLUMN tracking_token TEXT UNIQUE;

-- Create index for fast token lookups
CREATE INDEX idx_orders_tracking_token ON public.orders(tracking_token);

-- Function to generate secure tracking tokens
CREATE OR REPLACE FUNCTION public.generate_tracking_token()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Generate a secure random token (16 bytes = 32 hex chars)
  NEW.tracking_token := encode(gen_random_bytes(16), 'hex');
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate token on order creation
CREATE TRIGGER set_order_tracking_token
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_tracking_token();

-- Generate tokens for existing orders that don't have one
UPDATE public.orders
SET tracking_token = encode(gen_random_bytes(16), 'hex')
WHERE tracking_token IS NULL;