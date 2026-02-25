-- Add column to track when recovery email was sent
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS recovery_email_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add index for efficient querying of pending recovery emails
CREATE INDEX IF NOT EXISTS idx_leads_recovery_pending 
ON public.leads(status, created_at) 
WHERE recovery_email_sent_at IS NULL;