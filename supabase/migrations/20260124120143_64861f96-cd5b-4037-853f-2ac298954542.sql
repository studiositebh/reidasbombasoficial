-- Fix overly permissive RLS policy
-- Drop the permissive policy
DROP POLICY IF EXISTS "Service can manage scheduled deletions" ON public.scheduled_deletions;

-- Create proper policies for service operations (INSERT and DELETE via service role only)
-- The edge function uses service role which bypasses RLS, so we don't need a permissive policy
-- Instead, we'll rely on the service role key in edge functions

-- Allow users to insert their own deletion request
CREATE POLICY "Users can schedule their own deletion"
ON public.scheduled_deletions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their cancelled request (cleanup)
CREATE POLICY "Users can delete their cancelled deletion"
ON public.scheduled_deletions
FOR DELETE
USING (auth.uid() = user_id AND cancelled_at IS NOT NULL);