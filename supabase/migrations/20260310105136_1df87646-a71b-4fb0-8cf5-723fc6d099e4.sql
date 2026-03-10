
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Platform admins read subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Platform admins update subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users see own subscription" ON public.subscriptions;

-- Recreate as PERMISSIVE
CREATE POLICY "Users see own subscription"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "Platform admins read subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins update subscriptions"
  ON public.subscriptions FOR UPDATE
  TO authenticated
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));
