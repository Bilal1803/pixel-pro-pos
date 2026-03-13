
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS category text DEFAULT 'other';
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS device_id uuid REFERENCES public.devices(id) ON DELETE SET NULL;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS result_url text;
