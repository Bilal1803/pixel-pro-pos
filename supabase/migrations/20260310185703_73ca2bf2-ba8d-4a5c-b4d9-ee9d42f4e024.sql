
-- Invitations table for one-time invite links
CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  full_name text NOT NULL,
  phone text,
  role public.app_role NOT NULL DEFAULT 'employee',
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  created_by uuid NOT NULL,
  used_by uuid,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz
);

-- RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members manage invitations"
ON public.invitations
FOR ALL
TO authenticated
USING (company_id = get_user_company_id())
WITH CHECK (company_id = get_user_company_id());
