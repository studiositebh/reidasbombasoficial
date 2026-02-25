-- Add payment tracking columns to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method text;

-- Add RLS policy for service role to update orders (for webhook)
CREATE POLICY "Service role can update orders"
ON public.orders
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);