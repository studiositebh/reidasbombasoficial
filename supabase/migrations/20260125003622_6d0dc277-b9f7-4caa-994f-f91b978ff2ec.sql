-- Remove overly permissive INSERT policy from coupon_uses
-- Writes should only happen via Edge Functions using service_role (which bypasses RLS)
DROP POLICY IF EXISTS "Service can insert coupon uses" ON public.coupon_uses;