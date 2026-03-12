
CREATE OR REPLACE FUNCTION public.validate_listing_status()
RETURNS TRIGGER LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.listing_status NOT IN ('not_listed', 'listed', 'needs_relist') THEN
    RAISE EXCEPTION 'Invalid listing_status: %', NEW.listing_status;
  END IF;
  RETURN NEW;
END;
$$;
