-- Create default variants for products that don't have any variants
INSERT INTO public.variants (product_id, sku, attrs, stock_level, price_modifier, is_active)
SELECT 
  p.id as product_id,
  CONCAT('SKU-', UPPER(REPLACE(p.slug, '-', '')), '-DEFAULT') as sku,
  jsonb_build_object('tipo', 'Padrão') as attrs,
  50 as stock_level,
  0 as price_modifier,
  true as is_active
FROM public.products p
LEFT JOIN public.variants v ON p.id = v.product_id
WHERE v.id IS NULL;