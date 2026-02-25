-- Drop the existing view
DROP VIEW IF EXISTS public.store_settings_public;

-- Recreate the view with security_invoker for proper RLS inheritance
-- This view only exposes public-safe data (no access tokens or API secrets)
CREATE VIEW public.store_settings_public 
WITH (security_invoker = on)
AS SELECT 
    id,
    store_name,
    logo_url,
    favicon_url,
    primary_color,
    secondary_color,
    facebook_url,
    instagram_url,
    youtube_url,
    linkedin_url,
    free_shipping_minimum,
    origin_zip,
    origin_city,
    origin_state,
    max_installments,
    interest_free_installments,
    monthly_interest_rate,
    mp_environment,
    mp_sandbox_public_key,
    mp_production_public_key,
    whatsapp,
    email,
    phone,
    cnpj
FROM public.store_settings;

-- Grant SELECT access to both anonymous and authenticated users
-- This is intentional - this view contains only public-safe configuration data
GRANT SELECT ON public.store_settings_public TO anon, authenticated;

-- Add a comment documenting the security decision
COMMENT ON VIEW public.store_settings_public IS 
'Public-safe view of store settings. Excludes sensitive fields like access_tokens, api_keys, and hub credentials. Uses security_invoker=on to inherit caller context.';