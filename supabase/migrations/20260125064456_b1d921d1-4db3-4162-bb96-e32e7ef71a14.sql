-- Add internal notes column to orders table for team annotations
ALTER TABLE public.orders
ADD COLUMN internal_notes text DEFAULT NULL;

-- Add comment explaining the column purpose
COMMENT ON COLUMN public.orders.internal_notes IS 'Internal notes for team use only - not visible to customers';