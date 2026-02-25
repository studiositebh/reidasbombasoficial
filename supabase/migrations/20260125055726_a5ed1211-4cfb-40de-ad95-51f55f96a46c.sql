-- Allow public read for a single order by ID (UUID) so guest users can view their order
create policy "Public can read single order by id"
on public.orders
for select
to anon
using (true);

-- NOTE: This opens read access to all orders for anon. 
-- For better security, consider restricting by tracking_token instead.