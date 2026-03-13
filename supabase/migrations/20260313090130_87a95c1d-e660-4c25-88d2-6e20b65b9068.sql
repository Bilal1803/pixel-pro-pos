
-- 1. Additional indexes for story_views and notifications
CREATE INDEX IF NOT EXISTS idx_story_views_story_id ON public.story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_user_id ON public.story_views(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_company ON public.notifications(company_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(is_read);

-- 2. Allow anon users to read active stories (for landing/demo)
DROP POLICY IF EXISTS "Anyone can read active stories" ON public.stories;
CREATE POLICY "Anyone can read active stories"
  ON public.stories
  FOR SELECT
  TO anon, authenticated
  USING ((is_active = true) AND ((expires_at IS NULL) OR (expires_at > now())));

-- 3. Plans reference table
CREATE TABLE IF NOT EXISTS public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  max_stores integer NOT NULL DEFAULT 1,
  max_employees integer NOT NULL DEFAULT 2,
  max_devices integer NOT NULL DEFAULT 30,
  repairs_enabled boolean NOT NULL DEFAULT false,
  ai_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Plans are readable by everyone, managed by platform admins
CREATE POLICY "Anyone can read plans" ON public.plans FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Platform admins manage plans" ON public.plans FOR ALL TO authenticated
  USING (is_platform_admin(auth.uid())) WITH CHECK (is_platform_admin(auth.uid()));

-- Seed default plans
INSERT INTO public.plans (name, max_stores, max_employees, max_devices, repairs_enabled, ai_enabled)
VALUES
  ('start', 1, 2, 30, false, false),
  ('business', 3, 10, 500, true, true),
  ('premier', 10, 50, 5000, true, true)
ON CONFLICT (name) DO NOTHING;

-- Add plan_id to subscriptions
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.plans(id);

-- Link existing subscriptions to plans
UPDATE public.subscriptions s
SET plan_id = p.id
FROM public.plans p
WHERE s.plan = p.name AND s.plan_id IS NULL;

-- 4. Secure telegram bot_token: drop permissive ALL policy, replace with granular ones
DROP POLICY IF EXISTS "Company telegram settings" ON public.telegram_settings;

-- Users can read settings but NOT bot_token (handled at app level; RLS can't hide columns)
-- So we allow read/write but will create a view for safe access
CREATE POLICY "Company telegram settings read" ON public.telegram_settings
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Company telegram settings write" ON public.telegram_settings
  FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Company telegram settings update" ON public.telegram_settings
  FOR UPDATE TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Company telegram settings delete" ON public.telegram_settings
  FOR DELETE TO authenticated
  USING (company_id = get_user_company_id());
