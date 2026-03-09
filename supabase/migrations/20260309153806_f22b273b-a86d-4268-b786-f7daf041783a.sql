
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_company_id UUID;
  company_name TEXT;
  invited_company UUID;
  invited_role app_role;
BEGIN
  invited_company := (NEW.raw_user_meta_data->>'invited_company_id')::UUID;
  
  IF invited_company IS NOT NULL THEN
    invited_role := COALESCE((NEW.raw_user_meta_data->>'invited_role')::app_role, 'employee');
    
    INSERT INTO public.profiles (user_id, company_id, full_name, email)
    VALUES (NEW.id, invited_company, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
    
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, invited_role);
  ELSE
    company_name := COALESCE(NEW.raw_user_meta_data->>'company_name', 'Мой магазин');
    
    INSERT INTO public.companies (name) VALUES (company_name) RETURNING id INTO new_company_id;
    
    INSERT INTO public.profiles (user_id, company_id, full_name, email)
    VALUES (NEW.id, new_company_id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
    
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner');
    
    INSERT INTO public.stores (company_id, name) VALUES (new_company_id, 'Основной магазин');
  END IF;
  
  RETURN NEW;
END;
$function$;
