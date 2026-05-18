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
  { key: "interest", label: "Interest", icon: "Sparkles" },
  { key: "timing", label: "Timing", icon: "Clock" },
  { key: "budget", label: "Money / Budget", icon: "Wallet" },
  { key: "decision", label: "Decision Making", icon: "Users" },
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
  { key: "fit_pain_identified", label: "Pain identified" },
  { key: "fit_current_process_identified", label: "Current process identified" },
  { key: "fit_urgency_identified", label: "Urgency identified" },
  { key: "fit_decision_maker_identified", label: "Decision maker identified" },
  { key: "fit_operational_maturity", label: "Operational maturity" },
  { key: "fit_system_dissatisfaction", label: "Existing system dissatisfaction" },
] as const;
export type FitFactorKey = (typeof FIT_FACTORS)[number]["key"];

export function statusValue(s: string | null | undefined): CategoryStatus {
  if (s === "complete" || s === "partial" || s === "missing") return s;
  return "missing";
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
    const s = statusValue(lead[`${c.key}_status`]);
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

export function missingInformation(lead: Record<string, any>): string[] {
  const missing: string[] = [];
  if (statusValue(lead.interest_status) === "missing") missing.push("Lead interest level");
  if (statusValue(lead.timing_status) === "missing") missing.push("Timeline / urgency");
  if (statusValue(lead.budget_status) === "missing") missing.push("Budget range");
  if (statusValue(lead.decision_status) === "missing") missing.push("Decision maker");
  if (!lead.current_process) missing.push("Current maintenance process");
  if (!lead.main_challenge) missing.push("Main challenge");
  if (!lead.existing_system) missing.push("Existing system");
  return missing;
}

export function nextBestActions(lead: Record<string, any>): string[] {
  const actions: string[] = [];
  if (statusValue(lead.interest_status) === "missing") actions.push("Schedule a discovery call");
  if (!lead.current_process) actions.push("Validate current maintenance process");
  if (statusValue(lead.decision_status) !== "complete") actions.push("Confirm decision maker");
  if (statusValue(lead.timing_status) === "missing") actions.push("Understand project urgency");
  if (statusValue(lead.budget_status) === "missing") actions.push("Explore budget expectations");
  if (actions.length === 0) actions.push("Lead looks ready — consider converting to opportunity");
  return actions.slice(0, 4);
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

// Operational guidance based on current process choice (transparent rules, no AI).
export function contextualGuidance(lead: Record<string, any>): { title: string; items: string[] } | null {
  switch (lead.current_process) {
    case "Excel":
    case "Paper":
      return {
        title: "Common pains with Excel / Paper",
        items: [
          "No reliable maintenance history",
          "Difficult reporting and KPIs",
          "Lack of visibility across teams",
          "Reactive — not preventive — maintenance",
          "High risk of data loss",
        ],
      };
    case "Existing CMMS":
    case "Other CMMS":
      return {
        title: "Probing an existing CMMS",
        items: [
          "What is missing or frustrating today?",
          "Is adoption strong across the team?",
          "Are reports usable by management?",
          "What would justify a migration?",
        ],
      };
    case "ERP":
      return {
        title: "Maintenance inside an ERP",
        items: [
          "ERPs rarely cover field maintenance well",
          "Limited mobile experience for technicians",
          "Hard to capture preventive plans",
          "Poor asset hierarchy / criticality",
        ],
      };
    case "None":
      return {
        title: "Greenfield opportunity",
        items: [
          "Clarify expected scope and assets",
          "Identify quick-win pilot area",
          "Validate sponsor and budget owner",
        ],
      };
    default:
      return null;
  }
}
