This plan looks good conceptually.

Do not execute anything yet.

Please convert this into a safe step-by-step execution checklist for me as a non-technical user.

Start only with Phase 1:

- confirm PROD is empty

- identify PROD project ref, URL, anon key

- confirm migrations are ready

- explain exactly whether I should use Supabase CLI or Lovable Cloud for applying schema

Do not switch the app to PROD yet.

Do not copy DEV data.

Do not change frontend env vars yet.

Do not create real users yet.  
  
PartnerOS PROD Bootstrap Plan

Goal: bring the empty PROD Supabase project to the same shape as DEV using migrations + minimal admin seeding only. No DEV data, no hardcoded user IDs, no relaxed RLS, no public buckets (except `avatars` which is intentionally public).

---

## 0. Pre-flight (do not skip)

- Confirm PROD is empty: in Supabase Studio (PROD) → Table Editor and Storage → both should be empty.
- Note PROD values you will need: `PROD_PROJECT_REF`, `PROD_SUPABASE_URL` (`https://<ref>.supabase.co`), `PROD_ANON_KEY`, `PROD_SERVICE_ROLE_KEY`.
- Decide the production app URL (current published URL is `https://partneros-manwinwin.lovable.app`; keep or set a custom domain now so auth redirect URLs only have to be set once).
- Take a snapshot of DEV (Supabase Studio → Database → Backups → create on-demand backup) as insurance.

---

## 1. Apply schema from migrations (no data)

Repository has **68 migrations** under `supabase/migrations/`. They are idempotent against an empty database and include every table, RLS policy, function, trigger, view, and security hardening up to today's date.

Two safe options — pick one:

**Option A — Supabase CLI (recommended)**

```
supabase link --project-ref <PROD_PROJECT_REF>
supabase db push
```

This applies every file in `supabase/migrations/` in timestamp order against PROD.

**Option B — Lovable Cloud switch**
If you intend to swap the project's Lovable Cloud backend to PROD, do it from Connectors → Lovable Cloud; Lovable will replay the migration history into the new project automatically. (Manual SQL paste is not recommended — 68 files, ordering matters.)

After it finishes, verify in PROD Studio:

- 55+ tables in `public` (clients, deals, leads, proposals, documents, document_categories, profiles, partners, partner_tiers, user_roles, user_module_permissions, role_permission_templates, pricing_rules, notifications, audit_logs, …).
- All RLS helper functions present (`has_role`, `is_hq_user`, `get_user_partner_id`, `can_view_partner/client/deal`, `can_manage_*`, `get_effective_permissions`, `prevent_profile_self_escalation`, the email-queue helpers, etc.).
- All triggers: `handle_new_user` on `auth.users`, `prevent_last_hq_admin_*`, `prevent_profile_self_escalation`, `deals_track_status_change`, `enforce_deal_assignment`, `enforce_renewal_assignment`, `notify_lead_assignment`, `set_partner_code`, `set_updated_at`.
- Analytics views all show `security_invoker=on`.
- `extensions` schema has `pgmq` and `unaccent` installed (the email queue + name resolver depend on them — the CLI installs them; if Studio shows them missing, enable via Database → Extensions).

---

## 2. Catalog seed data that ships with migrations (auto-applied, expected in PROD)

These come from the migration files themselves and are safe production reference data — leave them in:

- `public.document_categories` — Knowledge Base default categories incl. the "Uncategorized" fallback row.
- `public.pricing_rules` — initial pricing catalog (`20260421…` + `20260428…`).
- `public.role_permission_templates` — RBAC per-role module defaults.
- `public.modules` / `public.partner_tiers` (if seeded by their creation migrations).

Verify counts after step 1; they should be non-zero.

---

## 3. Migrations that need attention (must not seed a DEV identity)

- `supabase/migrations/20260323180321_…sql` seeds the HQ admin for user `9e0a5eb0-5052-492b-97ff-a333b7242d43`. It is **already wrapped in an `EXISTS (SELECT 1 FROM auth.users …)` guard**, so on PROD it logs a `RAISE NOTICE` and exits without inserting. No action required, but confirm in the migration run logs that the notice appears for PROD — it is the signal that the dev id was not planted.
- No other migration inserts auth-bound rows. Profiles/user_roles for new users will be created at signup time by `handle_new_user` + the admin-create-user edge function.

---

## 4. Storage buckets (create explicitly — buckets are not in migrations)

Create these in PROD Studio → Storage (or via `supabase--storage_create_bucket`). Privacy settings must match DEV exactly:


| Bucket          | Public | Purpose                                |
| --------------- | ------ | -------------------------------------- |
| documents       | NO     | Knowledge Base files (signed URLs)     |
| proposals       | NO     | Generated proposal docx/pdf            |
| training-assets | NO     | HQ-only training material              |
| avatars         | YES    | Profile pictures, intentionally public |


The storage RLS policies on `storage.objects` are already part of migration `20260605160046_…sql` (and earlier), so they apply automatically once the buckets exist. Verify after creation:

- `auth_read_documents` (SELECT) joins to `public.documents`.
- `proposals_storage_*` scope by `(storage.foldername(name))[1]::uuid` via `can_view_deal` / `can_manage_deal`.
- `hq_upload_training` requires `has_role(auth.uid(),'hq_admin')`.
- `auth_upload_avatars` / `auth_update_avatars` / `auth_delete_avatars` require `(storage.foldername(name))[1] = auth.uid()::text`.
- `public_read_avatars` SELECT is open (this is the only intentionally public read).

---

## 5. Auth configuration (PROD Studio → Authentication)

- **Email provider**: enable Email + Password. Leave "Confirm email" ON (do not auto-confirm).
- **Leaked password protection (HIBP)**: ON (matches DEV).
- **Anonymous sign-ins**: OFF.
- **Site URL**: set to the production app URL (e.g. `https://partneros-manwinwin.lovable.app` or your custom domain).
- **Additional Redirect URLs**: add every host the app can be served from:
  - `https://partneros-manwinwin.lovable.app/*`
  - `https://partneros-manwinwin.lovable.app/reset-password`
  - your custom domain `https://<custom>/*` and `/reset-password` if applicable
  - DEV/preview hosts must **not** be added here.
- **Custom SMTP**: only if you want PROD emails to come from your domain (otherwise Supabase default for low volume).
- **Auth Email Hook**: if DEV uses the `auth-email-hook` edge function (it does — `verify_jwt = false` in `supabase/config.toml`), in PROD Studio → Authentication → Hooks point the "Send Email" hook to the PROD URL of that function. Without this, transactional auth emails will fall back to default templates.

---

## 6. Edge functions

Deploy all four from `supabase/functions/` to PROD:

- `admin-create-user` (used by HQ Admin invite/create flow)
- `auth-email-hook` (custom email rendering)
- `ingest-lead` (external lead webhook)
- `process-email-queue` (cron drain for outbound emails)

`supabase/config.toml` already pins `auth-email-hook` to `verify_jwt = false` and `process-email-queue` to `verify_jwt = true` — these are applied automatically on deploy.

---

## 7. Edge-function secrets to configure in PROD

In PROD Studio → Project Settings → Edge Functions → Secrets (Lovable auto-injects the `SUPABASE_*` ones, so only the following are user-managed):

- `WEBHOOK_SECRET` — choose a NEW random value for PROD (do not reuse DEV's). Update SharpSpring / external lead source with this value.
- `LOVABLE_API_KEY` — the Lovable AI Gateway key for PROD (used by `auth-email-hook` and `process-email-queue`). Rotate from Lovable, do not copy DEV's.
- `LOVABLE_SEND_URL` — only if DEV uses a custom value (otherwise omit and the default is used).

Auto-provided, do **not** set manually:

- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_PUBLISHABLE_KEY(S)`, `SUPABASE_SECRET_KEYS`, `SUPABASE_JWKS`, `SUPABASE_DB_URL`.

---

## 8. App environment variables (frontend)

`.env` is managed by Lovable Cloud — when you switch the app to PROD it will be regenerated. After the switch, confirm:

- `VITE_SUPABASE_URL` → PROD URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` → PROD anon key
- `VITE_SUPABASE_PROJECT_ID` → PROD ref

`src/lib/app-url.ts` hardcodes `PUBLISHED_APP_URL = "https://partneros-manwinwin.lovable.app"`. If PROD uses a different custom domain, update this constant — it controls all auth redirect URLs the client requests.

`src/integrations/supabase/client.ts` and `src/integrations/supabase/types.ts` regenerate automatically — do not edit by hand.

---

## 9. First HQ Admin (the only manual identity step)

There must be exactly one bootstrap path; do not insert into `user_roles` by UUID.

1. In PROD Studio → Authentication → Users, click **Invite user** and enter the real production admin email. They will receive an invite and set their own password.
2. The `handle_new_user` trigger creates their `public.profiles` row automatically.
3. Once they appear in `public.profiles`, run this **one-time** SQL in the PROD SQL editor (resolves by email, never by hardcoded UUID):

```sql
WITH u AS (
  SELECT id FROM public.profiles WHERE lower(email) = lower('admin@yourcompany.com')
)
UPDATE public.profiles
SET is_hq = true, is_active = true, invitation_status = 'active'
WHERE id = (SELECT id FROM u);

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'hq_admin'::app_role FROM u
ON CONFLICT (user_id, role) DO NOTHING;
```

4. Optionally grant explicit module overrides — not required; the `hq_admin` role template already grants `admin` on every module via `get_effective_permissions`.
5. From that point on, all subsequent HQ users and partner users are created from inside the app (User Management → Invite / Create), which routes through the `admin-create-user` edge function — no manual SQL.

---

## 10. Data that must NOT be copied from DEV

Do not `pg_dump` data from DEV into PROD. The following tables are user/tenant data and must start empty in PROD:
`profiles`, `user_roles`, `user_module_permissions`, `partners`, `clients`, `deals`, `leads`, `incoming_leads`, `proposals`, `proposal_items`, `documents`, `notifications`, `audit_logs`, `commissions`, `renewals`, `lead_tasks`, `deal_tasks`, `partner_notes`, `lead_contact_attempts`, `announcements`, `community_*`, `_backup_*`.

Catalog tables (Section 2) may be copied/seeded, but the migrations already do this — copying again risks UUID collisions and duplicate-key errors. Prefer letting migrations handle it.

---

## 11. Post-bootstrap verification (run in PROD before going live)

1. Sign in as the bootstrap HQ Admin → land on `/dashboard` with no RLS errors.
2. Create a test Partner + a test Partner Admin user via the in-app User Management flow → confirm invite email arrives, recovery link points to the PROD `/reset-password` URL.
3. As that Partner Admin, confirm:
  - they only see their own partner's clients/deals/leads (RLS isolation),
  - they cannot reach `/user-management` or other HQ-only routes,
  - they cannot reassign their own `partner_id` (RLS + trigger),
  - they can preview a Knowledge Base document the HQ user uploaded (storage signed URL works),
  - they can upload an avatar but only under their own `<uid>/` path.
4. From HQ, upload a KB file and a training asset; confirm Partner Admin can read KB but not training-assets.
5. Re-run the Security panel in Lovable → expect the same posture as DEV: 0 errors, the same accepted warnings/ignored findings as the security memory describes.
6. Trigger `process-email-queue` once manually and check `notifications` → email delivery; trigger `ingest-lead` with the new `WEBHOOK_SECRET` to confirm webhook path.
7. Delete the test partner/user data before going live.

---

## 12. Cutover

- Update SharpSpring (or any external system) webhook URL + secret to PROD.
- If using a custom domain, point DNS at the PROD-published app.
- Keep DEV running unchanged for staging; never let the PROD app point at DEV creds.

---

## Manual steps that cannot be automated safely

- Creating the storage buckets (Section 4) — buckets cannot live in migrations.
- Setting Site URL + Additional Redirect URLs + enabling Email auth + linking the Auth Email Hook (Section 5).
- Providing `WEBHOOK_SECRET` and `LOVABLE_API_KEY` for PROD (Section 7).
- Inviting the first HQ Admin and running the one-time email-scoped promote SQL (Section 9).
- DNS / custom domain pointing and updating `PUBLISHED_APP_URL` in code if it changes (Section 8).
- External system reconfiguration to use the new webhook secret and URL (Section 12).