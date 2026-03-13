-- Fix recursive RLS on platform_admins by using SECURITY DEFINER role checks

-- Full-admin check that bypasses RLS safely
CREATE OR REPLACE FUNCTION public.is_full_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_admins
    WHERE user_id = _user_id
      AND role = 'full_admin'
  );
$$;

-- Lock down function execution
REVOKE EXECUTE ON FUNCTION public.is_full_platform_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_full_platform_admin(uuid) TO authenticated;

-- Replace recursive policy with function-based policy
DROP POLICY IF EXISTS "Full admins manage platform_admins" ON public.platform_admins;

CREATE POLICY "Full admins manage platform_admins"
ON public.platform_admins
FOR ALL
TO authenticated
USING (public.is_full_platform_admin(auth.uid()))
WITH CHECK (public.is_full_platform_admin(auth.uid()));