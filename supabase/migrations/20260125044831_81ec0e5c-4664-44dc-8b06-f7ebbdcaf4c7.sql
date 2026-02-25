-- Remove the restrictive admin-only SELECT policy
DROP POLICY IF EXISTS "Only admins can select store_settings" ON store_settings;

-- Create a public policy allowing anyone to read payment configuration
-- Note: Public keys are designed to be exposed in frontend - access tokens remain protected in edge functions
CREATE POLICY "Public can read store settings" 
ON store_settings 
FOR SELECT 
TO public 
USING (true);