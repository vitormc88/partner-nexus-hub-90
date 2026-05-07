// Centralized configuration for Pipeline Health rules.
// Future Settings → Pipeline Health Rules will read/write this layer.
// Keep ALL magic numbers here — never scatter thresholds across components.

import type { DealHealth } from "@/lib/deal-health";

export interface PipelineHealthConfig {
  // Inactivity thresholds (days since last activity)
  hot_activity_window: number;          // < this = qualifies as "recent activity" for Hot
  attention_inactivity_days: number;    // > this = Attention
  stalled_inactivity_days: number;      // > this = Stalled

  // Follow-up + proposal aging
  no_followup_days: number;             // proposal sent > N days ago without follow-up
  proposal_recent_window: number;       // < N days = "recent proposal" (Hot signal)

  // Stage aging defaults (per-stage overrides live in STAGE_AGING)
  default_stage_warn_days: number;
  default_stage_risk_days: number;

  // Hot deal scoring — Hot triggers when score >= hot_score_threshold
  hot_score_threshold: number;
  hot_signal_weights: {
    recentActivity: number;     // activity within hot_activity_window
    futureFollowUp: number;     // has scheduled follow-up
    recentProposal: number;     // proposal within recent window
    highProbability: number;    // base probability >= high_probability_floor
    recentlyEnteredStage: number;
  };
  high_probability_floor: number;       // probability >= this counts as a Hot signal

  // Health-based effective probability adjustment (additive percentage points).
  health_probability_adjustments: Record<DealHealth, number>;
}

// Default configuration — single source of truth.
export const PIPELINE_HEALTH_CONFIG: PipelineHealthConfig = {
  hot_activity_window: 3,
  attention_inactivity_days: 10,
  stalled_inactivity_days: 21,

  no_followup_days: 14,
  proposal_recent_window: 7,

  default_stage_warn_days: 14,
  default_stage_risk_days: 30,

  hot_score_threshold: 2,
  hot_signal_weights: {
    recentActivity: 1,
    futureFollowUp: 1,
    recentProposal: 1,
    highProbability: 1,
    recentlyEnteredStage: 1,
  },
  high_probability_floor: 70,

  health_probability_adjustments: {
    Hot: +5,
    Healthy: 0,
    Attention: -5,
    Stalled: -15,
    AtRisk: -25,
  },
};

/** Apply health adjustment to a base probability. Clamped to [0, 100]. */
export function applyHealthAdjustment(baseProbability: number, health: DealHealth): {
  base: number;
  adjustment: number;
  effective: number;
} {
  const base = Math.max(0, Math.min(100, baseProbability || 0));
  const adjustment = PIPELINE_HEALTH_CONFIG.health_probability_adjustments[health] ?? 0;
  const effective = Math.max(0, Math.min(100, base + adjustment));
  return { base, adjustment, effective };
}

// ── Suggested next-best action ─────────────────────────────────────────
export interface SuggestedAction {
  label: string;
  hint?: string;
}

export interface SuggestActionInputs {
  health: DealHealth;
  stage: string;
  hasOverdueTask: boolean;
  hasFutureFollowUp: boolean;
  daysSinceActivity: number | null;
  daysSinceProposal: number | null;
  hasOwner: boolean;
}

export function suggestNextAction(i: SuggestActionInputs): SuggestedAction | null {
  if (!i.hasOwner) return { label: "Assign an owner", hint: "Deal has no salesperson" };
  if (i.hasOverdueTask) return { label: "Resolve overdue tasks" };

  if (i.health === "Healthy" || i.health === "Hot") {
    if (!i.hasFutureFollowUp) return { label: "Schedule next follow-up" };
    return null;
  }

  // Attention / Stalled / AtRisk → stage-aware suggestions
  switch (i.stage) {
    case "Open Lead":
    case "Qualified":
      return { label: "Schedule discovery call", hint: "Move toward Demo" };
    case "Demo":
      return { label: "Book technical demo follow-up" };
    case "Proposal Sent":
      return i.daysSinceProposal && i.daysSinceProposal > 7
        ? { label: "Send proposal reminder", hint: `Sent ${i.daysSinceProposal}d ago` }
        : { label: "Schedule follow-up call" };
    case "Advance 1":
    case "Advance 2":
      return { label: "Confirm next milestone" };
    case "Meeting 2":
      return { label: "Clarify open objections" };
    case "Price Negotiation":
      return { label: "Address pricing objections", hint: "Or escalate to manager" };
    default:
      if (!i.hasFutureFollowUp) return { label: "Schedule next follow-up" };
      return { label: "Re-engage the prospect" };
  }
}
