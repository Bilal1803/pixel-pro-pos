
-- Fix 1: Profiles INSERT - remove direct insert policy, let trigger handle it
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;

-- Only allow inserts via the handle_new_user trigger (SECURITY DEFINER)
-- No direct INSERT policy needed since handle_new_user runs as SECURITY DEFINER
-- If we need manual profile creation, restrict company_id:
CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() 
    AND company_id = get_user_company_id()
  );

-- Fix 2: User roles INSERT - remove self-service role assignment
DROP POLICY IF EXISTS "Users insert own role" ON public.user_roles;

-- No direct INSERT policy - roles are only assigned via handle_new_user (SECURITY DEFINER)
-- Platform admins can manage roles if needed
CREATE POLICY "Platform admins manage roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));
