-- Create leads table for abandoned cart recovery
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  document TEXT,
  cart_items JSONB DEFAULT '[]'::jsonb,
  cart_total NUMERIC DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'abandoned',
  source TEXT DEFAULT 'checkout',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  converted_at TIMESTAMP WITH TIME ZONE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Admins can view all leads
CREATE POLICY "Admins can view all leads"
ON public.leads
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can manage leads
CREATE POLICY "Admins can manage leads"
ON public.leads
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow public insert for anonymous checkout (upsert from frontend)
CREATE POLICY "Public can insert leads"
ON public.leads
FOR INSERT
TO public
WITH CHECK (true);

-- Allow public update for upsert functionality
CREATE POLICY "Public can update own lead by email"
ON public.leads
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Index for faster lookups
CREATE INDEX idx_leads_email ON public.leads(email);
CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_created_at ON public.leads(created_at DESC);

-- Trigger to update updated_at
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();