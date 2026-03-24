import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Deal = Tables<"deals">;

export function useDeals(filters?: { stage?: string; partner_id?: string }) {
  return useQuery({
    queryKey: ["deals", filters],
    queryFn: async () => {
      let query = supabase.from("deals").select("*").order("created_at", { ascending: false });
      if (filters?.stage) query = query.eq("stage", filters.stage);
      if (filters?.partner_id) query = query.eq("partner_id", filters.partner_id);
      const { data, error } = await query;
      if (error) throw error;
      return data as Deal[];
    },
  });
}

export function useDeal(id: string | undefined) {
  return useQuery({
    queryKey: ["deal", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from("deals").select("*").eq("id", id).single();
      if (error) throw error;
      return data as Deal;
    },
    enabled: !!id,
  });
}

export function useRenewals(filters?: { status?: string }) {
  return useQuery({
    queryKey: ["renewals", filters],
    queryFn: async () => {
      // Fetch existing renewal records
      let query = supabase.from("renewals").select("*").order("renewal_date");
      if (filters?.status) query = query.eq("status", filters.status);
      const { data: existing, error } = await query;
      if (error) throw error;

      if (existing && existing.length > 0) {
        return existing;
      }

      // Fallback: derive renewal candidates from contracts and licenses
      const now = new Date().toISOString().split("T")[0];
      const derived: any[] = [];

      const { data: contracts } = await supabase
        .from("contracts")
        .select("id, client_id, contract_end_date, total_value");

      for (const c of contracts || []) {
        if (!c.contract_end_date) continue;
        const days = Math.ceil((new Date(c.contract_end_date).getTime() - Date.now()) / 86400000);
        let status = "Upcoming";
        if (days < 0) status = "Expired";
        else if (days <= 30) status = "Due Soon";
        else if (days <= 60) status = "Upcoming";

        // Look up partner_id from client
        const { data: client } = await supabase
          .from("clients")
          .select("partner_id")
          .eq("id", c.client_id)
          .single();

        derived.push({
          id: `derived-contract-${c.id}`,
          client_id: c.client_id,
          partner_id: client?.partner_id || null,
          renewal_type: "Contract",
          renewal_date: c.contract_end_date,
          estimated_value: c.total_value,
          status,
          priority: days < 0 ? "Critical" : days <= 30 ? "High" : "Medium",
          assigned_owner: null,
          notes: null,
        });
      }

      const { data: licenses } = await supabase
        .from("licenses")
        .select("id, client_id, license_end_date, sat_end_date, sat_active");

      for (const l of licenses || []) {
        if (l.license_end_date) {
          const days = Math.ceil((new Date(l.license_end_date).getTime() - Date.now()) / 86400000);
          let status = "Upcoming";
          if (days < 0) status = "Expired";
          else if (days <= 30) status = "Due Soon";

          const { data: client } = await supabase
            .from("clients")
            .select("partner_id")
            .eq("id", l.client_id)
            .single();

          derived.push({
            id: `derived-license-${l.id}`,
            client_id: l.client_id,
            partner_id: client?.partner_id || null,
            renewal_type: "License",
            renewal_date: l.license_end_date,
            estimated_value: null,
            status,
            priority: days < 0 ? "Critical" : days <= 30 ? "High" : "Medium",
            assigned_owner: null,
            notes: null,
          });
        }

        if (l.sat_end_date && l.sat_active) {
          const days = Math.ceil((new Date(l.sat_end_date).getTime() - Date.now()) / 86400000);
          let status = "Upcoming";
          if (days < 0) status = "Expired";
          else if (days <= 30) status = "Due Soon";

          const { data: client } = await supabase
            .from("clients")
            .select("partner_id")
            .eq("id", l.client_id)
            .single();

          derived.push({
            id: `derived-sat-${l.id}`,
            client_id: l.client_id,
            partner_id: client?.partner_id || null,
            renewal_type: "SAT",
            renewal_date: l.sat_end_date,
            estimated_value: null,
            status,
            priority: days < 0 ? "Critical" : days <= 30 ? "High" : "Medium",
            assigned_owner: null,
            notes: null,
          });
        }
      }

      derived.sort((a, b) => (a.renewal_date || "").localeCompare(b.renewal_date || ""));
      return derived;
    },
  });
}

export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}
