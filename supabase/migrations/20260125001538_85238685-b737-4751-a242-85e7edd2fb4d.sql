-- Create sync_progress table for real-time sync status tracking
CREATE TABLE public.sync_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_id text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'running',
  current_step text,
  step_progress integer DEFAULT 0,
  step_total integer DEFAULT 0,
  message text,
  categories_synced integer DEFAULT 0,
  attributes_synced integer DEFAULT 0,
  attribute_values_harvested integer DEFAULT 0,
  products_created integer DEFAULT 0,
  products_updated integer DEFAULT 0,
  errors text[] DEFAULT '{}',
  started_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sync_progress ENABLE ROW LEVEL SECURITY;

-- Allow admins full access
CREATE POLICY "Admins can manage sync_progress"
ON public.sync_progress
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Allow service role to manage (for edge functions)
CREATE POLICY "Service can manage sync_progress"
ON public.sync_progress
FOR ALL
USING (true)
WITH CHECK (true);

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.sync_progress;

-- Index for quick lookups
CREATE INDEX idx_sync_progress_sync_id ON public.sync_progress(sync_id);
CREATE INDEX idx_sync_progress_status ON public.sync_progress(status);