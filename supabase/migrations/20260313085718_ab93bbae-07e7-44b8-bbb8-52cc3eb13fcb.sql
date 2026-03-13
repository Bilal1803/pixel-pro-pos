
-- Performance indexes for scaling to 1000+ stores and 50000+ devices

-- devices: most queried table
CREATE INDEX IF NOT EXISTS idx_devices_company_store ON public.devices (company_id, store_id);
CREATE INDEX IF NOT EXISTS idx_devices_company_status ON public.devices (company_id, status);
CREATE INDEX IF NOT EXISTS idx_devices_imei ON public.devices (imei);
CREATE INDEX IF NOT EXISTS idx_devices_company_model ON public.devices (company_id, model);
CREATE INDEX IF NOT EXISTS idx_devices_created_at ON public.devices (created_at DESC);

-- sales: analytics and history
CREATE INDEX IF NOT EXISTS idx_sales_company_created ON public.sales (company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_company_store ON public.sales (company_id, store_id);
CREATE INDEX IF NOT EXISTS idx_sales_employee ON public.sales (employee_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON public.sale_items (sale_id);

-- shifts and cash
CREATE INDEX IF NOT EXISTS idx_shifts_employee_status ON public.shifts (employee_id, status);
CREATE INDEX IF NOT EXISTS idx_shifts_company_store ON public.shifts (company_id, store_id);
CREATE INDEX IF NOT EXISTS idx_cash_ops_shift ON public.cash_operations (shift_id);
CREATE INDEX IF NOT EXISTS idx_cash_ops_company_store ON public.cash_operations (company_id, store_id);

-- tasks
CREATE INDEX IF NOT EXISTS idx_tasks_company_status ON public.tasks (company_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_company_store ON public.tasks (company_id, store_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON public.tasks (assigned_to);

-- profiles
CREATE INDEX IF NOT EXISTS idx_profiles_user ON public.profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_company ON public.profiles (company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_telegram ON public.profiles (telegram_id);

-- user_roles
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles (user_id);

-- products
CREATE INDEX IF NOT EXISTS idx_products_company_store ON public.products (company_id, store_id);

-- repairs
CREATE INDEX IF NOT EXISTS idx_repairs_company_status ON public.repairs (company_id, status);

-- clients
CREATE INDEX IF NOT EXISTS idx_clients_company ON public.clients (company_id);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notifications_company_unread ON public.notifications (company_id, is_read) WHERE is_read = false;

-- invitations
CREATE INDEX IF NOT EXISTS idx_invitations_code ON public.invitations (code) WHERE status = 'pending';

-- expenses
CREATE INDEX IF NOT EXISTS idx_expenses_company_date ON public.expenses (company_id, date DESC);
