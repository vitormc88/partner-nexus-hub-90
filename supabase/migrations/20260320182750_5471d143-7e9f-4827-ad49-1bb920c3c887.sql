
-- Partner Onboarding
CREATE TABLE public.partner_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'Interested',
  progress_pct INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  assigned_manager TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.partner_onboarding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to partner_onboarding" ON public.partner_onboarding FOR ALL TO public USING (true) WITH CHECK (true);

-- Onboarding checklist items
CREATE TABLE public.onboarding_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id UUID REFERENCES public.partner_onboarding(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL DEFAULT 'Commercial',
  task_name TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.onboarding_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to onboarding_checklist" ON public.onboarding_checklist FOR ALL TO public USING (true) WITH CHECK (true);

-- Partner Certifications
CREATE TABLE public.partner_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT,
  certification_level INTEGER NOT NULL DEFAULT 1,
  certification_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'In Progress',
  awarded_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.partner_certifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to partner_certifications" ON public.partner_certifications FOR ALL TO public USING (true) WITH CHECK (true);

-- Partner Tiers
CREATE TABLE public.partner_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id TEXT NOT NULL UNIQUE,
  current_tier INTEGER NOT NULL DEFAULT 1,
  tier_name TEXT NOT NULL DEFAULT 'Registered Partner',
  previous_tier INTEGER,
  upgraded_at TIMESTAMP WITH TIME ZONE,
  downgraded_at TIMESTAMP WITH TIME ZONE,
  annual_revenue NUMERIC DEFAULT 0,
  total_deals INTEGER DEFAULT 0,
  win_rate NUMERIC DEFAULT 0,
  certified_users INTEGER DEFAULT 0,
  auto_suggested_tier INTEGER,
  hq_validated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.partner_tiers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to partner_tiers" ON public.partner_tiers FOR ALL TO public USING (true) WITH CHECK (true);

-- Partner Health Scores (historical tracking)
CREATE TABLE public.partner_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id TEXT NOT NULL,
  overall_score INTEGER NOT NULL DEFAULT 50,
  revenue_score INTEGER DEFAULT 0,
  activity_score INTEGER DEFAULT 0,
  pipeline_score INTEGER DEFAULT 0,
  conversion_score INTEGER DEFAULT 0,
  renewal_score INTEGER DEFAULT 0,
  certification_score INTEGER DEFAULT 0,
  trend TEXT DEFAULT 'stable',
  risk_level TEXT DEFAULT 'green',
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.partner_health_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to partner_health_scores" ON public.partner_health_scores FOR ALL TO public USING (true) WITH CHECK (true);

-- Gamification: Badges
CREATE TABLE public.partner_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id TEXT NOT NULL,
  badge_name TEXT NOT NULL,
  badge_icon TEXT,
  badge_description TEXT,
  awarded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.partner_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to partner_badges" ON public.partner_badges FOR ALL TO public USING (true) WITH CHECK (true);

-- Gamification: Missions
CREATE TABLE public.partner_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id TEXT NOT NULL,
  mission_name TEXT NOT NULL,
  mission_description TEXT,
  target_value INTEGER NOT NULL DEFAULT 1,
  current_value INTEGER NOT NULL DEFAULT 0,
  mission_type TEXT DEFAULT 'quarterly',
  status TEXT NOT NULL DEFAULT 'Active',
  starts_at TIMESTAMP WITH TIME ZONE,
  ends_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.partner_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all access to partner_missions" ON public.partner_missions FOR ALL TO public USING (true) WITH CHECK (true);
