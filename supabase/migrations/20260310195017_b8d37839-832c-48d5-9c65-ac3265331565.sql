ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS telegram_id text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_profiles_telegram_id ON public.profiles (telegram_id) WHERE telegram_id IS NOT NULL;