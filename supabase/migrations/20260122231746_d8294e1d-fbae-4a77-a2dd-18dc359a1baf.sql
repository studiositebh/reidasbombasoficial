-- Create function to increment coupon uses
CREATE OR REPLACE FUNCTION public.increment_coupon_uses(p_coupon_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.coupons
  SET current_uses = current_uses + 1,
      updated_at = NOW()
  WHERE id = p_coupon_id;
END;
$function$;