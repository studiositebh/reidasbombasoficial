-- ============================================
-- SECURITY FIX: Protect sensitive data in store_settings
-- ============================================

-- 1. Drop the overly permissive public SELECT policy on store_settings
DROP POLICY IF EXISTS "Store settings are publicly readable" ON public.store_settings;

-- 2. Create a view that exposes ONLY non-sensitive columns for public access
CREATE OR REPLACE VIEW public.store_settings_public
WITH (security_invoker = on)
AS
SELECT 
  id,
  store_name,
  logo_url,
  favicon_url,
  primary_color,
  secondary_color,
  free_shipping_minimum,
  max_installments,
  interest_free_installments,
  monthly_interest_rate,
  origin_zip,
  origin_city,
  origin_state,
  facebook_url,
  instagram_url,
  youtube_url,
  linkedin_url
  -- EXCLUDED: mp_production_access_token, mp_sandbox_access_token, 
  -- mp_production_public_key, mp_sandbox_public_key, hub_api_key, 
  -- cnpj, email, phone, whatsapp, full address details, mp_environment
FROM public.store_settings;

-- 3. Allow public read on the safe view
GRANT SELECT ON public.store_settings_public TO anon, authenticated;

-- 4. Base table store_settings: only admins can SELECT
CREATE POLICY "Only admins can select store_settings"
ON public.store_settings
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- SECURITY FIX: Fix sync_progress RLS (remove USING(true))
-- ============================================

-- Drop the overly permissive service policy
DROP POLICY IF EXISTS "Service can manage sync_progress" ON public.sync_progress;

-- ============================================
-- SECURITY FIX: Restrict RPC functions to service role only
-- ============================================

-- Revoke execute from authenticated users on sensitive functions
REVOKE EXECUTE ON FUNCTION public.increment_coupon_uses(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_coupon_uses(uuid) FROM anon;

REVOKE EXECUTE ON FUNCTION public.decrement_stock(uuid, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_stock(uuid, integer) FROM anon;

-- Grant only to service_role
GRANT EXECUTE ON FUNCTION public.increment_coupon_uses(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.decrement_stock(uuid, integer) TO service_role;

-- ============================================
-- SECURITY FIX: Fix orders table - remove USING(true) from service policy
-- ============================================

DROP POLICY IF EXISTS "Service role can update orders" ON public.orders;

-- Create proper admin-only update policy (service role bypasses RLS anyway)
-- No need for a USING(true) policy - service role naturally bypasses RLS