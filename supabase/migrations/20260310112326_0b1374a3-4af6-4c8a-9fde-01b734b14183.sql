-- Create storage bucket for story images
INSERT INTO storage.buckets (id, name, public)
VALUES ('stories', 'stories', true)
ON CONFLICT (id) DO NOTHING;

-- Allow platform admins to upload to stories bucket
CREATE POLICY "Platform admins upload stories"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'stories' AND public.is_platform_admin(auth.uid())
);

-- Allow platform admins to update stories files
CREATE POLICY "Platform admins update stories"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'stories' AND public.is_platform_admin(auth.uid())
);

-- Allow platform admins to delete stories files
CREATE POLICY "Platform admins delete stories"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'stories' AND public.is_platform_admin(auth.uid())
);

-- Allow anyone authenticated to read story images
CREATE POLICY "Anyone can read story images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'stories');