-- =====================================================
-- SECURITY FIX: Remove public access to sensitive data
-- =====================================================

-- 1. LEADS TABLE: Remove public SELECT access
-- The INSERT policy remains for guest checkout, but SELECT should be admin-only
-- Edge functions use service_role which bypasses RLS anyway

DROP POLICY IF EXISTS "Anon and authenticated can select leads for upsert" ON public.leads;

-- 2. STORE_SETTINGS TABLE: Remove public access to base table
-- The view store_settings_public already exists and excludes sensitive fields

DROP POLICY IF EXISTS "Public can read store settings" ON public.store_settings;

-- 3. Create policy for public to read ONLY the safe view
-- First ensure the view has proper security settings
DROP VIEW IF EXISTS public.store_settings_public;

CREATE VIEW public.store_settings_public
WITH (security_invoker = on) AS
SELECT 
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
  monthly_interest_rate
  -- EXCLUDED: mp_*, hub_*, email, phone, whatsapp, cnpj, address_*, etc.
FROM public.store_settings;

-- 4. Grant SELECT on the public view to anon and authenticated
GRANT SELECT ON public.store_settings_public TO anon, authenticated;

-- 5. Create a new restricted policy for store_settings base table
-- Only admins can read the full table (with secrets)
-- This policy already exists: "Admins can manage store settings"

-- 6. Add a policy that allows the public view to work
-- The view uses security_invoker, so it needs a SELECT policy
-- We create a minimal policy that only allows reading non-sensitive columns via RPC
CREATE POLICY "Service role can read store settings"
ON public.store_settings
FOR SELECT
TO service_role
USING (true);

-- Note: The store_settings_public view with security_invoker=on means
-- queries through the view run as the calling user (anon/authenticated)
-- Since we removed public SELECT, they can't access the base table
-- But the view itself is accessible via GRANT