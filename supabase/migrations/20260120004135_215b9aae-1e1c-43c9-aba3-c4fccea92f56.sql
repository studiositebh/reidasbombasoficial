-- ================================================
-- ANALYTICS FUNCTIONS FOR BI MODULE
-- ================================================

-- 1. Get Daily Revenue (for line/area charts)
CREATE OR REPLACE FUNCTION public.get_daily_revenue(
  start_date DATE,
  end_date DATE,
  status_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  date DATE,
  revenue NUMERIC,
  order_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

-- 2. Get Revenue Summary (KPIs)
CREATE OR REPLACE FUNCTION public.get_revenue_summary(
  start_date DATE,
  end_date DATE,
  status_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_revenue NUMERIC,
  total_orders BIGINT,
  avg_ticket NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

-- 3. Get Top Products (best sellers)
CREATE OR REPLACE FUNCTION public.get_top_products(
  limit_count INTEGER DEFAULT 10,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  product_id UUID,
  product_title TEXT,
  variant_sku TEXT,
  quantity_sold BIGINT,
  total_revenue NUMERIC,
  current_stock INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

-- 4. Get Sales by Category (for pie charts)
CREATE OR REPLACE FUNCTION public.get_sales_by_category(
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
)
RETURNS TABLE (
  category TEXT,
  total_revenue NUMERIC,
  order_count BIGINT,
  percentage NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_sum NUMERIC;
BEGIN
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

-- 5. Get Low Stock Alert
CREATE OR REPLACE FUNCTION public.get_low_stock_alert(
  threshold INTEGER DEFAULT 5
)
RETURNS TABLE (
  product_id UUID,
  product_title TEXT,
  variant_sku TEXT,
  variant_attrs JSONB,
  stock_level INTEGER,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_daily_revenue(DATE, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_revenue_summary(DATE, DATE, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_top_products(INTEGER, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_sales_by_category(DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_low_stock_alert(INTEGER) TO authenticated;