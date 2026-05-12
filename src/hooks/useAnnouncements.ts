import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Announcement = {
  id: string;
  title: string;
  summary: string | null;
  body: string | null;
  category: string | null;
  status: "draft" | "published" | "archived";
  pinned: boolean;
  target_audience: "all" | "partner" | "country" | "partnership_level";
  partner_id: string | null;
  target_country: string | null;
  target_partnership_level: string | null;
  is_active: boolean | null;
  audience_scope: string | null;
  created_by: string | null;
  published_by: string | null;
  published_at: string | null;
  archived_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export const ANNOUNCEMENT_CATEGORIES = [
  "Product",
  "Commercial",
  "Event",
  "Resource",
  "Operational",
  "Training",
] as const;

export function useAnnouncements(opts?: { limit?: number; publishedOnly?: boolean }) {
  return useQuery({
    queryKey: ["announcements", opts ?? {}],
    queryFn: async () => {
      let q = supabase
        .from("announcements")
        .select("*")
        .order("pinned", { ascending: false })
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (opts?.publishedOnly) q = q.eq("status", "published");
      if (opts?.limit) q = q.limit(opts.limit);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Announcement[];
    },
  });
}

export type AnnouncementInput = {
  title: string;
  summary?: string | null;
  body?: string | null;
  category?: string | null;
  status: "draft" | "published" | "archived";
  pinned: boolean;
  target_audience: "all" | "partner" | "country" | "partnership_level";
  partner_id?: string | null;
  target_country?: string | null;
  target_partnership_level?: string | null;
};

export function useSaveAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: AnnouncementInput }) => {
      const { data: { user } } = await supabase.auth.getUser();
      const now = new Date().toISOString();
      const payload: any = {
        title: input.title,
        summary: input.summary ?? null,
        body: input.body ?? null,
        category: input.category ?? null,
        status: input.status,
        pinned: input.pinned,
        target_audience: input.target_audience,
        partner_id: input.target_audience === "partner" ? input.partner_id ?? null : null,
        target_country: input.target_audience === "country" ? input.target_country ?? null : null,
        target_partnership_level:
          input.target_audience === "partnership_level" ? input.target_partnership_level ?? null : null,
        is_active: input.status === "published",
      };
      if (input.status === "published") {
        payload.published_at = now;
        payload.published_by = user?.id ?? null;
        payload.archived_at = null;
      } else if (input.status === "archived") {
        payload.archived_at = now;
      }
      if (id) {
        const { error } = await supabase.from("announcements").update(payload).eq("id", id);
        if (error) throw error;
        return id;
      }
      payload.created_by = user?.id ?? null;
      const { data, error } = await supabase.from("announcements").insert(payload).select("id").single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });
}
