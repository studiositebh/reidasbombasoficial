-- Add supplier_order_id column to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS supplier_order_id TEXT;

-- Enable pg_net extension for database webhooks
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create function to notify hub when order is paid
CREATE OR REPLACE FUNCTION public.notify_hub_on_paid_order()
RETURNS TRIGGER AS $$
DECLARE
  request_id BIGINT;
BEGIN
  -- Only trigger when status changes to 'paid'
  IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Call edge function via pg_net
    SELECT extensions.http_post(
      url := 'https://nvowplonglnamyxpuerw.supabase.co/functions/v1/send-order-to-hub',
      body := jsonb_build_object('order_id', NEW.id::text, 'type', 'db_webhook'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json'
      )
    ) INTO request_id;
    
    RAISE LOG '[Hub Webhook] Order % marked as paid, notification request_id: %', NEW.id, request_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS trigger_notify_hub_on_paid ON public.orders;
CREATE TRIGGER trigger_notify_hub_on_paid
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_hub_on_paid_order();

-- Add comment for documentation
COMMENT ON COLUMN public.orders.supplier_order_id IS 'ID do pedido retornado pelo Hub/Fornecedor após envio automático';