-- Add SELECT policy for anon and authenticated to enable upsert ON CONFLICT
-- The upsert operation needs SELECT permission to check if record exists
CREATE POLICY "Anon and authenticated can select leads for upsert"
ON public.leads
FOR SELECT
TO anon, authenticated
USING (true);