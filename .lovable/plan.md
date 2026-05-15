# Analytics Stabilization Sprint

A foundation pass on Analytics. No new dashboards. Goal: every metric is real, consistent, and computed in one place.  
  
Use `status` as source of truth for won/lost instead of depending on both status + stage.

- Define a single authoritative revenue field for analytics.
- Use `won_at/lost_at/closed_at` instead of `updated_at` for monthly revenue aggregation.
- Ensure weighted pipeline uses effective probability (after health adjustments).
- Add timestamps now (`won_at`, `lost_at`, `status_changed_at`) to future-proof analytics.

## 1. Centralized analytics layer (Supabase views)

Create read-only SQL views as the single source of truth. Frontend hooks call these views — no parallel client-side aggregation.

**New views (RLS-safe via underlying tables):**

- `v_analytics_pipeline_stage` — counts + total/expected value grouped by stage. Excludes `Won` / `Lost`. Stage label normalized via `pipeline-stages` canonical list.
- `v_analytics_outcomes` — Won / Lost counts and total revenue, partner_id, month bucket. Used for conversion + revenue.
- `v_analytics_sales_performance` — joined to `profiles` via `assigned_user_id` (canonical user). Falls back to `assigned_salesperson` only when no user link, marked as `unassigned_text`. Aggregates: open/won/lost counts, won_revenue, weighted_pipeline.
- `v_analytics_partner_summary` — per-partner: revenue (sum of won deals), pipeline (sum of open deals expected_value), client_count (active), open_renewals_count, won_renewals_value.
- `v_analytics_renewals_summary` — total, won, lost, upcoming, overdue, success_rate (`won/(won+lost)`), won_value.
- `v_analytics_revenue_by_country` — won deals revenue grouped by partner.country.
- `v_analytics_revenue_monthly` — won deals revenue grouped by `date_trunc('month', updated_at)` for last 12 months.

All views use `isActivePipelineStage` logic in SQL (stage NOT IN ('Won','Lost') AND stage IN known canonical stages).

## 2. Business rules (locked)


| Metric            | Definition                                                 |
| ----------------- | ---------------------------------------------------------- |
| Pipeline          | `status='Open' AND stage NOT IN ('Won','Lost')`            |
| Pipeline value    | sum(`expected_value`) over Pipeline                        |
| Weighted pipeline | sum(`expected_value * probability/100`) over Pipeline      |
| Won deals         | `status='Won' AND stage='Won'`                             |
| Lost deals        | `status='Lost' AND stage='Lost'`                           |
| Revenue           | sum(`total_value` or `expected_value`) over Won deals only |
| Conversion rate   | `won / (won + lost)` — excludes open                       |


## 3. Sales attribution normalization

- Add migration to backfill `deals.assigned_user_id` (uuid → profiles) where a profile email/full_name matches `assigned_salesperson`. Best-effort fuzzy match (lower/trim, accent strip via `unaccent` if available).
- Sales analytics query joins on `assigned_user_id` first; uses `profiles.full_name` as canonical name.
- Free-text `assigned_salesperson` becomes a fallback only.

## 4. Frontend changes

- Delete mock imports from `src/data/mock-data.ts` usage in analytics paths.
- `src/components/dashboard/RevenueChart.tsx`: replace `revenueByMonth` mock with new hook `useRevenueMonthly()` reading `v_analytics_revenue_monthly`. Empty state instead of fake bars.
- `src/pages/Analytics.tsx`: rewrite to consume new hooks (`useAnalyticsOverview`, `usePipelineStageBreakdown`, `useSalesPerformance`, `usePartnerAnalytics`, `useRenewalsAnalytics`).
  - Pipeline tab: stage chart filters out Won/Lost. Outcome KPIs (Won/Lost/Conversion) shown as a separate card row.
  - Sales tab: table keyed on user_id, shows canonical full_name.
  - Renewals tab: success_rate from view.
  - Empty states everywhere ("No analytics data available yet").
  - "Last updated X ago" indicator using `dataUpdatedAt` from React Query.
- Hooks live in new file `src/hooks/useAnalytics.ts`.

## 5. Out of scope (next sprint)

Win/Loss intelligence, competitor analysis, funnel leakage, loss-reason dashboards. This sprint only stabilizes existing metrics.

## Technical notes

- Views are SECURITY INVOKER (default) so existing RLS on `deals` / `partners` / `clients` / `renewals` automatically applies.
- No CHECK constraints; canonical stage list enforced in app + view filter.
- Migration is additive — no destructive changes to existing tables.
- `mock-data.ts` kept for now but unused by analytics; can be removed in cleanup pass.

## Files

**New**

- `supabase/migrations/<ts>_analytics_views.sql`
- `src/hooks/useAnalytics.ts`

**Edited**

- `src/pages/Analytics.tsx` (rewrite)
- `src/components/dashboard/RevenueChart.tsx`

**Optional cleanup**

- Remove `revenueByMonth`, `revenueByCountry` exports from `src/data/mock-data.ts` once unused.

Approve and I'll execute the migration first, then wire up the frontend.