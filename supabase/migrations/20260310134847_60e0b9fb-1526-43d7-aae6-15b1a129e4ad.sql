CREATE TABLE public.buyback_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  margin_used numeric NOT NULL DEFAULT 8000,
  margin_new numeric NOT NULL DEFAULT 5000,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

ALTER TABLE public.buyback_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company buyback settings" ON public.buyback_settings
  FOR ALL TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());