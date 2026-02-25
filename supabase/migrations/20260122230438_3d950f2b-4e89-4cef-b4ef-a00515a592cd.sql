-- Create table for saved payment cards
CREATE TABLE public.saved_cards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  customer_id TEXT, -- Mercado Pago customer ID
  card_id TEXT NOT NULL, -- Mercado Pago card ID
  first_six_digits TEXT NOT NULL,
  last_four_digits TEXT NOT NULL,
  card_brand TEXT NOT NULL,
  card_holder_name TEXT NOT NULL,
  expiration_month INTEGER NOT NULL,
  expiration_year INTEGER NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_cards ENABLE ROW LEVEL SECURITY;

-- Users can only view their own cards
CREATE POLICY "Users can view their own saved cards"
ON public.saved_cards
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own cards
CREATE POLICY "Users can save their own cards"
ON public.saved_cards
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own cards
CREATE POLICY "Users can update their own saved cards"
ON public.saved_cards
FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own cards
CREATE POLICY "Users can delete their own saved cards"
ON public.saved_cards
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_saved_cards_updated_at
BEFORE UPDATE ON public.saved_cards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster lookups
CREATE INDEX idx_saved_cards_user_id ON public.saved_cards(user_id);