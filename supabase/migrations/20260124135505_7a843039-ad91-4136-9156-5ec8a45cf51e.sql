-- Add Hub/Marketplace integration fields to store_settings
ALTER TABLE public.store_settings
ADD COLUMN IF NOT EXISTS hub_url text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS hub_api_key text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS hub_auto_update_prices boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS hub_last_sync_at timestamp with time zone DEFAULT NULL;