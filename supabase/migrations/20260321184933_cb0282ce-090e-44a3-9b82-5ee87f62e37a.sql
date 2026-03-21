
-- ============================================
-- ManWinWin PartnerOS — Production Backend
-- ============================================

-- 1. App role enum
CREATE TYPE public.app_role AS ENUM (
  'hq_admin', 'partner_manager', 'hq_standard',
  'partner_admin', 'partner_sales', 'partner_restricted'
);

-- 2. Partners table (core entity — replaces mock data)
CREATE TABLE public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_code text UNIQUE NOT NULL,
  company_name text NOT NULL,
  legal_name text,
  country text,
  region text,
  partnership_level text DEFAULT 'Reseller',
  partner_type text DEFAULT 'Reseller',
  tier_id integer DEFAULT 1,
  status text DEFAULT 'Active',
  start_date date,
  primary_contact_name text,
  primary_contact_email text,
  phone text,
  website text,
  assigned_manager_id uuid,
  alert_notice_days integer DEFAULT 60,
  onboarding_status text DEFAULT 'Not Started',
  health_score integer DEFAULT 50,
  revenue_ytd numeric DEFAULT 0,
  total_revenue numeric DEFAULT 0,
  pipeline_value numeric DEFAULT 0,
  number_of_clients integer DEFAULT 0,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  updated_by uuid
);

-- 3. Profiles table (linked to auth.users)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  is_hq boolean DEFAULT false,
  is_active boolean DEFAULT true,
  last_login_at timestamptz,
  invitation_status text DEFAULT 'pending',
  onboarding_completion_pct integer DEFAULT 0,
  certification_level integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. User roles (separate table per security best practices)
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- 5. Security definer functions for RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_hq_user(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('hq_admin', 'partner_manager', 'hq_standard')
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_partner_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT partner_id FROM public.profiles WHERE id = _user_id
$$;

-- 6. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Document categories
CREATE TABLE public.document_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  parent_category_id uuid REFERENCES public.document_categories(id),
  sort_order integer DEFAULT 0,
  icon text,
  created_at timestamptz DEFAULT now()
);

-- 8. Documents / Knowledge Base
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category_id uuid REFERENCES public.document_categories(id),
  partner_id uuid REFERENCES public.partners(id),
  visibility_scope text DEFAULT 'global',
  file_url text,
  file_name text,
  file_type text,
  file_size_bytes bigint,
  version_number integer DEFAULT 1,
  uploaded_by uuid,
  tags text[],
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 9. Training
CREATE TABLE public.training_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text DEFAULT 'General',
  visibility_scope text DEFAULT 'global',
  required_for_tier integer,
  thumbnail_url text,
  estimated_duration_minutes integer,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.training_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.training_courses(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content_type text DEFAULT 'video',
  content_url text,
  description text,
  order_index integer DEFAULT 0,
  duration_minutes integer,
  quiz_required boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.training_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid REFERENCES public.training_courses(id) ON DELETE CASCADE NOT NULL,
  module_id uuid REFERENCES public.training_modules(id),
  progress_pct integer DEFAULT 0,
  is_completed boolean DEFAULT false,
  completed_at timestamptz,
  score integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, course_id)
);

-- 10. Announcements
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text,
  category text DEFAULT 'General',
  audience_scope text DEFAULT 'all',
  partner_id uuid REFERENCES public.partners(id),
  published_by uuid,
  published_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- 11. Generic audit logs
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid,
  action_type text NOT NULL,
  old_value jsonb,
  new_value jsonb,
  performed_by uuid,
  performed_at timestamptz DEFAULT now(),
  ip_address text,
  notes text
);

-- 12. Enable RLS on all new tables
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 13. RLS Policies — Profiles
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_hq_user(auth.uid()) OR
    (partner_id IS NOT NULL AND partner_id = public.get_user_partner_id(auth.uid())));
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT
  WITH CHECK (true);

-- RLS — User roles
CREATE POLICY "roles_select" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'hq_admin'));
CREATE POLICY "roles_insert" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'hq_admin'));
CREATE POLICY "roles_delete" ON public.user_roles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'hq_admin'));

-- RLS — Partners
CREATE POLICY "partners_select" ON public.partners FOR SELECT TO authenticated
  USING (public.is_hq_user(auth.uid()) OR id = public.get_user_partner_id(auth.uid()));
CREATE POLICY "partners_insert" ON public.partners FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'hq_admin') OR public.has_role(auth.uid(), 'partner_manager'));
CREATE POLICY "partners_update" ON public.partners FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'hq_admin') OR public.has_role(auth.uid(), 'partner_manager'))
  WITH CHECK (public.has_role(auth.uid(), 'hq_admin') OR public.has_role(auth.uid(), 'partner_manager'));
CREATE POLICY "partners_delete" ON public.partners FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'hq_admin'));

-- RLS — Documents
CREATE POLICY "documents_select" ON public.documents FOR SELECT TO authenticated
  USING (visibility_scope = 'global' OR public.is_hq_user(auth.uid()) OR
    (partner_id IS NOT NULL AND partner_id = public.get_user_partner_id(auth.uid())));
CREATE POLICY "documents_insert" ON public.documents FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'hq_admin') OR public.has_role(auth.uid(), 'partner_manager'));
CREATE POLICY "documents_update" ON public.documents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'hq_admin') OR public.has_role(auth.uid(), 'partner_manager'));
CREATE POLICY "documents_delete" ON public.documents FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'hq_admin'));

-- RLS — Document categories
CREATE POLICY "doc_categories_select" ON public.document_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "doc_categories_manage" ON public.document_categories FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'hq_admin'));

-- RLS — Training
CREATE POLICY "courses_select" ON public.training_courses FOR SELECT TO authenticated
  USING (is_active OR public.has_role(auth.uid(), 'hq_admin'));
CREATE POLICY "courses_insert" ON public.training_courses FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'hq_admin'));
CREATE POLICY "modules_select" ON public.training_modules FOR SELECT TO authenticated USING (true);
CREATE POLICY "modules_insert" ON public.training_modules FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'hq_admin'));
CREATE POLICY "progress_select" ON public.training_progress FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'hq_admin'));
CREATE POLICY "progress_insert" ON public.training_progress FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "progress_update" ON public.training_progress FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- RLS — Announcements
CREATE POLICY "announcements_select" ON public.announcements FOR SELECT TO authenticated
  USING (is_active OR public.has_role(auth.uid(), 'hq_admin'));
CREATE POLICY "announcements_insert" ON public.announcements FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'hq_admin'));

-- RLS — Audit logs
CREATE POLICY "audit_select" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'hq_admin'));
CREATE POLICY "audit_insert" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (true);

-- 14. Storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit)
  VALUES ('documents', 'documents', false, 52428800);
INSERT INTO storage.buckets (id, name, public, file_size_limit)
  VALUES ('training-assets', 'training-assets', false, 104857600);
INSERT INTO storage.buckets (id, name, public, file_size_limit)
  VALUES ('avatars', 'avatars', true, 5242880);

-- Storage RLS
CREATE POLICY "auth_upload_documents" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents');
CREATE POLICY "auth_read_documents" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents');
CREATE POLICY "auth_read_training" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'training-assets');
CREATE POLICY "hq_upload_training" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'training-assets');
CREATE POLICY "public_read_avatars" ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');
CREATE POLICY "auth_upload_avatars" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

-- 15. Indexes
CREATE INDEX idx_profiles_partner ON public.profiles(partner_id);
CREATE INDEX idx_partners_status ON public.partners(status);
CREATE INDEX idx_partners_country ON public.partners(country);
CREATE INDEX idx_documents_category ON public.documents(category_id);
CREATE INDEX idx_documents_partner ON public.documents(partner_id);
CREATE INDEX idx_training_progress_user ON public.training_progress(user_id);
CREATE INDEX idx_training_modules_course ON public.training_modules(course_id);
CREATE INDEX idx_audit_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_performer ON public.audit_logs(performed_by);

-- 16. Auto-update updated_at trigger function
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_partners_updated BEFORE UPDATE ON public.partners FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_documents_updated BEFORE UPDATE ON public.documents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_courses_updated BEFORE UPDATE ON public.training_courses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_progress_updated BEFORE UPDATE ON public.training_progress FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 17. Realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.partners;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
