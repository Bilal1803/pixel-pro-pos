
-- Fix companies policies (also restrictive)
DROP POLICY IF EXISTS "Users see own company" ON public.companies;
DROP POLICY IF EXISTS "Owners update own company" ON public.companies;
DROP POLICY IF EXISTS "Platform admins read companies" ON public.companies;
DROP POLICY IF EXISTS "Platform admins update companies" ON public.companies;

CREATE POLICY "Users see own company"
  ON public.companies FOR SELECT
  TO authenticated
  USING (id = get_user_company_id());

CREATE POLICY "Owners update own company"
  ON public.companies FOR UPDATE
  TO authenticated
  USING (id = get_user_company_id());

CREATE POLICY "Platform admins read companies"
  ON public.companies FOR SELECT
  TO authenticated
  USING (is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins update companies"
  ON public.companies FOR UPDATE
  TO authenticated
  USING (is_platform_admin(auth.uid()));

-- Fix platform_admins policy
DROP POLICY IF EXISTS "Platform admins can read" ON public.platform_admins;

CREATE POLICY "Platform admins can read"
  ON public.platform_admins FOR SELECT
  TO authenticated
  USING (is_platform_admin(auth.uid()));

-- Fix profiles admin read
DROP POLICY IF EXISTS "Platform admins read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users see company profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

CREATE POLICY "Users see company profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Platform admins read profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (is_platform_admin(auth.uid()));

CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());
