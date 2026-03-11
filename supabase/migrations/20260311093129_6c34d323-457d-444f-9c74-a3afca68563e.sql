
-- Add role column to platform_admins
ALTER TABLE public.platform_admins ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'full_admin';

-- Update RLS to allow full_admin to INSERT/UPDATE/DELETE platform_admins
CREATE POLICY "Full admins manage platform_admins"
ON public.platform_admins
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.platform_admins pa
    WHERE pa.user_id = auth.uid() AND pa.role = 'full_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.platform_admins pa
    WHERE pa.user_id = auth.uid() AND pa.role = 'full_admin'
  )
);
