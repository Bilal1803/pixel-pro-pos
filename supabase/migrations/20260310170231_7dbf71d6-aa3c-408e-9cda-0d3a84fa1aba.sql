
-- Device transfers table for tracking movements between stores
CREATE TABLE public.device_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES public.devices(id) ON DELETE CASCADE,
  from_store_id UUID REFERENCES public.stores(id),
  to_store_id UUID NOT NULL REFERENCES public.stores(id),
  transferred_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.device_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company device transfers" ON public.device_transfers
  FOR ALL TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());
