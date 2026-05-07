Before proceeding, please ensure that the Mark as Won flow is idempotent:

- if the same deal is already Won and already linked to a client, do not create another client, license, or renewal

- if a license modal is reopened, do not duplicate draft licenses or renewals

- only create a renewal when a valid license is saved

- skipping license should create the client but not create a renewal  
  
Goal

Connect the full Lead → Deal → Client → License → Renewal lifecycle in PartnerOS, so winning a deal automatically materializes operational records and the Renewals/Clients/Dashboard modules reflect reality.

## Scope summary

1. **Won Deal → Client**: Auto-create (or link) a client when a deal is moved to `Won`.
2. **License creation modal**: Guided flow launched after Won, with Save & Create Renewal / Save Draft / Skip.
3. **Auto Renewal**: Computed from license model + billing frequency.
4. **Renewals module**: Wire to real `licenses` + new `renewals` data with proper aging + RLS.
5. **Clients & Licenses list**: Show denormalized lifecycle columns.
6. **Client Detail page**: 6 tabs (Overview, Licenses, Renewals, Contacts, Activity Timeline, Documents).
7. **Dashboard**: Source from real entities consistently (Won deals = revenue; clients/renewals from tables).
8. **Quick "Mark as Won"** action on Deal Detail with confirmation + license modal.
9. **System activity logging** for all lifecycle events.
10. **Non-destructive migrations** only.

## Technical plan

### Database (additive migration)

New table `renewals`:

```text
renewals
- id uuid pk
- client_id uuid (fk clients)
- license_id uuid (fk licenses, nullable)
- partner_id text (denormalized from client for RLS perf)
- renewal_type text  -- 'License' | 'SaaS' | 'Support' | 'Maintenance'
- renewal_date date
- estimated_value numeric
- currency text default 'EUR'
- status text  -- 'Active' | 'Due Soon' | 'Overdue' | 'Won' | 'Lost'
- billing_frequency text  -- 'Annual' | 'Monthly' | 'One-time'
- notes text
- created_at, updated_at
```

RLS policies mirror `clients` (HQ full; partner users scoped via `can_view_partner` / `get_user_partner_id`).

Add columns:

- `clients.source_deal_id uuid nullable` — provenance link.
- `licenses.billing_frequency text nullable`, `licenses.contract_value numeric nullable`, `licenses.notes text nullable`, `licenses.is_draft boolean default false`.
- `deals.client_id uuid nullable` — link won deal to created/matched client.

No data wipe; all columns nullable / defaulted.

### Helpers

- `src/lib/lifecycle.ts`:
  - `findOrCreateClientFromDeal(deal)` — duplicate check on `lower(company_name) + partner_id`.
  - `createLicenseAndRenewal(payload)` — inserts license, computes renewal date, inserts renewal, logs activities.
  - `computeRenewalDate(startDate, model, frequency)`.
  - `computeRenewalStatus(renewalDate)` for aging buckets.

### UI

- `src/components/deals/MarkAsWonButton.tsx` — confirmation dialog, triggers client creation + opens license modal.
- `src/components/deals/CreateLicenseDialog.tsx` — fields per spec; 3 buttons.
- `src/pages/DealDetail.tsx` — add "Mark as Won" quick action; if stage changes to Won via edit, also fire flow.
- `src/pages/ClientDetail.tsx` — already exists; expand to 6 tabs: Overview / Licenses / Renewals / Contacts / Activity Timeline / Documents. Add "Missing license configuration" warning badge.
- `src/pages/ClientsLicenses.tsx` — extend columns: license type, model, renewal date, contract value.
- `src/pages/Renewals.tsx` — replace mock with `useRenewals` (new hook reading new table).
- `src/pages/Dashboard.tsx` — keep Won-deals-as-revenue rule (per Core memory), point renewal cards at new `renewals` table.

### Hooks

- `src/hooks/useRenewals.ts` (new, replaces the old deal-derived stub used in Dashboard).
- `src/hooks/useClientLifecycle.ts` — wraps the lifecycle helpers as mutations with toasts + cache invalidation.
- Extend `useClients`/`useClientLicenses` to expose new fields.

### Activity logging

Reuse `logSystemActivity(dealId, ...)` and add a sibling `logClientActivity(clientId, ...)` that writes to `client_notes` with `note_type = 'system'` (existing table — non-destructive). All lifecycle events log on both deal and client where applicable.

### Notifications

On renewal creation, insert a `notifications` row scoped to partner (uses existing RLS).

### Non-goals (this pass)

- No destructive backfill of existing Won deals (a one-shot "Generate missing clients" admin action can come later).
- Documents tab on Client Detail surfaces the existing `documents` table filtered by partner; no new uploads UI in this pass.
- Won via pipeline drag-drop is not added; only the quick action + edit flow.

## Out-of-scope confirmations

- Total Revenue stays sourced from Won deals (per existing Core rule "Total Revenue & Pipeline Value come strictly from deals").
- Active Clients count switches to real `clients` table (already the case).

## Testing checklist

- Move a deal to Won → client created, license modal opens.
- Save & Create Renewal → renewal appears in Renewals page + Dashboard "Due Soon" buckets.
- Skip license → client shows "Missing license configuration" badge.
- Re-winning a deal whose company already exists for that partner → toast "Existing client found — linked to current deal.", no duplicate.
- Partner user sees only own client/renewals; HQ sees all.
- Activity Timeline on Deal and Client both show the lifecycle entries.

Approve to proceed.