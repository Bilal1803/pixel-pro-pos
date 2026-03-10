CREATE TABLE public.ai_survey_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  store_type text NOT NULL,
  price_segment text NOT NULL,
  avg_daily_sales text NOT NULL,
  sales_channel text NOT NULL,
  main_goal text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id)
);

ALTER TABLE public.ai_survey_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own company survey" ON public.ai_survey_answers
  FOR ALL TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Platform admins read surveys" ON public.ai_survey_answers
  FOR SELECT TO authenticated
  USING (is_platform_admin(auth.uid()));