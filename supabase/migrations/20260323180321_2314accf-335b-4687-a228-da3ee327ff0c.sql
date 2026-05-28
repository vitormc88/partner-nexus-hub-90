-- Environment-safe seed: only runs if the auth user actually exists
-- (e.g. in dev). Preview/CI databases without this user skip the block,
-- avoiding the user_roles_user_id_fkey violation.
DO $$
DECLARE
  target_user uuid := '9e0a5eb0-5052-492b-97ff-a333b7242d43';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user) THEN
    RAISE NOTICE 'Skipping HQ admin seed: user % not present in this environment', target_user;
    RETURN;
  END IF;

  UPDATE public.profiles SET is_hq = true, is_active = true WHERE id = target_user;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_user, 'hq_admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  DELETE FROM public.user_module_permissions WHERE user_id = target_user;

  INSERT INTO public.user_module_permissions (user_id, module_key, access_level) VALUES
    (target_user, 'dashboard', 'admin'),
    (target_user, 'clients', 'admin'),
    (target_user, 'renewals', 'admin'),
    (target_user, 'pipeline', 'admin'),
    (target_user, 'deal_registrations', 'admin'),
    (target_user, 'commissions', 'admin'),
    (target_user, 'onboarding', 'admin'),
    (target_user, 'certifications', 'admin'),
    (target_user, 'knowledge_base', 'admin'),
    (target_user, 'training', 'admin'),
    (target_user, 'announcements', 'admin'),
    (target_user, 'community', 'admin'),
    (target_user, 'settings', 'admin');
END $$;
