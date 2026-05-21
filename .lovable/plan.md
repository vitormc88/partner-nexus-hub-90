# Incoming Leads → Qualification Workspace (Prompt 1)

Scope-locked to the **Incoming Leads** module. The Pipeline module is untouched. No proposals / negotiation / closing concepts leak into this surface.

---

Before implementation, a few important operational adjustments and principles:

- Incoming Leads is strictly a qualification / inbound triage workspace.  
It must remain clearly separated from the Opportunity Pipeline.  
No proposal, negotiation or closing logic should leak into this module.
- Replace “Discovery Call” task template with:
  - Initial Qualification Call
  - Intro Qualification Call  
  or equivalent qualification-oriented wording.
- Cadence guidance should remain assistive only.  
No automated outreach or automatic task creation at this stage.
- Engagement status logic should be less aggressive for B2B/enterprise environments.

Suggested progression:

- 1+ attempts → Attempted
- reached/replied → Engaged
- 3+ failed attempts → Silent
- 5+ failed attempts + meaningful inactivity → Ghosted / Unreachable

We should avoid classifying enterprise leads too early.

- Do not use notifications as source-of-truth for business timeline/history.  
Notifications are delivery artifacts only.  
Timeline/history should derive from lead activity records, timestamps and operational events.
- Qualification readiness should not rely on arbitrary percentage logic alone.  
Avoid fake “AI scoring”.  
Use lightweight operational readiness instead:
  - contact established
  - fit minimally validated
  - meaningful engagement exists

Then display recommended missing items separately.

- Distinguish clearly between:
  - no outbound activity
  - no inbound response

These are operationally different situations.

The overall objective is:  
make Incoming Leads feel like a real qualification workspace with operational guidance — not a generic CRM/task manager and not yet a pipeline/deal-management system.

&nbsp;

## 1. Database changes (single migration)

Extend `incoming_leads` with qualification-cadence + engagement fields, and add a contact-attempts log. All new columns are nullable / defaulted so existing rows keep working.

```text
incoming_leads (add):
  engagement_status   text         default 'New'        -- New | Attempted | Engaged | Responsive | Discovery Scheduled | Ghosted | Unreachable | Nurture
  nurture_reason      text                              -- free text when moved to Nurture
  nurture_until       date                              -- optional follow-up date
  last_contact_at     timestamptz
  last_outcome        text                              -- 'no_answer' | 'left_voicemail' | 'reached' | 'email_sent' | ...
  assigned_user_id    uuid                              -- who owns qualification (HQ or partner user)
  assigned_at         timestamptz

lead_contact_attempts (new):
  id, lead_id (fk), channel (call|email|linkedin|meeting|other),
  outcome (no_answer|left_voicemail|reached|bounced|replied|scheduled|unreachable|other),
  notes, performed_by uuid, performed_at timestamptz default now()

LEAD_STATUSES enum (text-level) gains: 'Nurture'
incoming_leads.disqualified_reason already exists — keep it, plus a CHECK-free
allowed-list enforced in UI.
```

Triggers / functions:

- `notify_lead_assignment()` — `AFTER INSERT OR UPDATE OF assigned_user_id` on `incoming_leads`. When `assigned_user_id` changes and is non-null, insert a row into `notifications` (target_user_id = new assignee, category `lead_assigned`, action_url `/incoming-leads/{id}`) and stamp `assigned_at = now()`.
- RLS on `lead_contact_attempts`: HQ full access; partner users access rows whose parent lead is `linked_partner_id = get_user_partner_id(auth.uid())`.

## 2. Notifications (#1)

- Trigger above writes a row into the existing `notifications` table — the existing `NotificationBell` picks it up automatically (unread badge + deep link).
- Manual create / reassign in UI relies on the same DB trigger, so no client-side duplication.
- Email channel: leave architecture-ready by routing through the existing `enqueue_email` pgmq path — gated behind a boolean we default to `false` (no emails sent yet, but wiring exists).

## 3. UI changes — `src/pages/LeadDetail.tsx` (single file, presentational)

Sections, in order, replacing the current hero block:

1. **Lead Contact Bar** (#2) — compact strip directly under the title: Contact · Company · `mailto:` email · `tel:` phone · Country · Owner · Created · Source. Quick actions: Call, Email, Copy Email, Copy Phone (uses `navigator.clipboard`, sonner toast on copy).
2. **Engagement & SLA strip** (#8, #9, #14) — chips: engagement status, attempts count (calls / emails), last activity, "No response for Nd", aging badge (`<24h healthy`, `48h warning`, `≥72h critical`).
3. **Dynamic Next Best Action** (#10) — replaces the static card. Pure derivation from: open tasks, attempts, outcomes, qualification fields. Rules table lives in `src/lib/qualification.ts` as `nextBestAction(lead, attempts, tasks)`.
4. **Cadence Coach** (#4) — small card driven by attempt count + last outcome. Suggestions only, never auto-executes. Rendered from `cadenceGuidance(attempts)` in `qualification.ts`.
5. **Qualification Readiness** (#11) — checklist (Pain, Decision maker, Discovery, Fit, Next step) derived from existing `fit_*` fields + `interest_status` / `decision_status` / `timing_status`. Shows % and explicit missing items.
6. **Tabs with live counters** (#13) — `Tasks (n)`, `Notes (n)`, `Activity (n)` using react-query counts.
7. **Activity Timeline tab** (#12) — chronological merge of: assignment events (from `notifications` rows or `assigned_at`), `lead_contact_attempts`, `lead_tasks` (created/completed), status changes (derived from updated_at + audit-style events). Read-only.

## 4. New components / hooks

- `src/hooks/useLeadContactAttempts.ts` — list + create attempt. On create: optimistic update, also updates `incoming_leads.last_contact_at` + `last_outcome` + `engagement_status` (rule: first attempt → `Attempted`; reached → `Engaged`; 3+ no_answer → `Ghosted`; 5+ → `Unreachable`).
- `src/components/leads/LogContactAttemptDialog.tsx` — channel + outcome + notes.
- `src/components/leads/DisqualifyLeadDialog.tsx` (#6) — mandatory reason `<Select>` from fixed list (No response, No budget, No project/timing, Not a fit, Existing CMMS locked, Student/research only, Duplicate lead, Invalid contact, Too small, Competitor selected, No urgency), optional notes. Writes `status = 'Rejected'`, `disqualified_reason`, appends note.
- `src/components/leads/MoveToNurtureDialog.tsx` (#7) — reason + optional `nurture_until`. Writes `status = 'Nurture'`, `engagement_status = 'Nurture'`.
- `src/components/leads/AddLeadTaskDialog.tsx` (#5) — add a "Template" select at top with qualification-only presets (Qualification Call, Retry Contact, Discovery Call, Follow-up Email, Qualification Review, Contact Validation, Decision Maker Confirmation). Selecting a template prefills title, priority, due-date offset (+1/+2/+3 days), defaults assignee to lead owner. Pure presentational — no new endpoints.
- Extend `src/lib/qualification.ts` with: `cadenceGuidance`, `nextBestAction`, `qualificationReadiness`, `engagementHealthFromAttempts`, `slaBucket`, `taskTemplates`.

## 5. Convert to Opportunity UX (#15)

In `ConvertToOpportunityDialog` trigger (already on the page): when readiness < threshold, the button stays enabled but opens a **blocking checklist dialog** listing missing items ("Pain not identified", "Decision maker missing", …). No more silent grey-out. Threshold derived from `qualificationReadiness().pct >= 60`.

## 6. Strict separation

- No new fields/labels referencing proposal, negotiation, quote, demo-booking pipeline stage, or close-date.
- All copy and suggestions framed as discovery / contact / qualification.

---

## Out of scope (explicit)

- Email sending implementation (only wiring left dormant).
- Pipeline / Deals / Proposals files — untouched.
- Reporting dashboards on disqualification reasons (data is now captured for later).
- Any automation that acts without the user clicking.

## Files touched

- new: `supabase/migrations/<ts>_incoming_leads_qualification.sql`
- new: `src/hooks/useLeadContactAttempts.ts`
- new: `src/components/leads/LogContactAttemptDialog.tsx`
- new: `src/components/leads/DisqualifyLeadDialog.tsx`
- new: `src/components/leads/MoveToNurtureDialog.tsx`
- edit: `src/components/leads/AddLeadTaskDialog.tsx` (template presets)
- edit: `src/lib/qualification.ts` (cadence / NBA / readiness / SLA / templates)
- edit: `src/hooks/useIncomingLeads.ts` (add `Nurture` to status list; expose new fields via existing select `*`)
- edit: `src/pages/LeadDetail.tsx` (contact bar, engagement strip, dynamic NBA, cadence coach, readiness, tabs with counts, timeline tab, convert-checklist gate)
- auto: `src/integrations/supabase/types.ts` regenerates after migration