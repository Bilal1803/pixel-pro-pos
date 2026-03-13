-- Allow users to read their own platform_admins row (fixes admin panel visibility)
CREATE POLICY "Users can read own admin record"
  ON public.platform_admins
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());