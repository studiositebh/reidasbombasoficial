-- Create table to track scheduled account deletions
CREATE TABLE public.scheduled_deletions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.scheduled_deletions ENABLE ROW LEVEL SECURITY;

-- Users can view their own scheduled deletion
CREATE POLICY "Users can view their own scheduled deletion"
ON public.scheduled_deletions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can cancel their own scheduled deletion (update cancelled_at)
CREATE POLICY "Users can cancel their own scheduled deletion"
ON public.scheduled_deletions
FOR UPDATE
USING (auth.uid() = user_id);

-- Service role can manage all (for the edge function)
CREATE POLICY "Service can manage scheduled deletions"
ON public.scheduled_deletions
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for efficient querying of pending deletions
CREATE INDEX idx_scheduled_deletions_pending 
ON public.scheduled_deletions (scheduled_for) 
WHERE cancelled_at IS NULL;