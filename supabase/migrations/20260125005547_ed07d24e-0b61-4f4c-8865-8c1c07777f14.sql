-- Add updated_at column to sync_progress table for tracking updates
ALTER TABLE public.sync_progress 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create a trigger to automatically update updated_at
CREATE OR REPLACE FUNCTION public.update_sync_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS update_sync_progress_updated_at ON public.sync_progress;

CREATE TRIGGER update_sync_progress_updated_at
BEFORE UPDATE ON public.sync_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_sync_progress_updated_at();