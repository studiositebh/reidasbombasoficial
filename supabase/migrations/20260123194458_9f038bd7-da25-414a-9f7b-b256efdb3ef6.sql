-- Add Mercado Pago environment configuration columns
ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS mp_environment TEXT DEFAULT 'production';

ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS mp_sandbox_public_key TEXT;

ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS mp_sandbox_access_token TEXT;

ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS mp_production_public_key TEXT;

ALTER TABLE public.store_settings 
ADD COLUMN IF NOT EXISTS mp_production_access_token TEXT;

-- Pre-populate with the credentials provided by the user
UPDATE public.store_settings
SET 
  mp_environment = 'production',
  mp_sandbox_public_key = 'TEST-22351fe2-bc77-49ea-af63-ff9961c279d1',
  mp_sandbox_access_token = 'TEST-8697863338934111-011911-df7112a1390fcdbf502bf163e75ea8be-2501773921',
  mp_production_public_key = 'APP_USR-ebaab13e-bc96-4359-85ec-b74819b8e31a',
  mp_production_access_token = 'APP_USR-8697863338934111-011911-9460cf510ef7c4de235a2d4c1b97e9f7-2501773921'
WHERE id = '00000000-0000-0000-0000-000000000001';