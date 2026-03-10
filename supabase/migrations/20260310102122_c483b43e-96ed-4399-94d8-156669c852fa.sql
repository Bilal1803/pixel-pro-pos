
-- Stories table (platform admin publishes)
CREATE TABLE public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  action_url text,
  action_label text DEFAULT 'Перейти',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

-- Everyone can read active stories
CREATE POLICY "Anyone can read active stories" ON public.stories
  FOR SELECT TO authenticated
  USING (is_active = true AND (expires_at IS NULL OR expires_at > now()));

-- Story views tracking
CREATE TABLE public.story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(story_id, user_id)
);

ALTER TABLE public.story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own views" ON public.story_views
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Subscriptions
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
  plan text NOT NULL DEFAULT 'start',
  max_stores integer NOT NULL DEFAULT 1,
  max_employees integer NOT NULL DEFAULT 2,
  max_devices integer NOT NULL DEFAULT 30,
  repairs_enabled boolean NOT NULL DEFAULT false,
  ai_enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own subscription" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id());

-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid,
  type text NOT NULL DEFAULT 'system',
  title text NOT NULL,
  message text,
  is_read boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company notifications" ON public.notifications
  FOR ALL TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- Telegram settings per company
CREATE TABLE public.telegram_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
  chat_id text,
  bot_token text,
  notify_sales boolean NOT NULL DEFAULT true,
  notify_shifts boolean NOT NULL DEFAULT true,
  notify_cash boolean NOT NULL DEFAULT true,
  notify_ai boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.telegram_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company telegram settings" ON public.telegram_settings
  FOR ALL TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

-- Auto-create subscription for new companies via trigger
CREATE OR REPLACE FUNCTION public.handle_new_company_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (company_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_company_created_subscription
  AFTER INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_company_subscription();
