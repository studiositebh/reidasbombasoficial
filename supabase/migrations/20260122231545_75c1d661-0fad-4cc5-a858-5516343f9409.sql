-- Create coupons table
CREATE TABLE public.coupons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  min_order_value NUMERIC DEFAULT 0,
  max_discount NUMERIC, -- Maximum discount for percentage coupons
  max_uses INTEGER, -- NULL means unlimited
  current_uses INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valid_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Public can read active coupons (for validation)
CREATE POLICY "Active coupons are readable"
ON public.coupons
FOR SELECT
USING (is_active = true);

-- Admins can manage coupons
CREATE POLICY "Admins can manage coupons"
ON public.coupons
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_coupons_updated_at
BEFORE UPDATE ON public.coupons
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster lookups by code
CREATE UNIQUE INDEX idx_coupons_code_upper ON public.coupons(UPPER(code));

-- Create coupon_uses table to track usage per order
CREATE TABLE public.coupon_uses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  discount_applied NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(coupon_id, order_id)
);

-- Enable RLS
ALTER TABLE public.coupon_uses ENABLE ROW LEVEL SECURITY;

-- Admins can view coupon uses
CREATE POLICY "Admins can view coupon uses"
ON public.coupon_uses
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service role can insert coupon uses
CREATE POLICY "Service can insert coupon uses"
ON public.coupon_uses
FOR INSERT
WITH CHECK (true);