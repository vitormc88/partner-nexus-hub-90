import { supabase } from "@/integrations/supabase/client";

// ── Structured commercial activity types ─────────────────────────────────
export type ActivityType =
  | "note"
  | "call"
  | "meeting"
  | "email"
  | "whatsapp"
  | "demo"
  | "proposal_sent"
  | "proposal_discussion"
  | "pricing_discussion"
  | "technical_discussion"
  | "internal_note"
  | "decision"
  | "follow_up"
  | "other"
  | "system";

export const ACTIVITY_TYPE_OPTIONS: { value: ActivityType; label: string }[] = [
  { value: "call", label: "Call" },
  { value: "meeting", label: "Meeting" },
  { value: "email", label: "Email" },
  { value: "demo", label: "Demo" },
  { value: "whatsapp", label: "WhatsApp / Chat" },
  { value: "proposal_discussion", label: "Proposal Discussion" },
  { value: "pricing_discussion", label: "Pricing Discussion" },
  { value: "technical_discussion", label: "Technical Discussion" },
  { value: "internal_note", label: "Internal Note" },
  { value: "decision", label: "Decision / Outcome" },
  { value: "note", label: "Note" },
  { value: "other", label: "Other" },
  { value: "system", label: "System Activity" },
];

export const ACTIVITY_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  ACTIVITY_TYPE_OPTIONS.map((o) => [o.value, o.label])
);

// ── Relationship-memory tags (insight chips) ──────────────────────────────
export const ACTIVITY_TAGS = [
  "Objection",
  "Budget Concern",
  "Technical Blocker",
  "Competitor Mentioned",
  "Waiting Customer",
  "Positive Signal",
  "Urgent",
  "Expansion Opportunity",
] as const;
export type ActivityTag = (typeof ACTIVITY_TAGS)[number];

export const TAG_STYLE: Record<string, string> = {
  "Objection":             "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300",
  "Budget Concern":        "bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950 dark:text-orange-300",
  "Technical Blocker":     "bg-red-50 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300",
  "Competitor Mentioned":  "bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300",
  "Waiting Customer":      "bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
  "Positive Signal":       "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300",
  "Urgent":                "bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-300",
  "Expansion Opportunity": "bg-indigo-50 text-indigo-800 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300",
};

// ── Activity classification helpers ───────────────────────────────────────
export const HUMAN_ACTIVITY_TYPES = new Set<string>([
  "call",
  "meeting",
  "email",
  "whatsapp",
  "demo",
  "proposal_discussion",
  "pricing_discussion",
  "technical_discussion",
  "decision",
  "internal_note",
  "note",
  "follow_up",
  "other",
]);

export function isSystemActivity(t: string | null | undefined): boolean {
  return t === "system";
}
export function isHumanActivity(t: string | null | undefined): boolean {
  return !!t && HUMAN_ACTIVITY_TYPES.has(t);
}
/** Human commercial interactions that count as meaningful customer touch. */
export function isMeaningfulCustomerInteraction(t: string | null | undefined): boolean {
  if (!t) return false;
  return ["call", "meeting", "email", "whatsapp", "demo", "proposal_discussion", "pricing_discussion", "technical_discussion", "decision"].includes(t);
}

interface LogActivityArgs {
  dealId: string;
  activityType: ActivityType | string;
  subject: string;
  description?: string | null;
  performedBy?: string | null;
  tags?: string[] | null;
  activityDate?: string | Date | null;
  participants?: string[] | null;
  linkedProposalId?: string | null;
  linkedTaskId?: string | null;
}

/**
 * Best-effort activity logger. Failures are swallowed so that auto-logging
 * never breaks the underlying user flow.
 *
 * Anti-noise: silently de-duplicates identical system entries logged within
 * the last 30 seconds (e.g. proposal save fires twice, stage save races).
 */
export async function logDealActivity({
  dealId,
  activityType,
  subject,
  description = null,
  performedBy = null,
  tags = null,
  activityDate = null,
  participants = null,
  linkedProposalId = null,
  linkedTaskId = null,
}: LogActivityArgs) {
  try {
    if (activityType === "system") {
      const since = new Date(Date.now() - 30_000).toISOString();
      const { data: dup } = await supabase
        .from("deal_activities")
        .select("id")
        .eq("deal_id", dealId)
        .eq("activity_type", "system")
        .eq("subject", subject)
        .gte("created_at", since)
        .limit(1);
      if (dup && dup.length > 0) return;
    }
    await supabase.from("deal_activities").insert({
      deal_id: dealId,
      activity_type: activityType,
      subject,
      description: description || null,
      performed_by: performedBy || "System",
      tags: tags && tags.length ? tags : null,
      activity_date: activityDate
        ? (activityDate instanceof Date ? activityDate.toISOString() : activityDate)
        : null,
      participants: participants && participants.length ? participants : null,
      linked_proposal_id: linkedProposalId,
      linked_task_id: linkedTaskId,
    } as any);
  } catch {
    // swallow
  }
}

export function logSystemActivity(
  dealId: string,
  subject: string,
  description?: string
) {
  return logDealActivity({
    dealId,
    activityType: "system",
    subject,
    description,
    performedBy: "System",
  });
}
