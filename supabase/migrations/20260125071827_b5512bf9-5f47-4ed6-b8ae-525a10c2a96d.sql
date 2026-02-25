-- Add DELETE policy for admins on order_items
CREATE POLICY "Admins can delete order items"
ON public.order_items
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add DELETE policy for admins on orders
CREATE POLICY "Admins can delete orders"
ON public.orders
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));