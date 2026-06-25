// Deterministic Next Best Actions engine for the Partner Health module.
// Decoupled from the Health Engine: this layer only decides *what to do next*
// given the same facts the Health Card already reads. No AI, no scoring impact.

import type { HealthDimension, PartnerMaturity } from "./partner-health-config";

export type ActionPriority = "high" | "medium" | "low";

export interface NextBestAction {
  id: string;
  title: string;            // imperative — "Schedule a relationship review"
  why: string;              // one short sentence
  improves: HealthDimension;
  priority: ActionPriority;
}

export interface NextActionsInput {
  maturity?: PartnerMaturity;
  partner: {
    onboarding_status?: string | null;
    next_meeting_date?: string | null;
    last_meeting_date?: string | null;
    account_owner_id?: string | null;
  };
  clients: Array<any>;
  deals: Array<{ status?: string | null; created_at?: string | null; last_activity_at?: string | null; updated_at?: string | null }>;
  notes: Array<{ created_at?: string | null }>;
  leadsOpen?: number;
  renewalsUpcoming?: number;
}

const DAY = 86_400_000;
const PRIORITY_RANK: Record<ActionPriority, number> = { high: 3, medium: 2, low: 1 };

const daysSince = (iso?: string | null) =>
  iso ? Math.floor((Date.now() - new Date(iso).getTime()) / DAY) : null;
const daysUntil = (iso?: string | null) =>
  iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / DAY) : null;

export function buildNextBestActions(input: NextActionsInput, max = 3): NextBestAction[] {
  const { partner, clients, deals, notes } = input;
  const maturity = input.maturity ?? "active";

  const openDeals = deals.filter((d) => d.status === "Open");
  const lastNoteDays = daysSince(
    notes.length ? notes.map((n) => n.created_at).filter(Boolean).sort().slice(-1)[0] : null,
  );
  const lastMeetingDays = daysSince(partner.last_meeting_date);
  const nextMeetingDays = daysUntil(partner.next_meeting_date);
  const meetingOverdueDays =
    partner.next_meeting_date && nextMeetingDays !== null && nextMeetingDays < 0
      ? Math.abs(nextMeetingDays)
      : null;
  const contactCandidates = [lastNoteDays, lastMeetingDays].filter(
    (v): v is number => v !== null,
  );
  const daysSinceContact = contactCandidates.length ? Math.min(...contactCandidates) : null;

  const onboardingStatus = (partner.onboarding_status || "").toLowerCase();
  const onboardingDone = onboardingStatus === "completed";

  const latestDealActivity = deals
    .map((d) => d.last_activity_at || d.updated_at || d.created_at)
    .filter(Boolean)
    .map((iso) => new Date(iso as string).getTime())
    .sort()
    .pop();
  const daysSinceDealUpdate = latestDealActivity
    ? Math.floor((Date.now() - latestDealActivity) / DAY)
    : null;

  const actions: NextBestAction[] = [];

  // ─── Relationship ────────────────────────────────────────────────
  if (meetingOverdueDays !== null) {
    actions.push({
      id: "schedule-review-overdue",
      title: "Schedule a relationship review",
      why: `The next relationship review is overdue by ${meetingOverdueDays} day${meetingOverdueDays === 1 ? "" : "s"}.`,
      improves: "relationship",
      priority: meetingOverdueDays > 30 ? "high" : "medium",
    });
  } else if (!partner.next_meeting_date && maturity !== "new") {
    actions.push({
      id: "schedule-review-missing",
      title: "Schedule a relationship review",
      why: lastMeetingDays !== null
        ? `Last meeting was held ${lastMeetingDays} day${lastMeetingDays === 1 ? "" : "s"} ago and no follow-up is planned.`
        : "No upcoming meeting is currently planned with this partner.",
      improves: "relationship",
      priority: (lastMeetingDays ?? 999) > 60 ? "high" : "medium",
    });
  }

  if (
    daysSinceContact !== null &&
    daysSinceContact > 60 &&
    (maturity === "active" || maturity === "mature")
  ) {
    actions.push({
      id: "reconnect-partner",
      title: "Reconnect with partner",
      why: `No interaction recorded in the last ${daysSinceContact} days.`,
      improves: "relationship",
      priority: daysSinceContact > 120 ? "high" : "medium",
    });
  }

  if (maturity === "dormant") {
    actions.push({
      id: "reactivate-partner",
      title: "Reactivate dormant partner",
      why: "No commercial activity has been registered for over 6 months.",
      improves: "relationship",
      priority: "high",
    });
  }

  if (!partner.account_owner_id) {
    actions.push({
      id: "assign-account-owner",
      title: "Assign Account Owner",
      why: "This partner currently has no Account Owner assigned.",
      improves: "relationship",
      priority: "medium",
    });
  }

  // ─── Business Momentum ──────────────────────────────────────────
  if (clients.length === 0 && maturity !== "new") {
    actions.push({
      id: "first-customer",
      title: "Start building customer portfolio",
      why: "No customers have been registered for this partner yet.",
      improves: "momentum",
      priority: maturity === "onboarding" ? "medium" : "high",
    });
  }

  if (openDeals.length > 0 && (daysSinceDealUpdate ?? 0) > 30) {
    actions.push({
      id: "review-stale-pipeline",
      title: "Review active opportunities",
      why: `Pipeline exists but no opportunity has been updated in ${daysSinceDealUpdate} days.`,
      improves: "momentum",
      priority: (daysSinceDealUpdate ?? 0) > 60 ? "high" : "medium",
    });
  }

  if (
    openDeals.length === 0 &&
    (input.leadsOpen ?? 0) === 0 &&
    (maturity === "active" || maturity === "mature")
  ) {
    actions.push({
      id: "request-forecast",
      title: "Request an updated sales forecast",
      why: "There are no open opportunities or qualified leads in the pipeline.",
      improves: "momentum",
      priority: "high",
    });
  }

  if ((input.renewalsUpcoming ?? 0) > 0) {
    actions.push({
      id: "renewal-planning",
      title: "Update renewal planning",
      why: `${input.renewalsUpcoming} renewal${input.renewalsUpcoming === 1 ? "" : "s"} approaching in the next few months.`,
      improves: "momentum",
      priority: "high",
    });
  }

  // ─── Operational Engagement ─────────────────────────────────────
  if (!onboardingDone && (maturity === "new" || maturity === "onboarding")) {
    actions.push({
      id: "complete-onboarding",
      title: "Complete partner onboarding",
      why: "This partner is still progressing through the onboarding process.",
      improves: "engagement",
      priority: maturity === "onboarding" ? "medium" : "low",
    });
  }

  // ─── Prioritize & cap ───────────────────────────────────────────
  return actions
    .sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority])
    .slice(0, max);
}
