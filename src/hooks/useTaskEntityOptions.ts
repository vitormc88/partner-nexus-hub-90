import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TaskRelatedType } from "@/hooks/useTasks";

export type EntityOption = {
  id: string;
  label: string;
  sublabel?: string | null;
};

/**
 * Searchable lookups for the "Related Record" field on tasks.
 * Returns the top matches for the given related_type, filtered by `search`.
 */
export function useTaskEntityOptions(
  relatedType: TaskRelatedType | null,
  search: string,
) {
  const q = (search || "").trim();
  return useQuery({
    queryKey: ["task-entity-options", relatedType, q],
    enabled: !!relatedType && relatedType !== "general",
    staleTime: 30_000,
    queryFn: async (): Promise<EntityOption[]> => {
      if (!relatedType || relatedType === "general") return [];
      const like = `%${q}%`;

      if (relatedType === "client") {
        let req = supabase
          .from("clients")
          .select("id, commercial_name, short_name, client_code")
          .order("commercial_name", { ascending: true })
          .limit(20);
        if (q) req = req.or(`commercial_name.ilike.${like},short_name.ilike.${like},client_code.ilike.${like}`);
        const { data, error } = await req;
        if (error) throw error;
        return (data || []).map((r: any) => ({
          id: r.id,
          label: r.commercial_name || r.short_name || r.client_code || "Untitled client",
          sublabel: r.client_code || null,
        }));
      }

      if (relatedType === "deal") {
        let req = supabase
          .from("deals")
          .select("id, company_name, stage, expected_value")
          .order("last_activity_at", { ascending: false, nullsFirst: false })
          .limit(20);
        if (q) req = req.ilike("company_name", like);
        const { data, error } = await req;
        if (error) throw error;
        return (data || []).map((r: any) => ({
          id: r.id,
          label: r.company_name || "Opportunity",
          sublabel: [r.stage, r.expected_value ? `€${Number(r.expected_value).toLocaleString()}` : null]
            .filter(Boolean)
            .join(" · "),
        }));
      }

      if (relatedType === "lead") {
        let req = supabase
          .from("incoming_leads")
          .select("id, company_name, contact_name, status")
          .order("created_at", { ascending: false })
          .limit(20);
        if (q) req = req.or(`company_name.ilike.${like},contact_name.ilike.${like}`);
        const { data, error } = await req;
        if (error) throw error;
        return (data || []).map((r: any) => ({
          id: r.id,
          label: r.company_name || r.contact_name || "Lead",
          sublabel: [r.contact_name, r.status].filter(Boolean).join(" · "),
        }));
      }

      if (relatedType === "partner") {
        let req = supabase
          .from("partners")
          .select("id, company_name, country")
          .order("company_name", { ascending: true })
          .limit(20);
        if (q) req = req.ilike("company_name", like);
        const { data, error } = await req;
        if (error) throw error;
        return (data || []).map((r: any) => ({
          id: r.id,
          label: r.company_name || "Partner",
          sublabel: r.country || null,
        }));
      }

      if (relatedType === "renewal") {
        let req = supabase
          .from("renewals")
          .select("id, renewal_date, estimated_value, clients:client_id ( commercial_name )")
          .order("renewal_date", { ascending: true, nullsFirst: false })
          .limit(20);
        const { data, error } = await req;
        if (error) throw error;
        let rows = (data || []) as any[];
        if (q) {
          const lc = q.toLowerCase();
          rows = rows.filter((r) => (r.clients?.commercial_name || "").toLowerCase().includes(lc));
        }
        return rows.map((r) => ({
          id: r.id,
          label: r.clients?.commercial_name
            ? `${r.clients.commercial_name} · ${r.renewal_date ?? "no date"}`
            : `Renewal · ${r.renewal_date ?? "no date"}`,
          sublabel: r.estimated_value ? `€${Number(r.estimated_value).toLocaleString()} est.` : null,
        }));
      }

      return [];
    },
  });
}

/**
 * Resolve a single entity's label by id (for displaying an already-selected value).
 */
export function useTaskEntityLabel(
  relatedType: TaskRelatedType | null,
  id: string | null,
) {
  return useQuery({
    queryKey: ["task-entity-label", relatedType, id],
    enabled: !!relatedType && !!id && relatedType !== "general",
    staleTime: 60_000,
    queryFn: async (): Promise<EntityOption | null> => {
      if (!relatedType || !id) return null;
      const table =
        relatedType === "client" ? "clients" :
        relatedType === "deal" ? "deals" :
        relatedType === "lead" ? "incoming_leads" :
        relatedType === "partner" ? "partners" :
        relatedType === "renewal" ? "renewals" : null;
      if (!table) return null;
      const cols =
        relatedType === "client" ? "id, commercial_name, short_name" :
        relatedType === "renewal" ? "id, renewal_date, clients:client_id ( commercial_name )" :
        "id, company_name";
      const { data } = await supabase.from(table as any).select(cols).eq("id", id).maybeSingle();
      if (!data) return null;
      const d: any = data;
      const label =
        relatedType === "client" ? (d.commercial_name || d.short_name || "Client") :
        relatedType === "renewal" ? `${d.clients?.commercial_name || "Renewal"} · ${d.renewal_date ?? ""}` :
        (d.company_name || "Record");
      return { id: d.id, label };
    },
  });
}
