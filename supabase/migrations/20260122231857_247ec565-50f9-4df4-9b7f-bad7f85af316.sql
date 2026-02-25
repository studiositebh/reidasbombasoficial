-- Add installment configuration columns to store_settings
ALTER TABLE public.store_settings
ADD COLUMN IF NOT EXISTS max_installments integer DEFAULT 12,
ADD COLUMN IF NOT EXISTS interest_free_installments integer DEFAULT 3,
ADD COLUMN IF NOT EXISTS monthly_interest_rate numeric DEFAULT 1.99;

-- Add comment for documentation
COMMENT ON COLUMN public.store_settings.max_installments IS 'Maximum number of installments allowed';
COMMENT ON COLUMN public.store_settings.interest_free_installments IS 'Number of interest-free installments';
COMMENT ON COLUMN public.store_settings.monthly_interest_rate IS 'Monthly interest rate percentage (e.g., 1.99 for 1.99%)';