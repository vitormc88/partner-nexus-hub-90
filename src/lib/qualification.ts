// Centralized qualification logic for Incoming Leads workspace.
// Pure functions; no AI. Logic stays transparent and editable.

export const QUALIFICATION_STAGES = [
  "New",
  "Qualification",
  "Discovery Call",
  "Qualified",
  "Converted",
  "Disqualified",
] as const;
export type QualificationStage = (typeof QUALIFICATION_STAGES)[number];

export const CATEGORY_STATUSES = ["missing", "partial", "complete"] as const;
export type CategoryStatus = (typeof CATEGORY_STATUSES)[number];

export const TIMD_CATEGORIES = [
  {
    key: "interest",
    label: "Interest",
    icon: "Sparkles",
    prompt: "What business problem are they trying to solve?",
    questions: [
      "What triggered this initiative now?",
      "What does success look like in 6–12 months?",
      "How are you handling this today?",
    ],
  },
  {
    key: "timing",
    label: "Timing",
    icon: "Clock",
    prompt: "How urgent is this for them — and why?",
    questions: [
      "Is there a hard deadline driving this?",
      "When would you want to go live?",
      "What happens if nothing changes in 6 months?",
    ],
  },
  {
    key: "budget",
    label: "Money / Budget",
    icon: "Wallet",
    prompt: "What budget conversations have they had internally?",
    questions: [
      "Is there a budget allocated for this initiative?",
      "How are similar investments approved here?",
      "What's the cost of not solving this?",
    ],
  },
  {
    key: "decision",
    label: "Decision Making",
    icon: "Users",
    prompt: "Who decides — and who else is involved?",
    questions: [
      "Who else is involved in this decision?",
      "Who would be the executive sponsor?",
      "What's your typical decision process?",
    ],
  },
] as const;
export type TimdKey = (typeof TIMD_CATEGORIES)[number]["key"];

export const CURRENT_PROCESS_OPTIONS = ["Excel", "Paper", "Existing CMMS", "ERP", "Other", "None"];
export const MAIN_CHALLENGE_OPTIONS = [
  "Downtime",
  "No maintenance history",
  "No visibility",
  "Reactive maintenance",
  "Reporting difficulty",
  "Compliance / Audit",
  "Cost control",
];
export const EXISTING_SYSTEM_OPTIONS = ["None", "Excel", "ERP", "Other CMMS", "Custom in-house"];
export const DATA_VISIBILITY_OPTIONS = ["Low", "Medium", "High"];

export const FIT_FACTORS = [
  { key: "fit_pain_identified", label: "Operational pain identified", positive: true },
  { key: "fit_current_process_identified", label: "Current process identified", positive: true },
  { key: "fit_urgency_identified", label: "Urgency discussed", positive: true },
  { key: "fit_decision_maker_identified", label: "Decision maker identified", positive: true },
  { key: "fit_operational_maturity", label: "Operational maturity", positive: true },
  { key: "fit_system_dissatisfaction", label: "Existing system dissatisfaction", positive: true },
] as const;
export type FitFactorKey = (typeof FIT_FACTORS)[number]["key"];

export function statusValue(s: string | null | undefined): CategoryStatus {
  if (s === "complete" || s === "partial" || s === "missing") return s;
  return "missing";
}

// Auto-suggest status based on note content. User can still override.
export function autoStatusFromNotes(notes: string | null | undefined): CategoryStatus {
  const v = (notes || "").trim();
  if (v.length === 0) return "missing";
  if (v.length < 40) return "partial";
  return "complete";
}

// Resolve final status: prefer stored value if user picked one, else auto.
export function resolvedStatus(stored: string | null | undefined, notes: string | null | undefined): CategoryStatus {
  if (stored === "complete" || stored === "partial" || stored === "missing") return stored;
  return autoStatusFromNotes(notes);
}

export function timdCompletion(lead: Record<string, any>): {
  completed: number;
  partial: number;
  missing: number;
  percent: number;
} {
  let completed = 0,
    partial = 0,
    missing = 0;
  for (const c of TIMD_CATEGORIES) {
    const s = resolvedStatus(lead[`${c.key}_status`], lead[`${c.key}_notes`]);
    if (s === "complete") completed++;
    else if (s === "partial") partial++;
    else missing++;
  }
  const total = TIMD_CATEGORIES.length;
  const percent = Math.round(((completed + partial * 0.5) / total) * 100);
  return { completed, partial, missing, percent };
}

export function fitScore(lead: Record<string, any>): {
  score: number;
  total: number;
  label: "Good Fit" | "Medium Fit" | "Weak Fit";
  tone: "success" | "warning" | "destructive";
} {
  const total = FIT_FACTORS.length;
  const score = FIT_FACTORS.filter((f) => !!lead[f.key]).length;
  let label: "Good Fit" | "Medium Fit" | "Weak Fit" = "Weak Fit";
  let tone: "success" | "warning" | "destructive" = "destructive";
  if (score >= 5) {
    label = "Good Fit";
    tone = "success";
  } else if (score >= 3) {
    label = "Medium Fit";
    tone = "warning";
  }
  return { score, total, label, tone };
}

// Positive signals vs risks — replaces raw checkbox feeling with consultative framing.
export function qualificationSignals(lead: Record<string, any>): {
  positive: { key: string; label: string }[];
  risks: { key: string; label: string }[];
} {
  const positive: { key: string; label: string }[] = [];
  const risks: { key: string; label: string }[] = [];

  for (const f of FIT_FACTORS) {
    if (lead[f.key]) positive.push({ key: f.key, label: f.label });
    else risks.push({ key: f.key, label: `No ${f.label.toLowerCase()}` });
  }
  // Add note-based signals
  if (resolvedStatus(lead.budget_status, lead.budget_notes) === "missing")
    risks.push({ key: "budget_unclear", label: "Budget still unclear" });
  if (resolvedStatus(lead.decision_status, lead.decision_notes) === "missing")
    risks.push({ key: "no_decision", label: "Decision maker not confirmed" });
  if (resolvedStatus(lead.timing_status, lead.timing_notes) === "complete")
    positive.push({ key: "timing_clear", label: "Clear timing / urgency" });

  return { positive, risks };
}

export function missingInformation(lead: Record<string, any>): string[] {
  const missing: string[] = [];
  if (resolvedStatus(lead.interest_status, lead.interest_notes) === "missing") missing.push("Lead interest level");
  if (resolvedStatus(lead.timing_status, lead.timing_notes) === "missing") missing.push("Timeline / urgency");
  if (resolvedStatus(lead.budget_status, lead.budget_notes) === "missing") missing.push("Budget range");
  if (resolvedStatus(lead.decision_status, lead.decision_notes) === "missing") missing.push("Decision maker");
  if (!lead.current_process) missing.push("Current maintenance process");
  if (!lead.main_challenge) missing.push("Main challenge");
  if (!lead.existing_system) missing.push("Existing system");
  return missing;
}

export function nextBestActions(lead: Record<string, any>): string[] {
  const actions: string[] = [];
  if (resolvedStatus(lead.interest_status, lead.interest_notes) === "missing")
    actions.push("Schedule a discovery call to qualify intent");
  if (!lead.current_process) actions.push("Validate the current maintenance process");
  if (resolvedStatus(lead.decision_status, lead.decision_notes) !== "complete")
    actions.push("Confirm the decision maker and sponsor");
  if (resolvedStatus(lead.timing_status, lead.timing_notes) === "missing")
    actions.push("Understand project urgency and timeline");
  if (resolvedStatus(lead.budget_status, lead.budget_notes) === "missing")
    actions.push("Explore budget expectations");
  if (actions.length === 0) actions.push("Lead looks ready — consider converting to opportunity");
  return actions.slice(0, 3);
}

// Top single next best action with reasoning.
export function topNextAction(lead: Record<string, any>): { title: string; reason: string } {
  const a = nextBestActions(lead)[0];
  let reason = "Based on what's captured so far.";
  if (!lead.current_process) reason = "We don't know yet how they currently manage maintenance.";
  else if (resolvedStatus(lead.decision_status, lead.decision_notes) !== "complete")
    reason = "Decision maker not yet confirmed — risk of stalling later.";
  else if (resolvedStatus(lead.timing_status, lead.timing_notes) === "missing")
    reason = "Without urgency, the deal will lack momentum.";
  return { title: a, reason };
}

// Concise discovery summary built strictly from captured fields. Not AI.
export function lastMeaningfulDiscovery(lead: Record<string, any>): string[] {
  const bits: string[] = [];
  if (lead.current_process) bits.push(`Currently using ${lead.current_process}.`);
  if (lead.main_challenge) bits.push(`Main challenge: ${String(lead.main_challenge).toLowerCase()}.`);
  if (lead.existing_system && lead.existing_system !== lead.current_process)
    bits.push(`Existing system: ${lead.existing_system}.`);
  if (lead.data_visibility) bits.push(`Data visibility reported as ${String(lead.data_visibility).toLowerCase()}.`);
  if (lead.asset_range) bits.push(`Asset range: ${lead.asset_range}.`);
  if (lead.maintenance_team_size) bits.push(`Maintenance team: ${lead.maintenance_team_size}.`);
  const interest = (lead.interest_notes || "").trim();
  if (interest) bits.push(interest.length > 140 ? `${interest.slice(0, 140)}…` : interest);
  return bits.slice(0, 4);
}

export function suggestedQuestions(lead: Record<string, any>): string[] {
  return [
    "How are you managing maintenance today?",
    "What are the main operational challenges you face?",
    "Is there an existing CMMS or ERP in place?",
    "What triggered this initiative now?",
    "Who else is involved in the decision?",
    "What does success look like in 6–12 months?",
  ];
}

// Rich rule-based contextual guidance: pains + prompts + positioning.
export function contextualGuidance(lead: Record<string, any>): {
  title: string;
  pains?: string[];
  prompts?: string[];
  positioning?: string[];
} | null {
  switch (lead.current_process) {
    case "Excel":
    case "Paper":
      return {
        title: `Working with ${lead.current_process}`,
        pains: [
          "No reliable maintenance history",
          "Difficult reporting and KPIs",
          "Reactive — not preventive — maintenance",
          "Limited spare parts control",
          "High risk of data loss",
        ],
        prompts: [
          "How do you track preventive maintenance today?",
          "How do you analyze recurring failures?",
          "Is information centralized across teams?",
        ],
        positioning: [
          "Preventive maintenance workflows",
          "Dashboards & KPI visibility",
          "Work order traceability",
          "Mobility for technicians",
        ],
      };
    case "Existing CMMS":
    case "Other CMMS":
      return {
        title: "Replacing an existing CMMS",
        pains: ["Low adoption", "Outdated UX", "Reports not usable by management", "Limited mobility"],
        prompts: [
          "What's missing or frustrating today?",
          "Is adoption strong across the team?",
          "What would justify a migration?",
        ],
        positioning: ["Modern UX", "Mobile-first technicians", "Faster onboarding", "Actionable analytics"],
      };
    case "ERP":
      return {
        title: "Maintenance inside an ERP",
        pains: [
          "ERPs rarely cover field maintenance well",
          "Limited mobile experience",
          "Hard to capture preventive plans",
          "Poor asset hierarchy / criticality",
        ],
        prompts: [
          "How are technicians capturing work in the field?",
          "Do you have a preventive maintenance plan?",
          "How is asset criticality managed?",
        ],
        positioning: ["Specialized CMMS layer", "Integrates with ERP", "Stronger preventive workflows"],
      };
    case "None":
      return {
        title: "Greenfield opportunity",
        pains: ["No baseline data", "Unclear scope risk", "Change management critical"],
        prompts: [
          "What's the expected scope and asset base?",
          "Is there a sponsor and budget owner?",
          "Could we start with a pilot area?",
        ],
        positioning: ["Quick-win pilot", "Phased rollout", "Best-practice templates"],
      };
    default:
      return null;
  }
}
