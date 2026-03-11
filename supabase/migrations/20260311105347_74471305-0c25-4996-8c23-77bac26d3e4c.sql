
-- Payment settings table for configuring commission per payment method
CREATE TABLE public.payment_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  method text NOT NULL,
  label text NOT NULL,
  percent_fee numeric NOT NULL DEFAULT 0,
  fixed_fee numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, method)
);

ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company payment settings" ON public.payment_settings
  FOR ALL TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- Add payment_fee and price_change fields to sales
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS payment_fee numeric DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS price_change_reason text;

-- Add original_price to sale_items for tracking price changes
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS original_price numeric;
