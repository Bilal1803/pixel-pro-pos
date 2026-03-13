
-- Add min_price and max_price columns to global_salary_settings
ALTER TABLE public.global_salary_settings 
  ADD COLUMN IF NOT EXISTS min_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_price numeric DEFAULT NULL;

-- Drop unique constraint on (company_id, accrual_type) to allow multiple rules per category
ALTER TABLE public.global_salary_settings DROP CONSTRAINT IF EXISTS global_salary_settings_company_id_accrual_type_key;

-- Add min_price and max_price columns to salary_settings (individual)
ALTER TABLE public.salary_settings 
  ADD COLUMN IF NOT EXISTS min_price numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_price numeric DEFAULT NULL;

-- Drop unique constraint if exists on salary_settings
ALTER TABLE public.salary_settings DROP CONSTRAINT IF EXISTS salary_settings_company_id_employee_id_accrual_type_key;
