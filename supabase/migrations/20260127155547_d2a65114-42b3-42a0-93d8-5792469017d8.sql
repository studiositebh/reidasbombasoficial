-- Create product_reviews table for real ratings and reviews
CREATE TABLE public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  content TEXT,
  is_verified_purchase BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT false,
  reviewer_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_product_reviews_product_id ON public.product_reviews(product_id);
CREATE INDEX idx_product_reviews_approved ON public.product_reviews(is_approved) WHERE is_approved = true;

-- Enable RLS
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can read approved reviews
CREATE POLICY "Approved reviews are publicly readable"
ON public.product_reviews
FOR SELECT
USING (is_approved = true);

-- Admins can view all reviews (including unapproved)
CREATE POLICY "Admins can view all reviews"
ON public.product_reviews
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can create reviews
CREATE POLICY "Authenticated users can create reviews"
ON public.product_reviews
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own reviews
CREATE POLICY "Users can update own reviews"
ON public.product_reviews
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can manage all reviews
CREATE POLICY "Admins can manage reviews"
ON public.product_reviews
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_product_reviews_updated_at
BEFORE UPDATE ON public.product_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to get aggregate rating for a product
CREATE OR REPLACE FUNCTION public.get_product_rating(p_product_id UUID)
RETURNS TABLE(
  average_rating NUMERIC,
  review_count BIGINT,
  rating_distribution JSONB
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(COALESCE(AVG(rating)::NUMERIC, 0), 1) as average_rating,
    COUNT(*)::BIGINT as review_count,
    jsonb_build_object(
      '5', COUNT(*) FILTER (WHERE rating = 5),
      '4', COUNT(*) FILTER (WHERE rating = 4),
      '3', COUNT(*) FILTER (WHERE rating = 3),
      '2', COUNT(*) FILTER (WHERE rating = 2),
      '1', COUNT(*) FILTER (WHERE rating = 1)
    ) as rating_distribution
  FROM public.product_reviews
  WHERE product_id = p_product_id
    AND is_approved = true;
END;
$$;