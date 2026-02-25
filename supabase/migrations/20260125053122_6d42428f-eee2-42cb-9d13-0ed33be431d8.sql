-- Drop existing policies that use incorrect role specification
DROP POLICY IF EXISTS "Public can insert leads" ON public.leads;
DROP POLICY IF EXISTS "Public can update own lead by email" ON public.leads;

-- Recreate INSERT policy with correct roles for Supabase client
CREATE POLICY "Anon and authenticated can insert leads"
ON public.leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Recreate UPDATE policy with correct roles for Supabase client
CREATE POLICY "Anon and authenticated can update leads"
ON public.leads
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);