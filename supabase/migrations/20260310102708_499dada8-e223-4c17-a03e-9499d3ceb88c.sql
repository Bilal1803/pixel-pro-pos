
-- Platform admins table (separate from company roles)
CREATE TABLE public.platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Only platform admins can see this table
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = _user_id)
$$;

CREATE POLICY "Platform admins can read" ON public.platform_admins
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- Allow platform admins to manage stories
CREATE POLICY "Platform admins manage stories" ON public.stories
  FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()))
  WITH CHECK (public.is_platform_admin(auth.uid()));

-- Allow platform admins to read all subscriptions
CREATE POLICY "Platform admins read subscriptions" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- Allow platform admins to update subscriptions
CREATE POLICY "Platform admins update subscriptions" ON public.subscriptions
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- Allow platform admins to read all companies
CREATE POLICY "Platform admins read companies" ON public.companies
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- Allow platform admins to update companies
CREATE POLICY "Platform admins update companies" ON public.companies
  FOR UPDATE TO authenticated
  USING (public.is_platform_admin(auth.uid()));

-- Allow platform admins to read all profiles
CREATE POLICY "Platform admins read profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_platform_admin(auth.uid()));
