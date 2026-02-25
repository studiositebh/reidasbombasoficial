-- =====================================================
-- FIX: Update store_settings_public view to include public fields
-- =====================================================

-- Drop the existing view
DROP VIEW IF EXISTS public.store_settings_public;

-- Recreate with all necessary PUBLIC fields
-- EXCLUDED: mp_*_access_token (secrets), hub_api_key, hub_url, hub_*, address_* (private)
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
  monthly_interest_rate,
  -- Public payment configuration (public keys are safe)
  mp_environment,
  mp_sandbox_public_key,
  mp_production_public_key,
  -- Business contact info (public on website)
  whatsapp,
  email,
  phone,
  cnpj
FROM public.store_settings;

-- Grant access to public
GRANT SELECT ON public.store_settings_public TO anon, authenticated;

-- =====================================================
-- FIX: Add admin checks to analytics functions
-- =====================================================

-- Fix get_daily_revenue
CREATE OR REPLACE FUNCTION public.get_daily_revenue(start_date date, end_date date, status_filter text DEFAULT NULL::text)
RETURNS TABLE(date date, revenue numeric, order_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admin check: prevent non-admin users from accessing business data
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized - Admin access required';
  END IF;

  RETURN QUERY
  SELECT 
    DATE(o.created_at) AS date,
    COALESCE(SUM(o.total_amount), 0) AS revenue,
    COUNT(o.id) AS order_count
  FROM public.orders o
  WHERE DATE(o.created_at) >= start_date
    AND DATE(o.created_at) <= end_date
    AND (status_filter IS NULL OR o.status::TEXT = status_filter)
  GROUP BY DATE(o.created_at)
  ORDER BY DATE(o.created_at);
END;
$$;

-- Fix get_revenue_summary
CREATE OR REPLACE FUNCTION public.get_revenue_summary(start_date date, end_date date, status_filter text DEFAULT NULL::text)
RETURNS TABLE(total_revenue numeric, total_orders bigint, avg_ticket numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admin check
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized - Admin access required';
  END IF;

  RETURN QUERY
  SELECT 
    COALESCE(SUM(o.total_amount), 0) AS total_revenue,
    COUNT(o.id) AS total_orders,
    CASE 
      WHEN COUNT(o.id) > 0 THEN ROUND(SUM(o.total_amount) / COUNT(o.id), 2)
      ELSE 0
    END AS avg_ticket
  FROM public.orders o
  WHERE DATE(o.created_at) >= start_date
    AND DATE(o.created_at) <= end_date
    AND (status_filter IS NULL OR o.status::TEXT = status_filter);
END;
$$;

-- Fix get_top_products
CREATE OR REPLACE FUNCTION public.get_top_products(limit_count integer DEFAULT 10, start_date date DEFAULT NULL::date, end_date date DEFAULT NULL::date)
RETURNS TABLE(product_id uuid, product_title text, variant_sku text, quantity_sold bigint, total_revenue numeric, current_stock integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admin check
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized - Admin access required';
  END IF;

  RETURN QUERY
  SELECT 
    p.id AS product_id,
    p.title AS product_title,
    v.sku AS variant_sku,
    SUM(oi.quantity)::BIGINT AS quantity_sold,
    SUM(oi.quantity * oi.unit_price) AS total_revenue,
    v.stock_level AS current_stock
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  JOIN public.variants v ON v.id = oi.variant_id
  JOIN public.products p ON p.id = v.product_id
  WHERE (start_date IS NULL OR DATE(o.created_at) >= start_date)
    AND (end_date IS NULL OR DATE(o.created_at) <= end_date)
  GROUP BY p.id, p.title, v.sku, v.stock_level
  ORDER BY quantity_sold DESC
  LIMIT limit_count;
END;
$$;

-- Fix get_sales_by_category
CREATE OR REPLACE FUNCTION public.get_sales_by_category(start_date date DEFAULT NULL::date, end_date date DEFAULT NULL::date)
RETURNS TABLE(category text, total_revenue numeric, order_count bigint, percentage numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_sum NUMERIC;
BEGIN
  -- Admin check
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized - Admin access required';
  END IF;

  -- Calculate total first
  SELECT COALESCE(SUM(oi.quantity * oi.unit_price), 0) INTO total_sum
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  JOIN public.variants v ON v.id = oi.variant_id
  JOIN public.products p ON p.id = v.product_id
  WHERE (start_date IS NULL OR DATE(o.created_at) >= start_date)
    AND (end_date IS NULL OR DATE(o.created_at) <= end_date);

  RETURN QUERY
  SELECT 
    COALESCE(p.category, 'Sem categoria') AS category,
    SUM(oi.quantity * oi.unit_price) AS total_revenue,
    COUNT(DISTINCT o.id) AS order_count,
    CASE 
      WHEN total_sum > 0 THEN ROUND((SUM(oi.quantity * oi.unit_price) / total_sum) * 100, 2)
      ELSE 0
    END AS percentage
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  JOIN public.variants v ON v.id = oi.variant_id
  JOIN public.products p ON p.id = v.product_id
  WHERE (start_date IS NULL OR DATE(o.created_at) >= start_date)
    AND (end_date IS NULL OR DATE(o.created_at) <= end_date)
  GROUP BY COALESCE(p.category, 'Sem categoria')
  ORDER BY total_revenue DESC;
END;
$$;

-- Fix get_low_stock_alert
CREATE OR REPLACE FUNCTION public.get_low_stock_alert(threshold integer DEFAULT 5)
RETURNS TABLE(product_id uuid, product_title text, variant_sku text, variant_attrs jsonb, stock_level integer, is_active boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admin check
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Unauthorized - Admin access required';
  END IF;

  RETURN QUERY
  SELECT 
    p.id AS product_id,
    p.title AS product_title,
    v.sku AS variant_sku,
    v.attrs AS variant_attrs,
    v.stock_level,
    v.is_active
  FROM public.variants v
  JOIN public.products p ON p.id = v.product_id
  WHERE v.stock_level <= threshold
    AND v.is_active = true
    AND p.is_active = true
  ORDER BY v.stock_level ASC, p.title ASC;
END;
$$;