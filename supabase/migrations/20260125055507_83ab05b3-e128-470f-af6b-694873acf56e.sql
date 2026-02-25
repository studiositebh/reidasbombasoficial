-- Fix Hub notification trigger to use pg_net (net.http_post) instead of non-existent extensions.http_post

-- 1) Ensure pg_net extension is installed (creates schema net + http helpers)
create extension if not exists pg_net;

-- 2) Replace function to call the Edge Function via net.http_post
create or replace function public.notify_hub_on_paid_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  request_id bigint;
  payload jsonb;
  url text;
  headers jsonb;
begin
  -- Only trigger when status changes to 'paid'
  if new.status = 'paid' and (old.status is null or old.status is distinct from new.status) then
    url := 'https://nvowplonglnamyxpuerw.supabase.co/functions/v1/send-order-to-hub';
    payload := jsonb_build_object('order_id', new.id::text, 'type', 'db_webhook');
    headers := jsonb_build_object('Content-Type', 'application/json');

    select net.http_post(
      url := url,
      body := payload,
      headers := headers
    ) into request_id;

    raise log '[Hub Webhook] Order % marked as paid, notification request_id: %', new.id, request_id;
  end if;

  return new;
end;
$$;

-- 3) Ensure trigger exists and is correct
-- Drop and recreate to avoid duplicates / drift
drop trigger if exists trg_notify_hub_on_paid_order on public.orders;

create trigger trg_notify_hub_on_paid_order
after update of status on public.orders
for each row
execute function public.notify_hub_on_paid_order();
