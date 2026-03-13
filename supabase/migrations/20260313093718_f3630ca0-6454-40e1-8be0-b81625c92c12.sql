-- Make platform admin checks resilient when auth user_id changes (fallback by email)

CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
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
       OR (
         COALESCE(auth.jwt() ->> 'email', '') <> ''
         AND lower(email) = lower(auth.jwt() ->> 'email')
       )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_platform_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO authenticated;

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
    WHERE role = 'full_admin'
      AND (
        user_id = _user_id
        OR (
          COALESCE(auth.jwt() ->> 'email', '') <> ''
          AND lower(email) = lower(auth.jwt() ->> 'email')
        )
      )
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_full_platform_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_full_platform_admin(uuid) TO authenticated;