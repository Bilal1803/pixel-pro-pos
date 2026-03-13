
-- 1. Add replacement fields to devices
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS has_replacement boolean NOT NULL DEFAULT false;
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS replacement_details text;

-- 2. Price adjustment settings (condition + battery corrections for sale and buyback)
CREATE TABLE IF NOT EXISTS public.price_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  type text NOT NULL, -- 'sale_condition', 'sale_battery', 'buyback_condition', 'buyback_battery'
  grade text NOT NULL, -- 'A+', 'A', 'B', 'C', 'D' or '90+', '85-89', '80-84', 'below80'
  adjustment numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, type, grade)
);

ALTER TABLE public.price_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company price adjustments" ON public.price_adjustments
  FOR ALL TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- 3. Buyback base prices per model
CREATE TABLE IF NOT EXISTS public.buyback_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  model text NOT NULL,
  memory text,
  base_price numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, model, memory)
);

ALTER TABLE public.buyback_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company buyback prices" ON public.buyback_prices
  FOR ALL TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE INDEX IF NOT EXISTS idx_buyback_prices_company ON public.buyback_prices(company_id);

-- 4. Listing ad templates
CREATE TABLE IF NOT EXISTS public.listing_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Основной',
  template_text text NOT NULL DEFAULT '',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, name)
);

ALTER TABLE public.listing_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company listing templates" ON public.listing_templates
  FOR ALL TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_price_adjustments_company ON public.price_adjustments(company_id, type);
CREATE INDEX IF NOT EXISTS idx_listing_templates_company ON public.listing_templates(company_id);
