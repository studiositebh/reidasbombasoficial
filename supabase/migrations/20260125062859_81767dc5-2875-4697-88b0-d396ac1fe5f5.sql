-- Remove both triggers that cause duplicate Hub calls
DROP TRIGGER IF EXISTS trigger_notify_hub_on_paid ON public.orders;
DROP TRIGGER IF EXISTS trg_notify_hub_on_paid_order ON public.orders;

-- Remove the function (cleanup)
DROP FUNCTION IF EXISTS public.notify_hub_on_paid_order();