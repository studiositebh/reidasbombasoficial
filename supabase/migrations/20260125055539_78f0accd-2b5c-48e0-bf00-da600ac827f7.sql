-- Tighten RLS on public.leads to avoid overly permissive INSERT/UPDATE policies

alter table public.leads enable row level security;

-- Drop overly permissive policies (if they exist)
drop policy if exists "Anon and authenticated can update leads" on public.leads;
drop policy if exists "Anon and authenticated can insert leads" on public.leads;

-- Recreate INSERT policy with basic validation (prevents WITH CHECK (true))
create policy "Anon and authenticated can insert leads"
on public.leads
for insert
to anon, authenticated
with check (
  email is not null
  and length(trim(email)) >= 5
  and position('@' in email) > 1
);

-- NOTE: Updates to leads should be performed by backend functions using the service role (bypasses RLS),
-- or by admins via the existing admin policy.
