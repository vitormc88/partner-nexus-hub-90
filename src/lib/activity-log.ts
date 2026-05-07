import { supabase } from "@/integrations/supabase/client";

export type ActivityType =
  | "note"
  | "call"
  | "meeting"
  | "email"
  | "whatsapp"
  | "demo"
  | "proposal_sent"
  | "follow_up"
  | "system";

export const ACTIVITY_TYPE_OPTIONS: { value: ActivityType; label: string }[] = [
  { value: "note", label: "Note" },
  { value: "call", label: "Call" },
  { value: "meeting", label: "Meeting" },
  { value: "email", label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "demo", label: "Demo" },
  { value: "proposal_sent", label: "Proposal Sent" },
  { value: "follow_up", label: "Follow-up" },
  { value: "system", label: "System Activity" },
];

export const ACTIVITY_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  ACTIVITY_TYPE_OPTIONS.map((o) => [o.value, o.label])
);

interface LogActivityArgs {
  dealId: string;
  activityType: ActivityType | string;
  subject: string;
  description?: string | null;
  performedBy?: string | null;
}

/**
 * Best-effort activity logger. Failures are swallowed so that auto-logging
 * never breaks the underlying user flow (task create, proposal save, etc.).
 */
export async function logDealActivity({
  dealId,
  activityType,
  subject,
  description = null,
  performedBy = null,
}: LogActivityArgs) {
  try {
    await supabase.from("deal_activities").insert({
      deal_id: dealId,
      activity_type: activityType,
      subject,
      description: description || null,
      performed_by: performedBy || "System",
    });
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
