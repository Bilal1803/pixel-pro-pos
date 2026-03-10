
ALTER TABLE public.subscriptions 
ADD COLUMN trial_ends_at timestamp with time zone DEFAULT (now() + interval '3 days'),
ADD COLUMN paid boolean NOT NULL DEFAULT false;

-- Update existing subscriptions to have trial_ends_at set
UPDATE public.subscriptions SET trial_ends_at = created_at + interval '3 days' WHERE plan IN ('start', 'business');
UPDATE public.subscriptions SET trial_ends_at = NULL, paid = true WHERE plan = 'premier';

-- Update the trigger function to set trial for new companies
CREATE OR REPLACE FUNCTION public.handle_new_company_subscription()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.subscriptions (company_id, trial_ends_at, paid)
  VALUES (NEW.id, now() + interval '3 days', false);
  RETURN NEW;
END;
$function$;
