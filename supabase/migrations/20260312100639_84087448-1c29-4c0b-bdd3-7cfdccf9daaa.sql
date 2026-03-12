
-- Add listing tracking fields to devices
ALTER TABLE public.devices
  ADD COLUMN listing_status TEXT NOT NULL DEFAULT 'not_listed',
  ADD COLUMN listing_url TEXT,
  ADD COLUMN listing_published_at TIMESTAMP WITH TIME ZONE;

-- Add constraint for valid listing statuses
CREATE OR REPLACE FUNCTION public.validate_listing_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.listing_status NOT IN ('not_listed', 'listed', 'needs_relist') THEN
    RAISE EXCEPTION 'Invalid listing_status: %', NEW.listing_status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_device_listing_status
  BEFORE INSERT OR UPDATE ON public.devices
  FOR EACH ROW EXECUTE FUNCTION validate_listing_status();
