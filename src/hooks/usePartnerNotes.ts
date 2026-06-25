import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type PartnerNoteType = "Meeting" | "Internal Note" | "Follow-up";

export type InteractionType =
  | "Meeting"
  | "Phone Call"
  | "Email"
  | "Business Review"
  | "Quarterly Review"
  | "Training"
  | "Partner Visit"
  | "Event"
  | "Internal Discussion"
  | "Other";

export const INTERACTION_TYPES: InteractionType[] = [
  "Meeting",
  "Phone Call",
  "Email",
  "Business Review",
  "Quarterly Review",
  "Training",
  "Partner Visit",
  "Event",
  "Internal Discussion",
  "Other",
];

export type Participant =
  | { kind: "user"; id: string; name: string }
  | { kind: "external"; name: string };

export type ActionStatus = "Open" | "Completed";

export interface ActionItem {
  id: string;
  description: string;
  owner: string | null;
  due_date: string | null;
  status: ActionStatus;
}

export interface PartnerNote {
  id: string;
  partner_id: string;
  content: string;
  author_id: string | null;
  author_name: string | null;
  created_at: string;
  note_type: PartnerNoteType;
  next_actions: string | null;
  // Structured v2 fields
  interaction_type: InteractionType;
  interaction_date: string;
  participants: Participant[];
  topics: string[];
  decisions: string[];
  action_items: ActionItem[];
  risks: string[];
  extra: Record<string, unknown>;
}

function normalize(row: any): PartnerNote {
  return {
    ...row,
    interaction_type: row.interaction_type || row.note_type || "Meeting",
    interaction_date: row.interaction_date || row.created_at,
    participants: Array.isArray(row.participants) ? row.participants : [],
    topics: Array.isArray(row.topics) ? row.topics : [],
    decisions: Array.isArray(row.decisions) ? row.decisions : [],
    action_items: Array.isArray(row.action_items) ? row.action_items : [],
    risks: Array.isArray(row.risks) ? row.risks : [],
    extra: row.extra && typeof row.extra === "object" ? row.extra : {},
  };
}

export function usePartnerNotes(partnerId: string | undefined) {
  return useQuery({
    queryKey: ["partner-notes", partnerId],
    queryFn: async () => {
      if (!partnerId) return [];
      const { data, error } = await supabase
        .from("partner_notes" as any)
        .select("*")
        .eq("partner_id", partnerId)
        .order("interaction_date", { ascending: false });
      if (error) throw error;
      return (data || []).map(normalize);
    },
    enabled: !!partnerId,
  });
}

export interface CreatePartnerNoteInput {
  partner_id: string;
  content: string;
  interaction_type?: InteractionType;
  interaction_date?: string; // ISO
  participants?: Participant[];
  topics?: string[];
  decisions?: string[];
  action_items?: ActionItem[];
  risks?: string[];
  // legacy
  note_type?: PartnerNoteType;
  next_actions?: string | null;
}

export function useAddPartnerNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePartnerNoteInput) => {
      const { data: { user } } = await supabase.auth.getUser();
      let authorName: string | null = null;
      if (user?.id) {
        const { data: prof } = await supabase.from("profiles").select("full_name,email").eq("id", user.id).maybeSingle();
        authorName = (prof as any)?.full_name || (prof as any)?.email || user.email || null;
      }
      const noteType: PartnerNoteType =
        input.note_type ||
        (input.interaction_type === "Meeting" || input.interaction_type === "Business Review" || input.interaction_type === "Quarterly Review"
          ? "Meeting"
          : input.interaction_type === "Internal Discussion"
            ? "Internal Note"
            : "Follow-up");

      const payload: any = {
        partner_id: input.partner_id,
        content: input.content,
        author_id: user?.id ?? null,
        author_name: authorName,
        note_type: noteType,
        next_actions: input.next_actions ?? null,
        interaction_type: input.interaction_type || "Meeting",
        interaction_date: input.interaction_date || new Date().toISOString(),
        participants: input.participants ?? [],
        topics: input.topics ?? [],
        decisions: input.decisions ?? [],
        action_items: input.action_items ?? [],
        risks: input.risks ?? [],
      };
      const { data, error } = await supabase
        .from("partner_notes" as any)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["partner-notes", vars.partner_id] });
    },
  });
}

export function useUpdatePartnerNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, partner_id, patch }: { id: string; partner_id: string; patch: Partial<PartnerNote> }) => {
      const { error } = await supabase.from("partner_notes" as any).update(patch as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["partner-notes", vars.partner_id] });
    },
  });
}

export function useDeletePartnerNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string; partner_id: string }) => {
      const { error } = await supabase.from("partner_notes" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["partner-notes", vars.partner_id] });
    },
  });
}
