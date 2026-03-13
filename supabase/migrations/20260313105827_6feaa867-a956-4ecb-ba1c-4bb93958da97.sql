
-- Salary settings per employee (what % or fixed amount they earn per sale type)
CREATE TABLE public.salary_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL,
  accrual_type text NOT NULL CHECK (accrual_type IN ('device', 'accessory', 'service', 'above_price')),
  calc_type text NOT NULL DEFAULT 'percent' CHECK (calc_type IN ('percent', 'fixed')),
  value numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, employee_id, accrual_type)
);

ALTER TABLE public.salary_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company salary settings" ON public.salary_settings
  FOR ALL TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- Salary accruals (auto-calculated per sale)
CREATE TABLE public.salary_accruals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL,
  sale_id uuid REFERENCES public.sales(id) ON DELETE SET NULL,
  sale_item_id uuid REFERENCES public.sale_items(id) ON DELETE SET NULL,
  accrual_type text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.salary_accruals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company salary accruals" ON public.salary_accruals
  FOR ALL TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- Salary bonuses/penalties (manual)
CREATE TABLE public.salary_bonuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL,
  type text NOT NULL CHECK (type IN ('bonus', 'penalty')),
  amount numeric NOT NULL,
  reason text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.salary_bonuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company salary bonuses" ON public.salary_bonuses
  FOR ALL TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());
