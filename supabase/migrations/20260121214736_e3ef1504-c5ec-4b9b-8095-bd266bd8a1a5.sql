-- Fix the generate_tracking_token function to use the correct schema for gen_random_bytes
CREATE OR REPLACE FUNCTION public.generate_tracking_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Generate a secure random token (16 bytes = 32 hex chars)
  -- Use extensions schema explicitly for gen_random_bytes
  NEW.tracking_token := encode(extensions.gen_random_bytes(16), 'hex');
  RETURN NEW;
END;
$function$;