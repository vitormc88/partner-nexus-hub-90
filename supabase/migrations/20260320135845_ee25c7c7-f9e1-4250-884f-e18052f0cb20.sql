
-- Partner renewal settings
CREATE TABLE public.partner_renewal_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id text NOT NULL,
  green_days integer NOT NULL DEFAULT 90,
  yellow_days integer NOT NULL DEFAULT 60,
  orange_days integer NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Clients
CREATE TABLE public.clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_code text NOT NULL UNIQUE,
  short_name text,
  commercial_name text NOT NULL,
  phone text,
  fax text,
  email text,
  website text,
  address text,
  state_region text,
  postal_code text,
  city text,
  country text,
  sector text,
  partner_id text,
  account_manager text,
  manager_owner text,
  installation_location text,
  first_installation_date date,
  first_installed_version text,
  current_version text,
  award_reference text,
  is_premium boolean NOT NULL DEFAULT false,
  has_custom_reports boolean NOT NULL DEFAULT false,
  has_custom_routine boolean NOT NULL DEFAULT false,
  is_inactive boolean NOT NULL DEFAULT false,
  auto_update boolean NOT NULL DEFAULT true,
  product_type text,
  license_type text,
  cloud_onpremise text DEFAULT 'On-premise',
  status text NOT NULL DEFAULT 'Active',
  observations text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Client contacts
CREATE TABLE public.client_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contact_name text NOT NULL,
  role_function text,
  phone text,
  mobile text,
  email text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Licenses
CREATE TABLE public.licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  product text,
  version text,
  database_type text,
  license_start_date date,
  license_end_date date,
  license_model text,
  periodicity text,
  sat_active boolean NOT NULL DEFAULT false,
  sat_end_date date,
  backoffice_users integer DEFAULT 0,
  backoffice_employee_users integer DEFAULT 0,
  mobile_users integer DEFAULT 0,
  web_accesses integer DEFAULT 0,
  api_access boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Licensed modules
CREATE TABLE public.licensed_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES public.licenses(id) ON DELETE CASCADE,
  module_name text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  license_type text,
  periodicity text,
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Contracts
CREATE TABLE public.contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  price_table_reference text,
  contract_start_date date,
  contract_end_date date,
  notice_period_days integer DEFAULT 30,
  contract_value numeric(12,2),
  invoiced_value numeric(12,2),
  num_installments integer DEFAULT 1,
  hosting_value numeric(12,2),
  mww_web_value numeric(12,2),
  sat_value numeric(12,2),
  total_value numeric(12,2),
  currency text DEFAULT 'EUR',
  partner_revenue_split numeric(5,2),
  renewal_increase_pct numeric(5,2),
  renewal_freeze_notes text,
  billing_notes text,
  observations text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Payments
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES public.contracts(id) ON DELETE SET NULL,
  payment_status text NOT NULL DEFAULT 'Pending',
  invoice_number text,
  invoice_date date,
  due_date date,
  amount_due numeric(12,2),
  amount_paid numeric(12,2),
  outstanding_balance numeric(12,2),
  last_payment_date date,
  billing_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Client notes
CREATE TABLE public.client_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  note_type text DEFAULT 'general',
  content text NOT NULL,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Client credentials
CREATE TABLE public.client_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  system_url text,
  login text,
  username text,
  password_secret text,
  environment_type text,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Audit logs
CREATE TABLE public.client_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  action text NOT NULL,
  field_name text,
  old_value text,
  new_value text,
  changed_by text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.partner_renewal_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.licensed_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_audit_logs ENABLE ROW LEVEL SECURITY;

-- Temporary permissive policies (to be replaced when auth is added)
CREATE POLICY "Allow all access to partner_renewal_settings" ON public.partner_renewal_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to client_contacts" ON public.client_contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to licenses" ON public.licenses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to licensed_modules" ON public.licensed_modules FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to contracts" ON public.contracts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to client_notes" ON public.client_notes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to client_credentials" ON public.client_credentials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to client_audit_logs" ON public.client_audit_logs FOR ALL USING (true) WITH CHECK (true);

-- Indexes
CREATE INDEX idx_clients_partner_id ON public.clients(partner_id);
CREATE INDEX idx_clients_status ON public.clients(status);
CREATE INDEX idx_licenses_client_id ON public.licenses(client_id);
CREATE INDEX idx_contracts_client_id ON public.contracts(client_id);
CREATE INDEX idx_payments_client_id ON public.payments(client_id);
CREATE INDEX idx_client_contacts_client_id ON public.client_contacts(client_id);
CREATE INDEX idx_client_notes_client_id ON public.client_notes(client_id);
CREATE INDEX idx_client_audit_logs_client_id ON public.client_audit_logs(client_id);
