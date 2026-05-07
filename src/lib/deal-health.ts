// Deal Health computation logic — central, reusable.
// Used by Pipeline cards, deal detail, and manager intelligence counters.

export type DealHealth = "Hot" | "Healthy" | "Attention" | "Stalled" | "AtRisk";

export interface DealHealthInputs {
  stage: string;
  status?: string | null;
  stageEnteredAt: Date | null;
  createdAt: Date;
  lastActivityAt: Date | null;       // max(deal_activities.created_at, stage_entered_at)
  nextFollowUpAt: Date | null;       // earliest non-done task due_date in the future
  hasOverdueTask: boolean;           // any task with due_date < today and not done
  latestProposalAt: Date | null;     // latest proposal created_at
  hasOwner: boolean;                 // assigned_salesperson present
}

export interface DealHealthResult {
  health: DealHealth;
  reasons: string[];
  warnings: string[];                // short labels for the card (e.g. "Proposal aging")
  daysSinceActivity: number | null;
  daysInStage: number;
  daysSinceProposal: number | null;
}

const DAY = 86400000;

// ── Stage aging thresholds (centralized) ────────────────────────────────
export const STAGE_AGING: Record<string, { warn: number; risk: number }> = {
  "Open Lead":         { warn: 14, risk: 30 },
  "Qualified":         { warn: 14, risk: 30 },
  "Demo":              { warn: 10, risk: 21 },
  "Proposal Sent":     { warn: 7,  risk: 14 },
  "Advance 1":         { warn: 14, risk: 28 },
  "Meeting 2":         { warn: 14, risk: 28 },
  "Advance 2":         { warn: 14, risk: 28 },
  "Price Negotiation": { warn: 10, risk: 21 },
};

export const PROPOSAL_AGING_WARN_DAYS = 14;
export const INACTIVITY_ATTENTION_DAYS = 10;
export const INACTIVITY_STALLED_DAYS = 21;

function daysBetween(from: Date | null, to: Date = new Date()): number | null {
  if (!from) return null;
  return Math.floor((to.getTime() - from.getTime()) / DAY);
}

export function computeDealHealth(input: DealHealthInputs): DealHealthResult {
  const now = new Date();
  const daysSinceActivity = daysBetween(input.lastActivityAt, now);
  const daysInStage = daysBetween(input.stageEnteredAt ?? input.createdAt, now) ?? 0;
  const daysSinceProposal = daysBetween(input.latestProposalAt, now);
  const hasFutureFollowUp =
    !!input.nextFollowUpAt && input.nextFollowUpAt.getTime() >= now.getTime();

  const reasons: string[] = [];
  const warnings: string[] = [];

  // ── At Risk signals ─────────────────────────────────────────────────
  const stageThr = STAGE_AGING[input.stage];
  const stageStuck = stageThr ? daysInStage >= stageThr.risk : false;
  if (input.hasOverdueTask) { reasons.push("Has overdue tasks"); warnings.push("Overdue tasks"); }
  if (!input.hasOwner) { reasons.push("Missing owner"); warnings.push("No owner"); }
  if (stageStuck) { reasons.push(`Stuck in ${input.stage} (${daysInStage}d)`); warnings.push(`${daysInStage}d in stage`); }

  // ── Stalled signals ─────────────────────────────────────────────────
  const veryInactive = (daysSinceActivity ?? Infinity) > INACTIVITY_STALLED_DAYS;
  const proposalAging =
    daysSinceProposal !== null &&
    daysSinceProposal > PROPOSAL_AGING_WARN_DAYS &&
    (daysSinceActivity ?? Infinity) > 7;
  if (veryInactive) reasons.push(`No activity for ${daysSinceActivity}d`);
  if (proposalAging) { reasons.push(`Proposal sent ${daysSinceProposal}d ago, no follow-up`); warnings.push(`Proposal ${daysSinceProposal}d old`); }

  // ── Attention signals ───────────────────────────────────────────────
  const attentionInactive = (daysSinceActivity ?? Infinity) > INACTIVITY_ATTENTION_DAYS;
  const noFollowUpRequired =
    !hasFutureFollowUp &&
    ["Proposal Sent", "Advance 1", "Meeting 2", "Advance 2", "Price Negotiation"].includes(input.stage);
  if (attentionInactive && !veryInactive) reasons.push(`No activity for ${daysSinceActivity}d`);
  if (noFollowUpRequired) { reasons.push("No follow-up scheduled"); warnings.push("No follow-up"); }
  const stageWarn = stageThr ? daysInStage >= stageThr.warn && daysInStage < stageThr.risk : false;
  if (stageWarn) warnings.push(`${daysInStage}d in stage`);

  // ── Hot signals ─────────────────────────────────────────────────────
  const recentActivity = (daysSinceActivity ?? Infinity) < 3;
  const recentProposal = (daysSinceProposal ?? Infinity) < 7;
  const recentlyEnteredStage = daysInStage < 5;

  // ── Decide health (priority: AtRisk > Stalled > Attention > Hot > Healthy) ──
  let health: DealHealth = "Healthy";
  if (input.hasOverdueTask || !input.hasOwner || stageStuck) health = "AtRisk";
  else if (veryInactive || proposalAging) health = "Stalled";
  else if (attentionInactive || noFollowUpRequired || stageWarn) health = "Attention";
  else if (recentActivity && hasFutureFollowUp && (recentProposal || recentlyEnteredStage)) health = "Hot";

  return { health, reasons, warnings, daysSinceActivity, daysInStage, daysSinceProposal };
}

// ── UI helpers ──────────────────────────────────────────────────────────
export const HEALTH_META: Record<DealHealth, { label: string; dot: string; chip: string; ring: string }> = {
  Hot:       { label: "Hot",       dot: "bg-rose-500",    chip: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900",         ring: "ring-rose-300/40" },
  Healthy:   { label: "Healthy",   dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900", ring: "ring-emerald-300/40" },
  Attention: { label: "Attention", dot: "bg-amber-500",   chip: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",   ring: "ring-amber-300/40" },
  Stalled:   { label: "Stalled",   dot: "bg-orange-500",  chip: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-900", ring: "ring-orange-300/40" },
  AtRisk:    { label: "At Risk",   dot: "bg-red-500",     chip: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",               ring: "ring-red-300/40" },
};
