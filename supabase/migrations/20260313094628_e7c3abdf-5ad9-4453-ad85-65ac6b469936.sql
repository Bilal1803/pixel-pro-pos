
-- Audit log table for tracking all admin/system actions
CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  user_email text,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins read audit log"
  ON public.audit_log FOR SELECT TO authenticated
  USING (is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins insert audit log"
  ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (is_platform_admin(auth.uid()));

-- Admin notifications (platform-wide announcements)
CREATE TABLE public.admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  created_by uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active admin notifications"
  ON public.admin_notifications FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Platform admins manage admin notifications"
  ON public.admin_notifications FOR ALL TO authenticated
  USING (is_platform_admin(auth.uid()))
  WITH CHECK (is_platform_admin(auth.uid()));

-- System errors table for client-side error logging
CREATE TABLE public.system_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type text NOT NULL DEFAULT 'runtime',
  message text NOT NULL,
  stack text,
  file_name text,
  line_number int,
  column_number int,
  user_id uuid,
  user_email text,
  company_id uuid,
  company_name text,
  url text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.system_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins read system errors"
  ON public.system_errors FOR SELECT TO authenticated
  USING (is_platform_admin(auth.uid()));

CREATE POLICY "Anyone can insert system errors"
  ON public.system_errors FOR INSERT TO authenticated
  WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX idx_system_errors_created_at ON public.system_errors(created_at DESC);
CREATE INDEX idx_admin_notifications_active ON public.admin_notifications(is_active, created_at DESC);
