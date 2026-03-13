
-- Global salary settings (company-wide defaults)
CREATE TABLE public.global_salary_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  accrual_type text NOT NULL,
  calc_type text NOT NULL DEFAULT 'percent',
  value numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, accrual_type)
);

ALTER TABLE public.global_salary_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company global salary settings" ON public.global_salary_settings
  FOR ALL TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());
