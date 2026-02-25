-- Add DELETE policy for admins on product_reviews
CREATE POLICY "Admins can delete reviews"
ON public.product_reviews
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));