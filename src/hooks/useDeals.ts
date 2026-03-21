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
      let query = supabase.from("renewals").select("*").order("renewal_date");
      if (filters?.status) query = query.eq("status", filters.status);
      const { data, error } = await query;
      if (error) throw error;
      return data;
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
