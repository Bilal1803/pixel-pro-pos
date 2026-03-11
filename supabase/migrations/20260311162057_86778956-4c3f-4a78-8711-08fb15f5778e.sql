
-- Drop restrictive policies
DROP POLICY IF EXISTS "Platform admins can read" ON public.platform_admins;
DROP POLICY IF EXISTS "Full admins manage platform_admins" ON public.platform_admins;

-- Recreate as PERMISSIVE
CREATE POLICY "Platform admins can read"
  ON public.platform_admins
  FOR SELECT
  TO authenticated
  USING (is_platform_admin(auth.uid()));

CREATE POLICY "Full admins manage platform_admins"
  ON public.platform_admins
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_admins pa
      WHERE pa.user_id = auth.uid() AND pa.role = 'full_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_admins pa
      WHERE pa.user_id = auth.uid() AND pa.role = 'full_admin'
    )
  );
